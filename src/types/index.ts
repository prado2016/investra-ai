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
