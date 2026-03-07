import { sql } from 'drizzle-orm';
import {
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
  currency: text('currency').notNull().default('USD'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

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
