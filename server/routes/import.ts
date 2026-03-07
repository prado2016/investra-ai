import { Hono } from 'hono';
import { portfolioQueries } from '../db/queries/portfolios.js';
import { transactionQueries } from '../db/queries/transactions.js';
import { recalcPositions, ensureAsset } from '../lib/positions.js';
import { syncEmails } from '../lib/emailProcessor.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// POST /api/import/csv
// Body: { portfolioId, rows: Array<{ symbol, type, quantity, price, fees, date, notes? }> }
app.post('/csv', async (c) => {
  const user = c.get('user');
  const { portfolioId, rows } = await c.req.json<{
    portfolioId: string;
    rows: Array<{
      symbol: string;
      assetName?: string;
      assetType?: string;
      type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';
      quantity: number;
      price: number;
      fees?: number;
      date: string;
      notes?: string;
    }>;
  }>();

  const portfolio = portfolioQueries.get(portfolioId);
  if (!portfolio || portfolio.userId !== user.id) return c.json({ error: 'Not found' }, 404);

  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const assetId = await ensureAsset(row.symbol, row.assetName ?? row.symbol, row.assetType);
      await transactionQueries.create({
        portfolioId,
        assetId,
        type: row.type,
        quantity: row.quantity,
        price: row.price,
        fees: row.fees ?? 0,
        date: row.date,
        notes: row.notes,
        source: 'csv',
      });
      created++;
    } catch (err) {
      errors.push(`Row ${created + errors.length + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (created > 0) await recalcPositions(portfolioId);
  return c.json({ created, errors });
});

// POST /api/import/email-sync
app.post('/email-sync', async (c) => {
  const user = c.get('user');
  const { portfolioId } = await c.req.json<{ portfolioId: string }>();
  const portfolio = portfolioQueries.get(portfolioId);
  if (!portfolio || portfolio.userId !== user.id) return c.json({ error: 'Not found' }, 404);

  try {
    const result = await syncEmails(user.id, portfolioId);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Sync failed' }, 500);
  }
});

export default app;
