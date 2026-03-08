import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { Readable } from 'stream';
import { emailConfigQueries } from '../db/queries/emailConfigs.js';
import { transactionQueries } from '../db/queries/transactions.js';
import { recalcPositions, ensureAsset } from './positions.js';
import { parseEmailText } from './emailParser.js';
import { syncStore } from './syncStore.js';

export interface SyncResult {
  processed: number;
  created: number;
  failed: number;
  errors: string[];
}

export async function syncEmails(userId: string, portfolioId: string): Promise<SyncResult> {
  const config = emailConfigQueries.getByUser(userId);
  if (!config) throw new Error('No email configuration found');

  const result: SyncResult = { processed: 0, created: 0, failed: 0, errors: [] };

  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: true,
    auth: {
      user: config.emailAddress,
      pass: config.encryptedPassword,
    },
    logger: false,
    socketTimeout: 5 * 60_000, // 5 min socket timeout for large mailboxes
  });

  // Prevent unhandled 'error' event from crashing the process
  client.on('error', (err: Error) => {
    console.error('[emailSync] IMAP error:', err.message);
  });

  try {
    console.log('[emailSync] Connecting to IMAP...');
    await client.connect();
    console.log('[emailSync] Connected, locking INBOX...');
    const lock = await client.getMailboxLock('INBOX');
    console.log('[emailSync] INBOX locked, searching unseen...');

    try {
      const unseen = await client.search({ seen: false });
      console.log(`[emailSync] Found ${unseen.length} unseen messages`);
      if (unseen.length === 0) {
        syncStore.update(userId, { status: 'done', total: 0, completedAt: Date.now() });
        return result;
      }

      syncStore.update(userId, { status: 'syncing', total: unseen.length });

      // Process in batches to avoid socket timeouts on large mailboxes
      const BATCH_SIZE = 25;
      for (let i = 0; i < unseen.length; i += BATCH_SIZE) {
        const batch = unseen.slice(i, i + BATCH_SIZE);
        console.log(`[emailSync] Fetching batch ${i / BATCH_SIZE + 1} (messages ${i + 1}-${Math.min(i + BATCH_SIZE, unseen.length)})`);

        for await (const msg of client.fetch(batch, { source: true, uid: true })) {
          result.processed++;
          try {
            const parsed = await simpleParser(msg.source as Readable);
            const text = parsed.text ?? parsed.html?.replace(/<[^>]+>/g, ' ') ?? '';
            const subject = parsed.subject ?? '';
            const from = parsed.from?.text ?? '';

            const transactions = parseEmailText(text);

            let created = 0;
            for (const tx of transactions) {
              const assetId = await ensureAsset(tx.symbol, tx.symbol);
              await transactionQueries.create({
                portfolioId,
                assetId,
                type: tx.type,
                quantity: tx.quantity,
                price: tx.price,
                fees: tx.fees,
                date: tx.date,
                notes: tx.notes,
                source: 'email',
              });
              created++;
            }

            if (created > 0) {
              await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
            }

            emailConfigQueries.logEmail({
              userId,
              emailConfigId: config.id,
              subject,
              fromAddress: from,
              status: created > 0 ? 'processed' : 'skipped',
              transactionsCreated: created,
            });

            result.created += created;
          } catch (err) {
            result.failed++;
            const errMsg = err instanceof Error ? err.message : String(err);
            result.errors.push(errMsg);
            emailConfigQueries.logEmail({
              userId,
              emailConfigId: config.id,
              status: 'failed',
              errorMessage: errMsg,
            });
          }

          syncStore.update(userId, {
            processed: result.processed,
            created: result.created,
            failed: result.failed,
            errors: result.errors,
          });
        }
      }
    } finally {
      console.log('[emailSync] Releasing lock...');
      lock.release();
    }
  } catch (outerErr) {
    console.error('[emailSync] Fatal error:', outerErr instanceof Error ? outerErr.message : outerErr);
    throw outerErr;
  } finally {
    console.log('[emailSync] Logging out...');
    await client.logout();
  }

  // Recalculate positions once after all emails are processed
  if (result.created > 0) {
    console.log(`[emailSync] Recalculating positions for portfolio ${portfolioId}...`);
    await recalcPositions(portfolioId);
  }

  console.log(`[emailSync] Done: processed=${result.processed} created=${result.created} failed=${result.failed}`);
  syncStore.update(userId, { status: 'done', completedAt: Date.now() });

  return result;
}
