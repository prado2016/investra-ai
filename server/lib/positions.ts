import { transactionQueries } from '../db/queries/transactions.js';
import { positionQueries } from '../db/queries/positions.js';
import { assetQueries } from '../db/queries/assets.js';

interface TxRow {
  assetId: string;
  type: string;
  quantity: number;
  price: number;
  fees: number;
}

/**
 * Recalculate all positions for a portfolio from scratch using FIFO.
 * Called after any transaction create/update/delete.
 */
export async function recalcPositions(portfolioId: string): Promise<void> {
  const txs = await transactionQueries.list(portfolioId);

  // Group by assetId
  const byAsset = new Map<string, TxRow[]>();
  for (const tx of txs) {
    const rows = byAsset.get(tx.assetId) ?? [];
    rows.push(tx);
    byAsset.set(tx.assetId, rows);
  }

  for (const [assetId, rows] of byAsset) {
    const { quantity, avgCostBasis, realizedPl } = calcPosition(rows);
    await positionQueries.upsert({ portfolioId, assetId, quantity, avgCostBasis, realizedPl });
  }
}

function calcPosition(txs: TxRow[]): { quantity: number; avgCostBasis: number; realizedPl: number } {
  // Sort by natural order (they come ordered by date already)
  let quantity = 0;
  let totalCost = 0;
  let realizedPl = 0;

  for (const tx of txs) {
    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      const cost = tx.quantity * tx.price + tx.fees;
      totalCost += cost;
      quantity += tx.quantity;
    } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
      const avgCost = quantity > 0 ? totalCost / quantity : 0;
      const proceeds = tx.quantity * tx.price - tx.fees;
      const costBasis = avgCost * tx.quantity;
      realizedPl += proceeds - costBasis;
      totalCost -= costBasis;
      quantity -= tx.quantity;
      if (quantity <= 0) {
        quantity = 0;
        totalCost = 0;
      }
    } else if (tx.type === 'dividend') {
      realizedPl += tx.quantity * tx.price - tx.fees;
    } else if (tx.type === 'split') {
      // tx.price = split ratio (e.g., 4 for a 4:1 split)
      // Total cost stays the same; quantity increases, avg cost decreases
      quantity *= tx.price;
    }
  }

  const avgCostBasis = quantity > 0 ? totalCost / quantity : 0;
  return { quantity: Math.max(0, quantity), avgCostBasis, realizedPl };
}

/**
 * Ensure an asset exists in the DB, creating it if needed.
 */
export async function ensureAsset(symbol: string, name: string, assetType = 'stock'): Promise<string> {
  const existing = assetQueries.findBySymbol(symbol);
  if (existing) return existing.id;
  const created = assetQueries.upsert({ symbol, name, assetType });
  return created!.id;
}
