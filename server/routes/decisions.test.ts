// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../middleware/requireAuth.js';

vi.mock('../db/queries/decisions.js', () => ({
  decisionQueries: {
    createRun: vi.fn(),
    updateRun: vi.fn(),
    getRun: vi.fn(),
    getRunByUser: vi.fn(),
    findRunByIdempotencyKey: vi.fn(),
    listRunsByPortfolio: vi.fn(),
    listEvents: vi.fn(),
    replaceInsights: vi.fn(),
    listInsights: vi.fn(),
    markRunFailed: vi.fn(),
    insertEvent: vi.fn(),
  },
}));

vi.mock('../lib/decisionSnapshot.js', () => ({
  buildDecisionSnapshot: vi.fn(),
}));

vi.mock('../lib/decisionDeskClient.js', () => ({
  getDecisionDeskCapabilities: vi.fn(),
  createDecisionDeskReviewSession: vi.fn(),
}));

vi.mock('../lib/portfolioScope.js', () => ({
  getPortfolioScope: vi.fn(),
}));

vi.mock('../lib/decisionSync.js', () => ({
  syncDecisionRun: vi.fn(),
}));

import { decisionQueries } from '../db/queries/decisions.js';
import { buildDecisionSnapshot } from '../lib/decisionSnapshot.js';
import { createDecisionDeskReviewSession, getDecisionDeskCapabilities } from '../lib/decisionDeskClient.js';
import { getPortfolioScope } from '../lib/portfolioScope.js';
import decisionsRouter from './decisions.js';

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
  app.route('/decisions', decisionsRouter);
  return app;
}

const MASTER_SCOPE = {
  portfolio: {
    id: 'portfolio-1',
    userId: TEST_USER.id,
    name: 'Main',
    parentPortfolioId: null,
    currency: 'USD',
    isDefault: true,
    createdAt: new Date(),
  },
  portfolioIds: ['portfolio-1', 'portfolio-2'],
  childPortfolios: [],
  isAggregate: true,
};

describe('decision routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects decision runs for child portfolios', async () => {
    vi.mocked(getPortfolioScope).mockResolvedValue({
      ...MASTER_SCOPE,
      portfolio: {
        ...MASTER_SCOPE.portfolio,
        id: 'portfolio-child',
        parentPortfolioId: 'portfolio-1',
      },
      portfolioIds: ['portfolio-child'],
      isAggregate: false,
    });

    const app = createApp();
    const response = await app.request('/decisions/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId: 'portfolio-child', idempotencyKey: 'idem-1' }),
    });

    expect(response.status).toBe(400);
    expect(buildDecisionSnapshot).not.toHaveBeenCalled();
  });

  it('returns the existing run for a repeated idempotency key', async () => {
    vi.mocked(getPortfolioScope).mockResolvedValue(MASTER_SCOPE);
    vi.mocked(decisionQueries.findRunByIdempotencyKey).mockResolvedValue({
      id: 'run-1',
      userId: TEST_USER.id,
      portfolioId: 'portfolio-1',
      externalSessionId: 'desk-1',
      requestIdempotencyKey: 'idem-1',
      snapshotJson: '{"schema_version":"1.0"}',
      snapshotHash: 'hash-1',
      schemaVersion: '1.0',
      status: 'accepted',
      requestedAt: new Date(),
      acceptedAt: new Date(),
      lastSyncedAt: null,
      syncCursorEventId: null,
      syncCursorCreatedAt: null,
      completedAt: null,
      errorMessage: null,
    });

    const app = createApp();
    const response = await app.request('/decisions/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId: 'portfolio-1', idempotencyKey: 'idem-1' }),
    });

    expect(response.status).toBe(200);
    expect(buildDecisionSnapshot).not.toHaveBeenCalled();
    expect(createDecisionDeskReviewSession).not.toHaveBeenCalled();
  });

  it('marks the run failed when the desk does not support the request schema', async () => {
    vi.mocked(getPortfolioScope).mockResolvedValue(MASTER_SCOPE);
    vi.mocked(decisionQueries.findRunByIdempotencyKey).mockResolvedValue(undefined);
    vi.mocked(buildDecisionSnapshot).mockResolvedValue({
      snapshot: {
        schema_version: '1.0',
        portfolio_id: 'portfolio-1',
        portfolio_name: 'Main',
        as_of: new Date().toISOString(),
        base_currency: 'USD',
        requested_by_user_id: TEST_USER.id,
        requested_by_user_email: TEST_USER.email,
        accounts: [],
        positions: [],
        recent_transactions: [],
        constraints: {
          mode: 'read_only',
          allow_trade_execution: false,
        },
      },
      snapshotJson: '{"schema_version":"1.0"}',
      snapshotHash: 'hash-1',
    });
    vi.mocked(decisionQueries.createRun).mockResolvedValue({
      id: 'run-2',
      userId: TEST_USER.id,
      portfolioId: 'portfolio-1',
      externalSessionId: null,
      requestIdempotencyKey: 'idem-2',
      snapshotJson: '{"schema_version":"1.0"}',
      snapshotHash: 'hash-1',
      schemaVersion: '1.0',
      status: 'pending_submission',
      requestedAt: new Date(),
      acceptedAt: null,
      lastSyncedAt: null,
      syncCursorEventId: null,
      syncCursorCreatedAt: null,
      completedAt: null,
      errorMessage: null,
    });
    vi.mocked(getDecisionDeskCapabilities).mockResolvedValue({
      desk_version: '0.1.0',
      health_status: 'ok',
      supported_decision_output_schema_versions: ['1.0'],
      supported_portfolio_review_request_versions: ['2.0'],
      supported_event_types: ['proposal.created'],
      default_source: 'runtime',
    });
    vi.mocked(decisionQueries.markRunFailed).mockResolvedValue({
      id: 'run-2',
      userId: TEST_USER.id,
      portfolioId: 'portfolio-1',
      externalSessionId: null,
      requestIdempotencyKey: 'idem-2',
      snapshotJson: '{"schema_version":"1.0"}',
      snapshotHash: 'hash-1',
      schemaVersion: '1.0',
      status: 'failed',
      requestedAt: new Date(),
      acceptedAt: null,
      lastSyncedAt: new Date(),
      syncCursorEventId: null,
      syncCursorCreatedAt: null,
      completedAt: null,
      errorMessage: 'Decision desk does not support request schema 1.0',
    });

    const app = createApp();
    const response = await app.request('/decisions/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId: 'portfolio-1', idempotencyKey: 'idem-2' }),
    });

    expect(response.status).toBe(502);
    expect(decisionQueries.markRunFailed).toHaveBeenCalledWith(
      'run-2',
      'Decision desk does not support request schema 1.0',
    );
  });
});
