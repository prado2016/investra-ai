import { Hono } from 'hono';
import { transactionQueries } from '../db/queries/transactions.js';
import { portfolioQueries } from '../db/queries/portfolios.js';
import { recalcPositions, ensureAsset } from '../lib/positions.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();
type AssetType = 'stock' | 'etf' | 'option' | 'crypto' | 'reit' | 'forex' | 'other';
type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';

// Verify portfolio belongs to user
async function ownedPortfolio(userId: string, portfolioId: string) {
  const p = portfolioQueries.get(portfolioId);
  return p?.userId === userId ? p : null;
}

app.get('/', async (c) => {
  const user = c.get('user');
  const portfolioId = c.req.query('portfolioId');
  if (!portfolioId) return c.json({ error: 'portfolioId is required' }, 400);
  if (!await ownedPortfolio(user.id, portfolioId)) return c.json({ error: 'Not found' }, 404);
  const rows = await transactionQueries.list(portfolioId);
  return c.json(rows);
});

app.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    portfolioId: string;
    symbol: string;
    assetName?: string;
    assetType?: AssetType;
    type: TransactionType;
    quantity: number;
    price: number;
    fees?: number;
    date: string;
    notes?: string;
    strikePrice?: number;
    expirationDate?: string;
    optionType?: 'call' | 'put';
  }>();

  if (!await ownedPortfolio(user.id, body.portfolioId)) return c.json({ error: 'Not found' }, 404);

  const assetId = await ensureAsset(
    body.symbol,
    body.assetName ?? body.symbol,
    body.assetType ?? 'stock'
  );

  const tx = await transactionQueries.create({
    portfolioId: body.portfolioId,
    assetId,
    type: body.type,
    quantity: body.quantity,
    price: body.price,
    fees: body.fees ?? 0,
    date: body.date,
    notes: body.notes,
    strikePrice: body.strikePrice,
    expirationDate: body.expirationDate,
    optionType: body.optionType,
    source: 'manual',
  });

  await recalcPositions(body.portfolioId);
  return c.json(tx, 201);
});

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = transactionQueries.get(id);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  if (!await ownedPortfolio(user.id, existing.portfolioId)) return c.json({ error: 'Forbidden' }, 403);

  const data = await c.req.json<{
    type?: TransactionType; quantity?: number; price?: number; fees?: number;
    date?: string; notes?: string;
  }>();

  const updated = await transactionQueries.update(id, data);
  await recalcPositions(existing.portfolioId);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = transactionQueries.get(id);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  if (!await ownedPortfolio(user.id, existing.portfolioId)) return c.json({ error: 'Forbidden' }, 403);
  await transactionQueries.delete(id);
  await recalcPositions(existing.portfolioId);
  return c.json({ success: true });
});

export default app;
