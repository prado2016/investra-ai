import { Hono } from 'hono';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();
const YAHOO_USER_AGENT = 'Mozilla/5.0';

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
}

interface YahooSparkMeta {
  symbol?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
}

interface YahooSparkResult {
  symbol?: string;
  response?: Array<{
    meta?: YahooSparkMeta;
  }>;
}

async function searchYahooSymbols(query: string): Promise<YahooSearchQuote[]> {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q', query);
  url.searchParams.set('quotesCount', '8');
  url.searchParams.set('newsCount', '0');

  const response = await fetch(url, {
    headers: {
      'User-Agent': YAHOO_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo search failed with status ${response.status}`);
  }

  const data = await response.json() as { quotes?: YahooSearchQuote[] };
  return data.quotes ?? [];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchYahooSparkQuotes(symbols: string[]) {
  const quotes: Record<string, { price: number; change: number; changePercent: number }> = {};

  for (const symbolChunk of chunk(symbols, 25)) {
    const url = new URL('https://query1.finance.yahoo.com/v7/finance/spark');
    url.searchParams.set('symbols', symbolChunk.join(','));
    url.searchParams.set('range', '1d');
    url.searchParams.set('interval', '5m');

    const response = await fetch(url, {
      headers: {
        'User-Agent': YAHOO_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo spark failed with status ${response.status}`);
    }

    const data = await response.json() as {
      spark?: {
        result?: YahooSparkResult[];
      };
    };

    for (const result of data.spark?.result ?? []) {
      const meta = result.response?.[0]?.meta;
      const symbol = (meta?.symbol ?? result.symbol ?? '').toUpperCase();
      const price = meta?.regularMarketPrice;
      const previousClose = meta?.previousClose ?? meta?.chartPreviousClose;

      if (!symbol || price === undefined || previousClose === undefined) continue;

      const change = price - previousClose;
      const changePercent = previousClose !== 0
        ? (change / previousClose) * 100
        : 0;

      quotes[symbol] = { price, change, changePercent };
    }
  }

  return quotes;
}

// Simple in-memory cache: symbol → { price, change, changePercent, updatedAt }
const cache = new Map<string, { price: number; change: number; changePercent: number; updatedAt: number }>();
const missingCache = new Map<string, number>();
const CACHE_TTL_MS = 60_000; // 1 minute

app.get('/quotes', async (c) => {
  const symbolsParam = c.req.query('symbols');
  if (!symbolsParam) return c.json({ error: 'symbols is required' }, 400);

  const symbols = [...new Set(
    symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  )];
  const now = Date.now();
  const result: Record<string, { price: number; change: number; changePercent: number }> = {};
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const cached = cache.get(sym);
    if (cached && now - cached.updatedAt < CACHE_TTL_MS) {
      result[sym] = { price: cached.price, change: cached.change, changePercent: cached.changePercent };
    } else if ((missingCache.get(sym) ?? 0) + CACHE_TTL_MS > now) {
      continue;
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length > 0) {
    try {
      const fetchedQuotes = await fetchYahooSparkQuotes(toFetch);

      for (const [sym, quote] of Object.entries(fetchedQuotes)) {
        const data = { ...quote, updatedAt: Date.now() };
        cache.set(sym, data);
        missingCache.delete(sym);
        result[sym] = quote;
      }

      for (const sym of toFetch) {
        if (!(sym in fetchedQuotes)) {
          missingCache.set(sym, now);
        }
      }
    } catch {
      for (const sym of toFetch) {
        missingCache.set(sym, now);
      }
    }
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
