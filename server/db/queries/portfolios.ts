import { and, asc, eq } from 'drizzle-orm';
import { db } from '../client.js';
import { portfolios } from '../schema.js';

type PortfolioMutation = {
  name: string;
  currency?: string;
  parentPortfolioId?: string | null;
};

type PortfolioUpdate = Partial<{
  name: string;
  currency: string;
  isDefault: boolean;
  parentPortfolioId: string | null;
}>;

export const portfolioQueries = {
  list: (userId: string) =>
    db.select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .orderBy(asc(portfolios.parentPortfolioId), asc(portfolios.name)),

  get: (id: string) =>
    db.select().from(portfolios).where(eq(portfolios.id, id)).get(),

  create: (userId: string, data: PortfolioMutation) =>
    db.insert(portfolios).values({ userId, ...data }).returning().get(),

  update: (id: string, data: PortfolioUpdate) =>
    db.update(portfolios).set(data).where(eq(portfolios.id, id)).returning().get(),

  delete: (id: string) =>
    db.delete(portfolios).where(eq(portfolios.id, id)),

  listChildren: (parentPortfolioId: string) =>
    db.select()
      .from(portfolios)
      .where(eq(portfolios.parentPortfolioId, parentPortfolioId))
      .orderBy(asc(portfolios.name)),

  hasChildren: async (parentPortfolioId: string) => {
    const child = await db.select({ id: portfolios.id })
      .from(portfolios)
      .where(eq(portfolios.parentPortfolioId, parentPortfolioId))
      .limit(1)
      .get();
    return Boolean(child);
  },

  setDefault: async (userId: string, portfolioId: string) => {
    // Clear existing default
    await db.update(portfolios).set({ isDefault: false }).where(eq(portfolios.userId, userId));
    // Set new default
    return db.update(portfolios)
      .set({ isDefault: true })
      .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)))
      .returning()
      .get();
  },
};
