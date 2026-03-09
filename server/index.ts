import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './auth.js';
import { requireAuth } from './middleware/requireAuth.js';
import portfoliosRouter from './routes/portfolios.js';
import transactionsRouter from './routes/transactions.js';
import positionsRouter from './routes/positions.js';
import marketRouter from './routes/market.js';
import importRouter from './routes/import.js';
import assetsRouter from './routes/assets.js';
import settingsRouter from './routes/settings.js';

const app = new Hono();

app.use(logger());
app.use(
  '/api/*',
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);

// better-auth handles all /api/auth/* routes
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// Protected API routes
const api = new Hono();
api.use('*', requireAuth);
api.route('/portfolios', portfoliosRouter);
api.route('/transactions', transactionsRouter);
api.route('/positions', positionsRouter);
api.route('/market', marketRouter);
api.route('/import', importRouter);
api.route('/assets', assetsRouter);
api.route('/settings', settingsRouter);

app.route('/api', api);

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = parseInt(process.env.PORT ?? '3001');
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
