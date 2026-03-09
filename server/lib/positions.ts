import { transactionQueries } from '../db/queries/transactions.js';
import { positionQueries } from '../db/queries/positions.js';
import { assetQueries } from '../db/queries/assets.js';
import { calculatePosition, type PositionEngineTransaction } from './positionEngine.js';

/**
 * Recalculate all positions for a portfolio from scratch using FIFO.
 * Called after any transaction create/update/delete.
 */
export async function recalcPositions(portfolioId: string): Promise<void> {
  const txs = await transactionQueries.listForRecalc(portfolioId);

  // Group by assetId
  const byAsset = new Map<string, PositionEngineTransaction[]>();
  for (const tx of txs) {
    const rows = byAsset.get(tx.assetId) ?? [];
    rows.push(tx);
    byAsset.set(tx.assetId, rows);
  }

  for (const [assetId, rows] of byAsset) {
    const { quantity, avgCostBasis, realizedPl } = calculatePosition(rows);
    await positionQueries.upsert({ portfolioId, assetId, quantity, avgCostBasis, realizedPl });
  }

  // Remove positions for assets that no longer have any transactions
  await positionQueries.deleteOrphaned(portfolioId, [...byAsset.keys()]);
}

/**
 * Ensure an asset exists in the DB, creating it if needed.
 */
export async function ensureAsset(
  symbol: string,
  name: string,
  assetType: 'stock' | 'etf' | 'option' | 'crypto' | 'reit' | 'forex' | 'other' = 'stock'
): Promise<string> {
  const existing = assetQueries.findBySymbol(symbol);
  if (existing) return existing.id;
  const created = assetQueries.upsert({ symbol, name, assetType });
  return created!.id;
}
