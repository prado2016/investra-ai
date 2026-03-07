import { eq } from 'drizzle-orm';
import { db } from '../client.js';
import { emailConfigs, emailLogs } from '../schema.js';

export const emailConfigQueries = {
  getByUser: (userId: string) =>
    db.select().from(emailConfigs).where(eq(emailConfigs.userId, userId)).get(),

  upsert: (
    userId: string,
    data: {
      provider?: string;
      imapHost: string;
      imapPort?: number;
      emailAddress: string;
      encryptedPassword: string;
      defaultPortfolioId?: string;
    }
  ) =>
    db.insert(emailConfigs)
      .values({ userId, ...data })
      .onConflictDoUpdate({ target: emailConfigs.userId, set: { ...data } })
      .returning()
      .get(),

  delete: (userId: string) =>
    db.delete(emailConfigs).where(eq(emailConfigs.userId, userId)),

  logEmail: (data: {
    userId: string;
    emailConfigId?: string;
    subject?: string;
    fromAddress?: string;
    status: 'pending' | 'processed' | 'failed' | 'skipped';
    transactionsCreated?: number;
    errorMessage?: string;
  }) =>
    db.insert(emailLogs).values(data).returning().get(),

  getLogs: (userId: string, limit = 50) =>
    db.select().from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .limit(limit),
};
