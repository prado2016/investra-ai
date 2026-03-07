import { and, desc, eq } from 'drizzle-orm';
import { db } from '../client.js';
import { assets, transactions } from '../schema.js';

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
      symbol: assets.symbol,
      assetName: assets.name,
      assetType: assets.assetType,
    })
      .from(transactions)
      .innerJoin(assets, eq(transactions.assetId, assets.id))
      .where(eq(transactions.portfolioId, portfolioId))
      .orderBy(desc(transactions.date)),

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
    data: Partial<{
      type: string;
      quantity: number;
      price: number;
      fees: number;
      date: string;
      notes: string;
      strikePrice: number;
      expirationDate: string;
      optionType: string;
    }>
  ) =>
    db.update(transactions).set(data).where(eq(transactions.id, id)).returning().get(),

  delete: (id: string) =>
    db.delete(transactions).where(eq(transactions.id, id)),

  listByPortfolioAndAsset: (portfolioId: string, assetId: string) =>
    db.select()
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.assetId, assetId)))
      .orderBy(transactions.date),
};
