import { Hono } from 'hono';
import YahooFinance from 'yahoo-finance2';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();
const yahooFinance = new YahooFinance();

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
}

async function searchYahooSymbols(query: string): Promise<YahooSearchQuote[]> {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q', query);
  url.searchParams.set('quotesCount', '8');
  url.searchParams.set('newsCount', '0');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo search failed with status ${response.status}`);
  }

  const data = await response.json() as { quotes?: YahooSearchQuote[] };
  return data.quotes ?? [];
}

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
    const quotes = (await searchYahooSymbols(query))
      .map((q) => ({
        symbol: q.symbol ?? '',
        name: q.shortname ?? q.longname ?? q.symbol ?? '',
        exchange: q.exchDisp ?? q.exchange ?? '',
        type: (q.quoteType ?? q.typeDisp ?? 'stock').toLowerCase(),
      }))
      .filter((q) => q.symbol);

    return c.json(quotes);
  } catch {
    return c.json([]);
  }
});

export default app;
