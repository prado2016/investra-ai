// API-specific types for Yahoo Finance integration

export interface YahooFinanceQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  eps?: number;
  beta?: number;
  currency: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  lastUpdated: Date;
}

export interface YahooFinanceHistoricalData {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
  cached?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export interface YahooFinanceOptions {
  period1?: string | Date;
  period2?: string | Date;
  interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo';
  events?: 'history' | 'div' | 'split';
}
