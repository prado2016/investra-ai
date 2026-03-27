// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../middleware/requireAuth.js';
import marketRouter from './market.js';

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
  app.route('/market', marketRouter);
  return app;
}

describe('market routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns spark quotes for supported symbols and skips unresolved ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      spark: {
        result: [
          {
            symbol: 'AAPL',
            response: [{ meta: { symbol: 'AAPL', regularMarketPrice: 200, previousClose: 195 } }],
          },
          {
            symbol: 'MSFT',
            response: [{ meta: { symbol: 'MSFT', regularMarketPrice: 300, chartPreviousClose: 297 } }],
          },
          {
            symbol: 'INVALID',
            response: [{ meta: { symbol: 'INVALID' } }],
          },
        ],
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    const response = await app.request('/market/quotes?symbols=AAPL,MSFT,INVALID');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = await response.json();
    expect(body.AAPL.price).toBe(200);
    expect(body.AAPL.change).toBe(5);
    expect(body.AAPL.changePercent).toBeCloseTo(2.5641025641, 10);
    expect(body.MSFT.price).toBe(300);
    expect(body.MSFT.change).toBe(3);
    expect(body.MSFT.changePercent).toBeCloseTo(1.0101010101, 10);
    expect(body.INVALID).toBeUndefined();
  });
});
