import { eq } from 'drizzle-orm';
import { db } from '../client.js';
import { portfolios } from '../schema.js';

export const portfolioQueries = {
  list: (userId: string) =>
    db.select().from(portfolios).where(eq(portfolios.userId, userId)),

  get: (id: string) =>
    db.select().from(portfolios).where(eq(portfolios.id, id)).get(),

  create: (userId: string, data: { name: string; currency?: string }) =>
    db.insert(portfolios).values({ userId, ...data }).returning().get(),

  update: (id: string, data: Partial<{ name: string; currency: string; isDefault: boolean }>) =>
    db.update(portfolios).set(data).where(eq(portfolios.id, id)).returning().get(),

  delete: (id: string) =>
    db.delete(portfolios).where(eq(portfolios.id, id)),

  setDefault: async (userId: string, portfolioId: string) => {
    // Clear existing default
    await db.update(portfolios).set({ isDefault: false }).where(eq(portfolios.userId, userId));
    // Set new default
    return db.update(portfolios).set({ isDefault: true }).where(eq(portfolios.id, portfolioId)).returning().get();
  },
};
