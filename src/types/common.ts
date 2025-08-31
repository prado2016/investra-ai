// Common types used across the application

export type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';

export type TransactionType = 
  // Stock trades
  | 'buy' 
  | 'sell'
  
  // Options trading
  | 'buy_to_open'      // BUYTOOPEN - Opening long options position
  | 'sell_to_open'     // SELLTOOPEN - Opening short options position  
  | 'buy_to_close'     // BUYTOCLOSE - Closing short options position
  | 'sell_to_close'    // SELLTOCLOSE - Closing long options position
  
  // Dividends and distributions
  | 'dividend'
  | 'dividend_reinvested'
  
  // Money movements  
  | 'transfer_in'      // TRFIN, CONT - Money transferred into account
  | 'transfer_out'     // TRFOUT - Money transferred out of account
  
  // Fees and interest
  | 'fee'              // INTCHARGED - Account fees
  | 'interest'         // FPLINT - Interest payments
  
  // Stock lending
  | 'loan'             // LOAN - Shares loaned out
  | 'recall'           // RECALL - Shares recalled from loan
  
  // Corporate actions
  | 'split'
  | 'merger' 
  | 'option_expired'
  | 'short_option_expired'
  | 'short_option_assigned'
  
  // Generic (for backward compatibility)
  | 'transfer';

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
