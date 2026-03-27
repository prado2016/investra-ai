import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Users (managed by better-auth — we define the table so Drizzle knows it)
// ---------------------------------------------------------------------------
export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// better-auth sessions table
export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// better-auth accounts table (for OAuth, not used now but required by better-auth)
export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// better-auth verifications table
export const verifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// Portfolios
// ---------------------------------------------------------------------------
export const portfolios = sqliteTable('portfolios', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentPortfolioId: text('parent_portfolio_id'),
  currency: text('currency').notNull().default('USD'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  foreignKey({
    columns: [t.parentPortfolioId],
    foreignColumns: [t.id],
  }).onDelete('cascade'),
]);

// ---------------------------------------------------------------------------
// Assets (financial instruments)
// ---------------------------------------------------------------------------
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  assetType: text('asset_type', {
    enum: ['stock', 'etf', 'option', 'crypto', 'reit', 'forex', 'other'],
  }).notNull().default('stock'),
  exchange: text('exchange'),
  currency: text('currency').notNull().default('USD'),
});

// ---------------------------------------------------------------------------
// Transactions (source of truth)
// ---------------------------------------------------------------------------
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  portfolioId: text('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id),
  type: text('type', {
    enum: ['buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out'],
  }).notNull(),
  quantity: real('quantity').notNull(),
  price: real('price').notNull(),
  fees: real('fees').notNull().default(0),
  date: text('date').notNull(), // ISO date string YYYY-MM-DD
  notes: text('notes'),
  // Options-specific
  strikePrice: real('strike_price'),
  expirationDate: text('expiration_date'),
  optionType: text('option_type', { enum: ['call', 'put'] }),
  // Source of this transaction
  source: text('source', { enum: ['manual', 'csv', 'email'] }).notNull().default('manual'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// Positions (computed, updated after each transaction)
// ---------------------------------------------------------------------------
export const positions = sqliteTable('positions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  portfolioId: text('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id),
  quantity: real('quantity').notNull().default(0),
  avgCostBasis: real('avg_cost_basis').notNull().default(0),
  realizedPl: real('realized_pl').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex('positions_portfolio_asset_idx').on(t.portfolioId, t.assetId),
]);

// ---------------------------------------------------------------------------
// Email Configurations
// ---------------------------------------------------------------------------
export const emailConfigs = sqliteTable('email_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('custom'),
  imapHost: text('imap_host').notNull(),
  imapPort: integer('imap_port').notNull().default(993),
  emailAddress: text('email_address').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  defaultPortfolioId: text('default_portfolio_id').references(() => portfolios.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex('email_configs_user_idx').on(t.userId),
]);

// ---------------------------------------------------------------------------
// Email Processing Logs
// ---------------------------------------------------------------------------
export const emailLogs = sqliteTable('email_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emailConfigId: text('email_config_id').references(() => emailConfigs.id),
  subject: text('subject'),
  fromAddress: text('from_address'),
  status: text('status', { enum: ['pending', 'processed', 'failed', 'skipped'] }).notNull().default('pending'),
  transactionsCreated: integer('transactions_created').notNull().default(0),
  errorMessage: text('error_message'),
  processedAt: integer('processed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// Decision Desk Integration
// ---------------------------------------------------------------------------
export const decisionRuns = sqliteTable('decision_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portfolioId: text('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  externalSessionId: text('external_session_id'),
  requestIdempotencyKey: text('request_idempotency_key').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  snapshotHash: text('snapshot_hash').notNull(),
  schemaVersion: text('schema_version').notNull().default('1.0'),
  status: text('status', {
    enum: ['pending_submission', 'accepted', 'syncing', 'complete', 'partial_error', 'failed'],
  }).notNull().default('pending_submission'),
  requestedAt: integer('requested_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  syncCursorEventId: text('sync_cursor_event_id'),
  syncCursorCreatedAt: text('sync_cursor_created_at'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
}, (t) => [
  uniqueIndex('decision_runs_user_idempotency_idx').on(t.userId, t.requestIdempotencyKey),
  index('decision_runs_snapshot_hash_idx').on(t.userId, t.portfolioId, t.snapshotHash),
]);

export const decisionEvents = sqliteTable('decision_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  decisionRunId: text('decision_run_id').notNull().references(() => decisionRuns.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull(),
  schemaVersion: text('schema_version').notNull(),
  source: text('source', { enum: ['runtime', 'academy', 'manual_test'] }).notNull().default('runtime'),
  reviewSessionId: text('review_session_id').notNull(),
  portfolioId: text('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  createdAt: text('created_at').notNull(),
  sessionId: text('session_id'),
  cycleId: text('cycle_id'),
  proposalId: text('proposal_id'),
  decisionId: text('decision_id'),
  executionOrderId: text('execution_order_id'),
  positionId: text('position_id'),
  jobId: text('job_id'),
  instrument: text('instrument'),
  side: text('side'),
  action: text('action'),
  provider: text('provider'),
  model: text('model'),
  requestedByUserId: text('requested_by_user_id'),
  payloadJson: text('payload_json').notNull(),
  ingestedAt: integer('ingested_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex('decision_events_event_id_idx').on(t.eventId),
  index('decision_events_run_created_idx').on(t.decisionRunId, t.createdAt),
  index('decision_events_review_created_idx').on(t.reviewSessionId, t.createdAt, t.eventId),
]);

export const decisionInsights = sqliteTable('decision_insights', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  decisionRunId: text('decision_run_id').notNull().references(() => decisionRuns.id, { onDelete: 'cascade' }),
  portfolioId: text('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => portfolios.id, { onDelete: 'set null' }),
  assetId: text('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  symbol: text('symbol'),
  insightType: text('insight_type', {
    enum: ['portfolio_warning', 'position_suggestion', 'portfolio_recommendation'],
  }).notNull(),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  confidence: real('confidence'),
  recommendedAction: text('recommended_action'),
  status: text('status', { enum: ['active', 'dismissed'] }).notNull().default('active'),
  sourceEventId: text('source_event_id').references(() => decisionEvents.eventId, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
