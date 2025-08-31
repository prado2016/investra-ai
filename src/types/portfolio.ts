// Duplicate types to avoid module resolution issues
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

export type OptionStrategyType = 
  | 'covered_call'
  | 'naked_call'
  | 'cash_secured_put'
  | 'protective_put'
  | 'long_call'
  | 'long_put'
  | 'collar'
  | 'straddle'
  | 'strangle'
  | 'iron_condor'
  | 'butterfly'
  | 'calendar_spread';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';
export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';

// Fund Movement Types
export type FundMovementType = 'conversion' | 'withdraw' | 'deposit' | 'transfer';
export type FundMovementStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// Fund Movement Interface
export interface FundMovement {
  id: string;
  portfolioId: string;
  type: FundMovementType;
  status: FundMovementStatus;
  date: Date;
  
  // Common fields
  amount: number;
  currency: Currency;
  fees?: number;
  notes?: string;
  
  // For conversions
  originalAmount?: number;
  originalCurrency?: Currency;
  convertedAmount?: number;
  convertedCurrency?: Currency;
  exchangeRate?: number;
  exchangeFees?: number;
  account?: string;
  
  // For transfers, withdrawals, deposits
  fromAccount?: string;
  toAccount?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Transaction Interface
export interface Transaction {
  id: string;
  portfolioId: string;
  assetId: string;
  assetSymbol: string;
  assetType: AssetType;
  type: TransactionType;
  quantity: number;
  price: number;
  totalAmount: number; // price * quantity + fees
  fees?: number;
  currency: Currency;
  date: Date;
  notes?: string;
  
  // For options
  strikePrice?: number;
  expirationDate?: Date;
  optionType?: 'call' | 'put';
  strategyType?: OptionStrategyType;
  
  // For forex
  exchangeRate?: number;
  
  // For dividends
  dividendPerShare?: number;
  
  // For stock splits
  splitRatio?: number; // e.g., 2 for 2:1 split
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source?: string; // Manual, API, Import, etc.
}

// Position Interface
export interface Position {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName?: string;
  assetType: AssetType;
  quantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentMarketValue: number;
  currentPrice?: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  currency: Currency;
  
  // Position dates
  openDate: Date;
  lastTransactionDate: Date;
  
  // Cost basis method used
  costBasisMethod: CostBasisMethod;
  
  // For tracking individual lots (FIFO, LIFO, Specific Lot)
  lots: PositionLot[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Individual lot for detailed cost basis tracking
export interface PositionLot {
  id: string;
  transactionId: string;
  quantity: number;
  costBasis: number;
  purchaseDate: Date;
  remainingQuantity: number; // After partial sales
}

// Portfolio Interface
export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  currency: Currency; // Base currency for the portfolio
  
  // Portfolio metrics
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  totalRealizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  
  // Cash balance
  cashBalance: number;
  
  // Positions in this portfolio
  positions: Position[];
  
  // Asset allocation
  assetAllocation: AssetAllocation[];
  
  // Performance tracking
  dailyPL: number;
  weeklyPL: number;
  monthlyPL: number;
  yearlyPL: number;
  
  // Risk metrics
  beta?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  owner?: string;
}

// Asset allocation breakdown
export interface AssetAllocation {
  assetType: AssetType;
  value: number;
  percentage: number;
  count: number; // Number of positions of this type
}

// Daily portfolio snapshot for historical tracking
export interface PortfolioSnapshot {
  id: string;
  portfolioId: string;
  date: Date;
  totalValue: number;
  totalCostBasis: number;
  unrealizedPL: number;
  realizedPL: number;
  cashBalance: number;
  positionCount: number;
  assetAllocation: AssetAllocation[];
}

// Performance metrics over time
export interface PerformanceMetrics {
  portfolioId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn?: number;
  
  // Risk metrics
  volatility: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  beta?: number;
  
  // Benchmarking
  benchmarkReturn?: number;
  alpha?: number;
  
  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}
