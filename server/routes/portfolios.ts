import { Hono } from 'hono';
import { portfolioQueries } from '../db/queries/portfolios.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const user = c.get('user');
  const rows = await portfolioQueries.list(user.id);
  return c.json(rows);
});

app.post('/', async (c) => {
  const user = c.get('user');
  const { name, currency, parentPortfolioId } = await c.req.json<{
    name: string;
    currency?: string;
    parentPortfolioId?: string;
  }>();
  if (!name?.trim()) return c.json({ error: 'Name is required' }, 400);
  if (parentPortfolioId) {
    const parentPortfolio = portfolioQueries.get(parentPortfolioId);
    if (!parentPortfolio || parentPortfolio.userId !== user.id) {
      return c.json({ error: 'Parent portfolio not found' }, 404);
    }
    if (parentPortfolio.parentPortfolioId) {
      return c.json({ error: 'Accounts can only be created under a master portfolio' }, 400);
    }
  }
  const portfolio = await portfolioQueries.create(user.id, {
    name: name.trim(),
    currency,
    parentPortfolioId: parentPortfolioId ?? null,
  });
  return c.json(portfolio, 201);
});

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = portfolioQueries.get(id);
  if (!existing || existing.userId !== user.id) return c.json({ error: 'Not found' }, 404);
  const data = await c.req.json<{ name?: string; currency?: string; isDefault?: boolean }>();
  const updated = await portfolioQueries.update(id, data);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = portfolioQueries.get(id);
  if (!existing || existing.userId !== user.id) return c.json({ error: 'Not found' }, 404);
  if (await portfolioQueries.hasChildren(id)) {
    return c.json({ error: 'Delete child accounts before removing this master portfolio' }, 400);
  }
  await portfolioQueries.delete(id);
  return c.json({ success: true });
});

app.post('/:id/set-default', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = portfolioQueries.get(id);
  if (!existing || existing.userId !== user.id) return c.json({ error: 'Not found' }, 404);
  const updated = await portfolioQueries.setDefault(user.id, id);
  return c.json(updated);
});

export default app;
