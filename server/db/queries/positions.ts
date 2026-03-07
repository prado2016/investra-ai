import { and, eq, gt } from 'drizzle-orm';
import { db } from '../client.js';
import { assets, positions } from '../schema.js';

export const positionQueries = {
  list: (portfolioId: string) =>
    db.select({
      id: positions.id,
      portfolioId: positions.portfolioId,
      assetId: positions.assetId,
      quantity: positions.quantity,
      avgCostBasis: positions.avgCostBasis,
      realizedPl: positions.realizedPl,
      updatedAt: positions.updatedAt,
      symbol: assets.symbol,
      assetName: assets.name,
      assetType: assets.assetType,
      currency: assets.currency,
    })
      .from(positions)
      .innerJoin(assets, eq(positions.assetId, assets.id))
      .where(and(eq(positions.portfolioId, portfolioId), gt(positions.quantity, 0))),

  get: (portfolioId: string, assetId: string) =>
    db.select()
      .from(positions)
      .where(and(eq(positions.portfolioId, portfolioId), eq(positions.assetId, assetId)))
      .get(),

  upsert: (data: {
    portfolioId: string;
    assetId: string;
    quantity: number;
    avgCostBasis: number;
    realizedPl: number;
  }) =>
    db.insert(positions)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [positions.portfolioId, positions.assetId],
        set: {
          quantity: data.quantity,
          avgCostBasis: data.avgCostBasis,
          realizedPl: data.realizedPl,
          updatedAt: new Date(),
        },
      })
      .returning()
      .get(),

  deleteByPortfolio: (portfolioId: string) =>
    db.delete(positions).where(eq(positions.portfolioId, portfolioId)),
};
