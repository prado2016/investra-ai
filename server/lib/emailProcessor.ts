import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { Readable } from 'stream';
import { emailConfigQueries } from '../db/queries/emailConfigs.js';
import { transactionQueries } from '../db/queries/transactions.js';
import { recalcPositions, ensureAsset } from './positions.js';
import { parseEmailText } from './emailParser.js';

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
      pass: config.encryptedPassword, // stored decrypted for now; encrypt at rest later
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for unseen messages with "order" in subject (Wealthsimple: "Your order has been filled")
      const unseen = await client.search({ seen: false });
      if (unseen.length === 0) {
        return result;
      }

      // Fetch all unseen messages
      for await (const msg of client.fetch(unseen, { source: true, uid: true })) {
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
            await recalcPositions(portfolioId);
          }

          // Mark as seen only if we successfully parsed transactions
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
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return result;
}
