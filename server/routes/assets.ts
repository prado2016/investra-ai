import { Hono } from 'hono';
import { assetQueries } from '../db/queries/assets.js';
import { lookupSymbol } from '../lib/gemini.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/search', async (c) => {
  const q = c.req.query('q') ?? '';
  if (q.length < 1) return c.json([]);

  // First try local DB
  const local = await assetQueries.search(q);
  if (local.length >= 3) return c.json(local);

  // Fall back to Gemini AI lookup
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return c.json(local);

  const aiResults = await lookupSymbol(q, apiKey);
  return c.json(aiResults);
});

export default app;
