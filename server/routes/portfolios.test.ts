// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../middleware/requireAuth.js';

vi.mock('../db/queries/portfolios.js', () => ({
  portfolioQueries: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setDefault: vi.fn(),
  },
}));

import { portfolioQueries } from '../db/queries/portfolios.js';
import portfoliosRouter from './portfolios.js';

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
  app.route('/portfolios', portfoliosRouter);
  return app;
}

describe('portfolio routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects setting another user portfolio as default', async () => {
    vi.mocked(portfolioQueries.get).mockReturnValue({
      id: 'portfolio-2',
      userId: 'another-user',
      name: 'Foreign',
      currency: 'USD',
      isDefault: false,
      createdAt: new Date(),
    });

    const app = createApp();
    const response = await app.request('/portfolios/portfolio-2/set-default', { method: 'POST' });

    expect(response.status).toBe(404);
    expect(portfolioQueries.setDefault).not.toHaveBeenCalled();
  });

  it('allows setting one of the user portfolios as default', async () => {
    vi.mocked(portfolioQueries.get).mockReturnValue({
      id: 'portfolio-1',
      userId: TEST_USER.id,
      name: 'Mine',
      currency: 'USD',
      isDefault: false,
      createdAt: new Date(),
    });
    vi.mocked(portfolioQueries.setDefault).mockResolvedValue({
      id: 'portfolio-1',
      userId: TEST_USER.id,
      name: 'Mine',
      currency: 'USD',
      isDefault: true,
      createdAt: new Date(),
    });

    const app = createApp();
    const response = await app.request('/portfolios/portfolio-1/set-default', { method: 'POST' });

    expect(response.status).toBe(200);
    expect(portfolioQueries.setDefault).toHaveBeenCalledWith(TEST_USER.id, 'portfolio-1');
  });
});
