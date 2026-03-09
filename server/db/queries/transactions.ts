import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../client.js';
import { assets, portfolios, transactions } from '../schema.js';

type TransactionUpdate = Partial<Pick<typeof transactions.$inferInsert,
  'type' | 'quantity' | 'price' | 'fees' | 'date' | 'notes' | 'strikePrice' | 'expirationDate' | 'optionType'
>>;

export const transactionQueries = {
  list: (portfolioId: string) =>
    db.select({
      id: transactions.id,
      portfolioId: transactions.portfolioId,
      assetId: transactions.assetId,
      type: transactions.type,
      quantity: transactions.quantity,
      price: transactions.price,
      fees: transactions.fees,
      date: transactions.date,
      notes: transactions.notes,
      strikePrice: transactions.strikePrice,
      expirationDate: transactions.expirationDate,
      optionType: transactions.optionType,
      source: transactions.source,
      createdAt: transactions.createdAt,
      portfolioName: portfolios.name,
      symbol: assets.symbol,
      assetName: assets.name,
      assetType: assets.assetType,
    })
      .from(transactions)
      .innerJoin(assets, eq(transactions.assetId, assets.id))
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(eq(transactions.portfolioId, portfolioId))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),

  listByPortfolioIds: async (portfolioIds: string[]) => {
    if (portfolioIds.length === 0) return [];
    return db.select({
      id: transactions.id,
      portfolioId: transactions.portfolioId,
      assetId: transactions.assetId,
      type: transactions.type,
      quantity: transactions.quantity,
      price: transactions.price,
      fees: transactions.fees,
      date: transactions.date,
      notes: transactions.notes,
      strikePrice: transactions.strikePrice,
      expirationDate: transactions.expirationDate,
      optionType: transactions.optionType,
      source: transactions.source,
      createdAt: transactions.createdAt,
      portfolioName: portfolios.name,
      symbol: assets.symbol,
      assetName: assets.name,
      assetType: assets.assetType,
    })
      .from(transactions)
      .innerJoin(assets, eq(transactions.assetId, assets.id))
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(inArray(transactions.portfolioId, portfolioIds))
      .orderBy(desc(transactions.date), desc(transactions.createdAt));
  },

  get: (id: string) =>
    db.select().from(transactions).where(eq(transactions.id, id)).get(),

  create: (data: {
    portfolioId: string;
    assetId: string;
    type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';
    quantity: number;
    price: number;
    fees?: number;
    date: string;
    notes?: string;
    strikePrice?: number;
    expirationDate?: string;
    optionType?: 'call' | 'put';
    source?: 'manual' | 'csv' | 'email';
  }) =>
    db.insert(transactions).values(data).returning().get(),

  update: (
    id: string,
    data: TransactionUpdate
  ) =>
    db.update(transactions).set(data).where(eq(transactions.id, id)).returning().get(),

  delete: (id: string) =>
    db.delete(transactions).where(eq(transactions.id, id)),

  listForRecalc: (portfolioId: string) =>
    db.select({
      assetId: transactions.assetId,
      type: transactions.type,
      quantity: transactions.quantity,
      price: transactions.price,
      fees: transactions.fees,
      date: transactions.date,
      createdAt: transactions.createdAt,
    })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioId))
      .orderBy(asc(transactions.date), asc(transactions.createdAt)),

  listByPortfolioAndAsset: (portfolioId: string, assetId: string) =>
    db.select()
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.assetId, assetId)))
      .orderBy(asc(transactions.date), asc(transactions.createdAt)),
};
