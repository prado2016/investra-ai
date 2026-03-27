import { Hono } from 'hono';
import { decisionQueries } from '../db/queries/decisions.js';
import { buildDecisionSnapshot } from '../lib/decisionSnapshot.js';
import { getDecisionDeskCapabilities, createDecisionDeskReviewSession } from '../lib/decisionDeskClient.js';
import { getPortfolioScope } from '../lib/portfolioScope.js';
import { syncDecisionRun } from '../lib/decisionSync.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

function parseSnapshot(snapshotJson: string) {
  return JSON.parse(snapshotJson) as unknown;
}

async function getOwnedRun(userId: string, runId: string) {
  return decisionQueries.getRunByUser(userId, runId);
}

app.get('/runs', async (c) => {
  const user = c.get('user');
  const portfolioId = c.req.query('portfolioId');
  if (!portfolioId) return c.json({ error: 'portfolioId is required' }, 400);

  const scope = await getPortfolioScope(user.id, portfolioId);
  if (!scope) return c.json({ error: 'Not found' }, 404);

  const runs = await decisionQueries.listRunsByPortfolio(user.id, scope.portfolio.id);
  return c.json(runs.map((run) => ({
    ...run,
    snapshot: parseSnapshot(run.snapshotJson),
  })));
});

app.post('/runs', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ portfolioId?: string; idempotencyKey?: string }>();
  if (!body.portfolioId) return c.json({ error: 'portfolioId is required' }, 400);

  const scope = await getPortfolioScope(user.id, body.portfolioId);
  if (!scope) return c.json({ error: 'Not found' }, 404);
  if (scope.portfolio.parentPortfolioId) {
    return c.json({ error: 'Decisions can only run for a master portfolio' }, 400);
  }

  const requestIdempotencyKey = body.idempotencyKey?.trim() || crypto.randomUUID();
  const existing = await decisionQueries.findRunByIdempotencyKey(user.id, requestIdempotencyKey);
  if (existing) {
    return c.json({
      ...existing,
      snapshot: parseSnapshot(existing.snapshotJson),
    });
  }

  const { snapshot, snapshotJson, snapshotHash } = await buildDecisionSnapshot({
    user,
    scope,
  });

  const run = await decisionQueries.createRun({
    userId: user.id,
    portfolioId: scope.portfolio.id,
    requestIdempotencyKey,
    snapshotJson,
    snapshotHash,
    schemaVersion: snapshot.schema_version,
    status: 'pending_submission',
  });

  try {
    const capabilities = await getDecisionDeskCapabilities();
    if (!(capabilities.supported_portfolio_review_request_versions ?? []).includes(snapshot.schema_version)) {
      const failed = await decisionQueries.markRunFailed(
        run.id,
        `Decision desk does not support request schema ${snapshot.schema_version}`
      );
      return c.json({
        ...failed,
        snapshot,
      }, 502);
    }

    const accepted = await createDecisionDeskReviewSession({
      idempotencyKey: requestIdempotencyKey,
      snapshot,
    });

    const updated = await decisionQueries.updateRun(run.id, {
      externalSessionId: accepted.review_session_id,
      acceptedAt: new Date(accepted.accepted_at),
      status: 'accepted',
      errorMessage: null,
    });

    return c.json({
      ...updated,
      snapshot,
    }, 201);
  } catch (error) {
    const failed = await decisionQueries.markRunFailed(
      run.id,
      error instanceof Error ? error.message : 'Decision desk request failed'
    );
    return c.json({
      ...failed,
      snapshot,
    }, 502);
  }
});

app.get('/runs/:id', async (c) => {
  const user = c.get('user');
  const run = await getOwnedRun(user.id, c.req.param('id'));
  if (!run) return c.json({ error: 'Not found' }, 404);

  return c.json({
    ...run,
    snapshot: parseSnapshot(run.snapshotJson),
  });
});

app.post('/runs/:id/sync', async (c) => {
  const user = c.get('user');
  const run = await getOwnedRun(user.id, c.req.param('id'));
  if (!run) return c.json({ error: 'Not found' }, 404);
  if (!run.externalSessionId) return c.json({ error: 'Run has not been accepted by the decision desk yet' }, 400);

  try {
    const result = await syncDecisionRun(run.id);
    const updated = await getOwnedRun(user.id, run.id);
    return c.json({
      run: updated,
      result,
    });
  } catch (error) {
    const updated = await decisionQueries.markRunFailed(
      run.id,
      error instanceof Error ? error.message : 'Decision sync failed',
      'partial_error'
    );
    return c.json({
      run: updated,
      error: updated.errorMessage,
    }, 502);
  }
});

app.get('/runs/:id/events', async (c) => {
  const user = c.get('user');
  const run = await getOwnedRun(user.id, c.req.param('id'));
  if (!run) return c.json({ error: 'Not found' }, 404);

  const events = await decisionQueries.listEvents(run.id);
  return c.json(events.map((event) => ({
    ...event,
    payload: JSON.parse(event.payloadJson) as unknown,
  })));
});

app.get('/runs/:id/insights', async (c) => {
  const user = c.get('user');
  const run = await getOwnedRun(user.id, c.req.param('id'));
  if (!run) return c.json({ error: 'Not found' }, 404);
  return c.json(await decisionQueries.listInsights(run.id));
});

export default app;
