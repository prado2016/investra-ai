// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../middleware/requireAuth.js';

vi.mock('../db/queries/positions.js', () => ({
  positionQueries: {
    list: vi.fn(),
    listByPortfolioIds: vi.fn(),
  },
}));

vi.mock('../db/queries/portfolios.js', () => ({
  portfolioQueries: {
    get: vi.fn(),
    listChildren: vi.fn(),
  },
}));

import { positionQueries } from '../db/queries/positions.js';
import { portfolioQueries } from '../db/queries/portfolios.js';
import positionsRouter from './positions.js';

const TEST_USER: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
};

function createApp() {
  const app = new Hono<{ Variables: { user: AuthUser } }>();
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER);
    await next();
  });
  app.route('/positions', positionsRouter);
  return app;
}

describe('positions routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates child account positions under a master portfolio', async () => {
    vi.mocked(portfolioQueries.get).mockReturnValue({
      id: 'master-1',
      userId: TEST_USER.id,
      name: 'Wealthsimple',
      parentPortfolioId: null,
      currency: 'USD',
      isDefault: true,
      createdAt: new Date(),
    });
    vi.mocked(portfolioQueries.listChildren).mockResolvedValue([
      {
        id: 'account-1',
        userId: TEST_USER.id,
        name: 'TFSA',
        parentPortfolioId: 'master-1',
        currency: 'USD',
        isDefault: false,
        createdAt: new Date(),
      },
      {
        id: 'account-2',
        userId: TEST_USER.id,
        name: 'RRSP',
        parentPortfolioId: 'master-1',
        currency: 'USD',
        isDefault: false,
        createdAt: new Date(),
      },
    ]);
    vi.mocked(positionQueries.listByPortfolioIds).mockResolvedValue([
      {
        id: 'pos-1',
        portfolioId: 'account-1',
        assetId: 'asset-1',
        quantity: 10,
        avgCostBasis: 100,
        realizedPl: 25,
        updatedAt: new Date('2026-03-01'),
        symbol: 'AAPL',
        assetName: 'Apple',
        assetType: 'stock',
        currency: 'USD',
      },
      {
        id: 'pos-2',
        portfolioId: 'account-2',
        assetId: 'asset-1',
        quantity: 5,
        avgCostBasis: 120,
        realizedPl: 15,
        updatedAt: new Date('2026-03-02'),
        symbol: 'AAPL',
        assetName: 'Apple',
        assetType: 'stock',
        currency: 'USD',
      },
    ]);

    const app = createApp();
    const response = await app.request('/positions?portfolioId=master-1');

    expect(response.status).toBe(200);
    expect(positionQueries.listByPortfolioIds).toHaveBeenCalledWith(['master-1', 'account-1', 'account-2']);

    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      portfolioId: 'master-1',
      assetId: 'asset-1',
      quantity: 15,
      realizedPl: 40,
    });
    expect(body[0].avgCostBasis).toBeCloseTo(106.6666666667, 10);
  });
});
