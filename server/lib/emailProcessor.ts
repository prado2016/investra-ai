import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { portfolioQueries } from '../db/queries/portfolios.js';
import { emailConfigQueries } from '../db/queries/emailConfigs.js';
import { transactionQueries } from '../db/queries/transactions.js';
import { recalcPositions, ensureAsset } from './positions.js';
import { parseEmailText } from './emailParser.js';
import { decryptStoredSecret } from './credentialVault.js';
import { syncStore } from './syncStore.js';

export interface SyncResult {
  processed: number;
  created: number;
  failed: number;
  errors: string[];
}

interface SyncOptions {
  includeSeen?: boolean;
}

export function normalizePortfolioKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function resolvePortfolioIdForAccount(params: {
  userId: string;
  fallbackPortfolioId: string;
  accountName?: string;
  portfolioIdsByKey: Map<string, string>;
}): Promise<string> {
  const { userId, fallbackPortfolioId, accountName, portfolioIdsByKey } = params;

  if (!accountName) return fallbackPortfolioId;

  const normalizedAccountName = normalizePortfolioKey(accountName);
  const existingPortfolioId = portfolioIdsByKey.get(normalizedAccountName);
  if (existingPortfolioId) return existingPortfolioId;

  const createdPortfolio = await portfolioQueries.create(userId, { name: accountName.trim() });
  if (!createdPortfolio) {
    throw new Error(`Failed to create portfolio for account "${accountName}"`);
  }

  portfolioIdsByKey.set(normalizedAccountName, createdPortfolio.id);
  return createdPortfolio.id;
}

export async function syncEmails(userId: string, fallbackPortfolioId: string, options: SyncOptions = {}): Promise<SyncResult> {
  const config = emailConfigQueries.getByUser(userId);
  if (!config) throw new Error('No email configuration found');

  const result: SyncResult = { processed: 0, created: 0, failed: 0, errors: [] };
  const existingPortfolios = await portfolioQueries.list(userId);
  const portfolioIdsByKey = new Map(
    existingPortfolios.map((portfolio) => [normalizePortfolioKey(portfolio.name), portfolio.id])
  );
  const hasPriorEmailLogs = (await emailConfigQueries.getLogs(userId, 1)).length > 0;
  const includeSeen = options.includeSeen ?? !hasPriorEmailLogs;
  const affectedPortfolioIds = new Set<string>();

  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: true,
    auth: {
      user: config.emailAddress,
      pass: decryptStoredSecret(config.encryptedPassword),
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
    console.log(`[emailSync] INBOX locked, searching ${includeSeen ? 'all messages for backfill' : 'unseen messages'}...`);

    try {
      const unseen = await client.search(includeSeen ? {} : { seen: false });
      const unseenSeqNos = Array.isArray(unseen) ? unseen : [];
      console.log(`[emailSync] Found ${unseenSeqNos.length} ${includeSeen ? 'messages' : 'unseen messages'}`);
      if (unseenSeqNos.length === 0) {
        syncStore.update(userId, { status: 'done', total: 0, completedAt: Date.now() });
        return result;
      }

      syncStore.update(userId, { status: 'syncing', total: unseenSeqNos.length });

      // Process one message at a time to avoid Gmail IMAP throttling/stalling
      // Batch fetch with source: true causes Gmail to stall on large requests
      for (let i = 0; i < unseenSeqNos.length; i++) {
        const seqNo = unseenSeqNos[i];
        if (i % 25 === 0) {
          console.log(`[emailSync] Processing message ${i + 1} of ${unseenSeqNos.length}...`);
        }

        result.processed++;
        try {
          const msg = await client.fetchOne(seqNo, { source: true, uid: true });
          if (!msg || !msg.source) {
            throw new Error(`Unable to fetch message ${seqNo}`);
          }

          const parsed = await simpleParser(msg.source);
          const text = parsed.text
            ?? (typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : '')
            ?? '';
          const subject = parsed.subject ?? '';
          const from = parsed.from?.text ?? '';

          const transactions = parseEmailText(text);

          let created = 0;
          for (const tx of transactions) {
            const targetPortfolioId = await resolvePortfolioIdForAccount({
              userId,
              fallbackPortfolioId,
              accountName: tx.accountName,
              portfolioIdsByKey,
            });
            const assetId = await ensureAsset(tx.symbol, tx.symbol);
            await transactionQueries.create({
              portfolioId: targetPortfolioId,
              assetId,
              type: tx.type,
              quantity: tx.quantity,
              price: tx.price,
              fees: tx.fees,
              date: tx.date,
              notes: tx.notes,
              source: 'email',
            });
            affectedPortfolioIds.add(targetPortfolioId);
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
    } finally {
      console.log('[emailSync] Releasing lock...');
      lock.release();
    }
  } catch (outerErr) {
    console.error('[emailSync] Fatal error:', outerErr instanceof Error ? outerErr.message : outerErr);
    throw outerErr;
  } finally {
    if (client.usable) {
      console.log('[emailSync] Logging out...');
      await client.logout();
    }
  }

  // Recalculate positions once after all emails are processed
  if (result.created > 0) {
    for (const portfolioId of affectedPortfolioIds) {
      console.log(`[emailSync] Recalculating positions for portfolio ${portfolioId}...`);
      await recalcPositions(portfolioId);
    }
  }

  console.log(`[emailSync] Done: processed=${result.processed} created=${result.created} failed=${result.failed}`);
  syncStore.update(userId, { status: 'done', completedAt: Date.now() });

  return result;
}
