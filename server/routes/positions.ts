import { Hono } from 'hono';
import { positionQueries } from '../db/queries/positions.js';
import { getPortfolioScope } from '../lib/portfolioScope.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

function aggregatePositions(
  portfolioId: string,
  rows: Awaited<ReturnType<typeof positionQueries.listByPortfolioIds>>,
) {
  const byAssetId = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    const existing = byAssetId.get(row.assetId);
    if (!existing) {
      byAssetId.set(row.assetId, { ...row, portfolioId });
      continue;
    }

    const totalQuantity = existing.quantity + row.quantity;
    const totalCostBasis = (existing.quantity * existing.avgCostBasis) + (row.quantity * row.avgCostBasis);
    existing.quantity = totalQuantity;
    existing.avgCostBasis = totalQuantity !== 0 ? totalCostBasis / totalQuantity : 0;
    existing.realizedPl += row.realizedPl;
    existing.updatedAt = existing.updatedAt > row.updatedAt ? existing.updatedAt : row.updatedAt;
  }

  return [...byAssetId.values()].filter((row) => row.quantity !== 0);
}

app.get('/', async (c) => {
  const user = c.get('user');
  const portfolioId = c.req.query('portfolioId');
  if (!portfolioId) return c.json({ error: 'portfolioId is required' }, 400);
  const scope = await getPortfolioScope(user.id, portfolioId);
  if (!scope) return c.json({ error: 'Not found' }, 404);

  const rows = scope.isAggregate
    ? aggregatePositions(scope.portfolio.id, await positionQueries.listByPortfolioIds(scope.portfolioIds))
    : await positionQueries.list(scope.portfolio.id);

  return c.json(rows);
});

export default app;
