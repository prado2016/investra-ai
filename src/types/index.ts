// ---------------------------------------------------------------------------
// Core domain types (mirror the DB schema)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  parentPortfolioId?: string | null;
  currency: string;
  isDefault: boolean;
  createdAt: string;
}

export type AssetType = 'stock' | 'etf' | 'option' | 'crypto' | 'reit' | 'forex' | 'other';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  exchange?: string;
  currency: string;
}

export type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';
export type TransactionSource = 'manual' | 'csv' | 'email';

export interface Transaction {
  id: string;
  portfolioId: string;
  portfolioName: string;
  assetId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  strikePrice?: number;
  expirationDate?: string;
  optionType?: 'call' | 'put';
  source: TransactionSource;
  createdAt: string;
  // Joined from assets
  symbol: string;
  assetName: string;
  assetType: AssetType;
}

export interface Position {
  id: string;
  portfolioId: string;
  assetId: string;
  quantity: number;
  avgCostBasis: number;
  realizedPl: number;
  updatedAt: string;
  // Joined from assets
  symbol: string;
  assetName: string;
  assetType: AssetType;
  currency: string;
  // Enriched client-side from market data
  currentPrice?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
  marketValue?: number;
  unrealizedPl?: number;
  unrealizedPlPercent?: number;
}

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
}

export type QuoteMap = Record<string, Quote>;

export interface EmailConfig {
  id: string;
  userId: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  emailAddress: string;
  defaultPortfolioId?: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  userId: string;
  subject?: string;
  fromAddress?: string;
  status: 'pending' | 'processed' | 'failed' | 'skipped';
  transactionsCreated: number;
  errorMessage?: string;
  processedAt: string;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export type DecisionSource = 'runtime' | 'academy' | 'manual_test';
export type DecisionRunStatus =
  | 'pending_submission'
  | 'accepted'
  | 'syncing'
  | 'complete'
  | 'partial_error'
  | 'failed';

export interface PortfolioReviewRequest {
  schema_version: string;
  portfolio_id: string;
  portfolio_name: string;
  as_of: string;
  base_currency: string;
  requested_by_user_id: string;
  requested_by_user_email: string;
  accounts: Array<{
    account_id: string;
    account_name: string;
    account_type: 'master' | 'child';
    parent_account_id: string | null;
    currency: string;
  }>;
  positions: Array<{
    portfolio_id: string;
    account_id: string;
    asset_id: string;
    symbol: string;
    asset_type: string;
    quantity: number;
    avg_cost_basis: number;
    market_value: number | null;
    unrealized_pl: number | null;
    strike_price: number | null;
    expiration_date: string | null;
    option_type: 'call' | 'put' | null;
  }>;
  recent_transactions: Array<{
    id: string;
    account_id: string;
    symbol: string;
    type: string;
    quantity: number;
    price: number;
    fees: number;
    trade_date: string;
    source: string;
  }>;
  constraints: {
    mode: 'read_only';
    allow_trade_execution: false;
  };
}

export interface DecisionRun {
  id: string;
  userId: string;
  portfolioId: string;
  externalSessionId?: string | null;
  requestIdempotencyKey: string;
  snapshotJson: string;
  snapshotHash: string;
  schemaVersion: string;
  status: DecisionRunStatus;
  requestedAt: string;
  acceptedAt?: string | null;
  lastSyncedAt?: string | null;
  syncCursorEventId?: string | null;
  syncCursorCreatedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  snapshot?: PortfolioReviewRequest;
}

export interface DecisionEvent {
  id: string;
  decisionRunId: string;
  eventId: string;
  schemaVersion: string;
  source: DecisionSource;
  reviewSessionId: string;
  portfolioId: string;
  eventType: string;
  createdAt: string;
  sessionId?: string | null;
  cycleId?: string | null;
  proposalId?: string | null;
  decisionId?: string | null;
  executionOrderId?: string | null;
  positionId?: string | null;
  jobId?: string | null;
  instrument?: string | null;
  side?: string | null;
  action?: string | null;
  provider?: string | null;
  model?: string | null;
  requestedByUserId?: string | null;
  payload: Record<string, unknown>;
  ingestedAt: string;
}

export interface DecisionInsight {
  id: string;
  decisionRunId: string;
  portfolioId: string;
  accountId?: string | null;
  assetId?: string | null;
  symbol?: string | null;
  insightType: 'portfolio_warning' | 'position_suggestion' | 'portfolio_recommendation';
  headline: string;
  summary: string;
  confidence?: number | null;
  recommendedAction?: string | null;
  status: 'active' | 'dismissed';
  sourceEventId?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API request/response shapes
// ---------------------------------------------------------------------------

export interface NewTransactionPayload {
  portfolioId: string;
  symbol: string;
  assetName?: string;
  assetType?: AssetType;
  type: TransactionType;
  quantity: number;
  price: number;
  fees?: number;
  date: string;
  notes?: string;
  strikePrice?: number;
  expirationDate?: string;
  optionType?: 'call' | 'put';
}

export interface CsvImportRow {
  symbol: string;
  assetName?: string;
  assetType?: AssetType;
  type: TransactionType;
  quantity: number;
  price: number;
  fees?: number;
  date: string;
  notes?: string;
}

export interface SyncResult {
  processed: number;
  created: number;
  failed: number;
  errors: string[];
  primaryImportedPortfolioId?: string;
}

export interface SyncTask {
  userId: string;
  portfolioId: string;
  status: 'connecting' | 'syncing' | 'done' | 'error';
  total: number;
  processed: number;
  created: number;
  failed: number;
  errors: string[];
  primaryImportedPortfolioId?: string;
  startedAt: number;
  completedAt?: number;
}

export interface DecisionSyncResult {
  run: DecisionRun;
  result?: {
    fetched: number;
    matched: number;
    inserted: number;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Dashboard computed types
// ---------------------------------------------------------------------------

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  unrealizedPl: number;
  unrealizedPlPercent: number;
  realizedPl: number;
  dailyChange: number;
  dailyChangePercent: number;
  positionCount: number;
}
