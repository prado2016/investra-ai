import { Hono } from 'hono';
import { positionQueries } from '../db/queries/positions.js';
import { portfolioQueries } from '../db/queries/portfolios.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const user = c.get('user');
  const portfolioId = c.req.query('portfolioId');
  if (!portfolioId) return c.json({ error: 'portfolioId is required' }, 400);
  const portfolio = portfolioQueries.get(portfolioId);
  if (!portfolio || portfolio.userId !== user.id) return c.json({ error: 'Not found' }, 404);
  const rows = await positionQueries.list(portfolioId);
  return c.json(rows);
});

export default app;
