import { Hono } from 'hono';
import yahooFinance from 'yahoo-finance2';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// Simple in-memory cache: symbol → { price, change, changePercent, updatedAt }
const cache = new Map<string, { price: number; change: number; changePercent: number; updatedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

app.get('/quotes', async (c) => {
  const symbolsParam = c.req.query('symbols');
  if (!symbolsParam) return c.json({ error: 'symbols is required' }, 400);

  const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const now = Date.now();
  const result: Record<string, { price: number; change: number; changePercent: number }> = {};
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const cached = cache.get(sym);
    if (cached && now - cached.updatedAt < CACHE_TTL_MS) {
      result[sym] = { price: cached.price, change: cached.change, changePercent: cached.changePercent };
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length > 0) {
    await Promise.allSettled(
      toFetch.map(async (sym) => {
        try {
          const quote = await yahooFinance.quote(sym);
          const data = {
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            updatedAt: Date.now(),
          };
          cache.set(sym, data);
          result[sym] = { price: data.price, change: data.change, changePercent: data.changePercent };
        } catch {
          result[sym] = { price: 0, change: 0, changePercent: 0 };
        }
      })
    );
  }

  return c.json(result);
});

app.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json({ error: 'q is required' }, 400);
  try {
    const results = await yahooFinance.search(query, { newsCount: 0 });
    const quotes = (results.quotes ?? []).slice(0, 8).map((q) => ({
      symbol: q.symbol,
      name: 'shortname' in q ? q.shortname : q.symbol,
      exchange: 'exchange' in q ? q.exchange : '',
      type: q.quoteType?.toLowerCase() ?? 'stock',
    }));
    return c.json(quotes);
  } catch {
    return c.json([]);
  }
});

export default app;
