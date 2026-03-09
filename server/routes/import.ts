import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { portfolioQueries } from '../db/queries/portfolios.js';
import { transactionQueries } from '../db/queries/transactions.js';
import { recalcPositions, ensureAsset } from '../lib/positions.js';
import { syncEmails } from '../lib/emailProcessor.js';
import { syncStore, syncEmitter } from '../lib/syncStore.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();
type AssetType = 'stock' | 'etf' | 'option' | 'crypto' | 'reit' | 'forex' | 'other';
type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';

// POST /api/import/csv
// Body: { portfolioId, rows: Array<{ symbol, type, quantity, price, fees, date, notes? }> }
app.post('/csv', async (c) => {
  const user = c.get('user');
  const { portfolioId, rows } = await c.req.json<{
    portfolioId: string;
    rows: Array<{
      symbol: string;
      assetName?: string;
      assetType?: AssetType;
      type: TransactionType;
      quantity: number;
      price: number;
      fees?: number;
      date: string;
      notes?: string;
    }>;
  }>();

  const portfolio = portfolioQueries.get(portfolioId);
  if (!portfolio || portfolio.userId !== user.id) return c.json({ error: 'Not found' }, 404);

  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const assetId = await ensureAsset(row.symbol, row.assetName ?? row.symbol, row.assetType);
      await transactionQueries.create({
        portfolioId,
        assetId,
        type: row.type,
        quantity: row.quantity,
        price: row.price,
        fees: row.fees ?? 0,
        date: row.date,
        notes: row.notes,
        source: 'csv',
      });
      created++;
    } catch (err) {
      errors.push(`Row ${created + errors.length + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (created > 0) await recalcPositions(portfolioId);
  return c.json({ created, errors });
});

// POST /api/import/email-sync — start background sync, return immediately
app.post('/email-sync', async (c) => {
  const user = c.get('user');
  const { portfolioId } = await c.req.json<{ portfolioId: string }>();
  const portfolio = portfolioQueries.get(portfolioId);
  if (!portfolio || portfolio.userId !== user.id) return c.json({ error: 'Not found' }, 404);

  // Prevent duplicate syncs
  if (syncStore.isActive(user.id)) {
    return c.json({ error: 'Sync already in progress' }, 409);
  }

  // Initialize sync task
  syncStore.start(user.id, portfolioId);

  // Run sync in background (don't await)
  syncEmails(user.id, portfolioId).catch((err) => {
    syncStore.update(user.id, {
      status: 'error',
      errors: [err instanceof Error ? err.message : String(err)],
      completedAt: Date.now(),
    });
  });

  return c.json({ started: true });
});

// GET /api/import/email-sync/events — SSE stream of sync progress
app.get('/email-sync/events', async (c) => {
  const user = c.get('user');

  return streamSSE(c, async (stream) => {
    const task = syncStore.get(user.id);

    // If no active sync, send current state and close
    if (!task || (task.status !== 'connecting' && task.status !== 'syncing')) {
      await stream.writeSSE({ data: JSON.stringify(task ?? null), event: 'status' });
      return;
    }

    // Send current state immediately
    await stream.writeSSE({ data: JSON.stringify(task), event: 'progress' });

    // Listen for updates
    const onUpdate = async (updated: typeof task) => {
      try {
        await stream.writeSSE({ data: JSON.stringify(updated), event: 'progress' });
      } catch {
        // Stream closed
      }
    };

    const eventKey = `sync:${user.id}`;
    syncEmitter.on(eventKey, onUpdate);

    // Wait until done or stream aborted
    await new Promise<void>((resolve) => {
      const checkDone = (t: typeof task) => {
        if (t.status === 'done' || t.status === 'error') {
          syncEmitter.off(eventKey, onUpdate);
          syncEmitter.off(eventKey, checkDone);
          resolve();
        }
      };
      syncEmitter.on(eventKey, checkDone);

      stream.onAbort(() => {
        syncEmitter.off(eventKey, onUpdate);
        syncEmitter.off(eventKey, checkDone);
        resolve();
      });
    });
  });
});

// GET /api/import/email-sync/status — get current or last sync state
app.get('/email-sync/status', async (c) => {
  const user = c.get('user');
  const task = syncStore.get(user.id);
  return c.json(task ?? null);
});

export default app;
