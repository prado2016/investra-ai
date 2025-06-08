// Common types used across the application

export type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';

export type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'merger';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';

export type PropertySector = 
  | 'residential' 
  | 'commercial' 
  | 'industrial' 
  | 'retail' 
  | 'office' 
  | 'healthcare' 
  | 'hotel' 
  | 'storage' 
  | 'data_center' 
  | 'mixed';

export interface BaseAsset {
  id: string;
  symbol: string;
  name: string;
  currency: Currency;
  exchange?: string; // e.g., NASDAQ, NYSE, LSE
  marketCap?: number;
  lastPrice?: number;
  priceUpdateTimestamp?: Date;
  notes?: string;
  tags?: string[];
}

export interface PriceData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}
