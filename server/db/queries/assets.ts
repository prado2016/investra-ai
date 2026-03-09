import { eq, like } from 'drizzle-orm';
import { db } from '../client.js';
import { assets } from '../schema.js';

type AssetUpsertInput = Pick<typeof assets.$inferInsert, 'symbol' | 'name' | 'assetType' | 'exchange' | 'currency'>;

export const assetQueries = {
  findBySymbol: (symbol: string) =>
    db.select().from(assets).where(eq(assets.symbol, symbol.toUpperCase())).get(),

  search: (query: string) =>
    db.select().from(assets)
      .where(like(assets.symbol, `${query.toUpperCase()}%`))
      .limit(10),

  upsert: (data: AssetUpsertInput) =>
    db.insert(assets)
      .values({ ...data, symbol: data.symbol.toUpperCase() })
      .onConflictDoUpdate({ target: assets.symbol, set: { name: data.name } })
      .returning()
      .get(),
};
