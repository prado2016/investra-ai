import { eq, like } from 'drizzle-orm';
import { db } from '../client.js';
import { assets } from '../schema.js';

export const assetQueries = {
  findBySymbol: (symbol: string) =>
    db.select().from(assets).where(eq(assets.symbol, symbol.toUpperCase())).get(),

  search: (query: string) =>
    db.select().from(assets)
      .where(like(assets.symbol, `${query.toUpperCase()}%`))
      .limit(10),

  upsert: (data: { symbol: string; name: string; assetType?: string; exchange?: string; currency?: string }) =>
    db.insert(assets)
      .values({ ...data, symbol: data.symbol.toUpperCase() })
      .onConflictDoUpdate({ target: assets.symbol, set: { name: data.name } })
      .returning()
      .get(),
};
