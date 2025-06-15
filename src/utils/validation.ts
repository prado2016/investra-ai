// Inline types to avoid import issues
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';

interface BaseAsset {
  id: string;
  symbol: string;
  name: string;
  currency: Currency;
  exchange?: string;
  marketCap?: number;
  lastPrice?: number;
  priceUpdateTimestamp?: Date;
  notes?: string;
  tags?: string[];
}

interface Stock extends BaseAsset {
  assetType: 'stock';
  sector?: string;
  industry?: string;
  dividendYield?: number;
  peRatio?: number;
  eps?: number;
  beta?: number;
  averageVolume?: number;
  shares?: number;
  bookValue?: number;
  priceToBook?: number;
  operatingMargin?: number;
  returnOnEquity?: number;
  revenue?: number;
  grossProfit?: number;
  earningsGrowth?: number;
  revenueGrowth?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  exDividendDate?: Date;
  dividendDate?: Date;
  lastEarningsDate?: Date;
  nextEarningsDate?: Date;
}

interface Option extends BaseAsset {
  assetType: 'option';
  underlyingSymbol: string;
  strikePrice: number;
  expirationDate: Date;
  optionType: 'call' | 'put';
  contractSize: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  openInterest?: number;
  intrinsicValue?: number;
  timeValue?: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
}

interface Forex extends BaseAsset {
  assetType: 'forex';
  baseCurrency: string;
  quoteCurrency: string;
  spread?: number;
  pipValue?: number;
  marginRequirement?: number;
  leverage?: number;
  swapRateLong?: number;
  swapRateShort?: number;
  sessionHigh?: number;
  sessionLow?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
}

interface Cryptocurrency extends BaseAsset {
  assetType: 'crypto';
  blockchain: string;
  totalSupply?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  rank?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  priceChange24h?: number;
  priceChangePercent24h?: number;
  volumeChange24h?: number;
  dominance?: number;
  hashRate?: number;
  difficulty?: number;
  blockTime?: number;
  networkFees?: number;
}

interface REIT extends BaseAsset {
  assetType: 'reit';
  propertySector: 'residential' | 'commercial' | 'industrial' | 'retail' | 'office' | 'healthcare' | 'hotel' | 'storage' | 'data_center' | 'mixed';
  dividendYield: number;
  fundsFromOperations?: number;
  adjustedFundsFromOperations?: number;
  netAssetValue?: number;
  priceToNAV?: number;
  debtToEquity?: number;
  occupancyRate?: number;
  averageLeaseLength?: number;
  geographicFocus?: string[];
  propertyCount?: number;
  totalSquareFootage?: number;
  revenuePerSquareFoot?: number;
  managementCompany?: string;
  distributionFrequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  lastDistributionDate?: Date;
  nextDistributionDate?: Date;
  distributionYield?: number;
  ffoPerShare?: number;
  affoPerShare?: number;
}

type Asset = Stock | Option | Forex | Cryptocurrency | REIT;

// Portfolio types inline to avoid import issues
type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'option_expired';
type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';

interface Transaction {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetType: AssetType;
  type: TransactionType;
  quantity: number;
  price: number;
  totalAmount: number;
  fees?: number;
  currency: Currency;
  date: Date;
  notes?: string;
  strikePrice?: number;
  expirationDate?: Date;
  optionType?: 'call' | 'put';
  exchangeRate?: number;
  dividendPerShare?: number;
  splitRatio?: number;
  createdAt: Date;
  updatedAt: Date;
  source?: string;
}

interface PositionLot {
  id: string;
  transactionId: string;
  quantity: number;
  costBasis: number;
  purchaseDate: Date;
  remainingQuantity: number;
}

interface Position {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetType: AssetType;
  quantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentMarketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  currency: Currency;
  openDate: Date;
  lastTransactionDate: Date;
  costBasisMethod: CostBasisMethod;
  lots: PositionLot[];
  createdAt: Date;
  updatedAt: Date;
}

interface AssetAllocation {
  assetType: AssetType;
  value: number;
  percentage: number;
  count: number;
}

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  currency: Currency;
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  totalRealizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  cashBalance: number;
  positions: Position[];
  assetAllocation: AssetAllocation[];
  dailyPL: number;
  weeklyPL: number;
  monthlyPL: number;
  yearlyPL: number;
  beta?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  owner?: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a stock asset
 */
export function validateStock(stock: Partial<Stock>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!stock.symbol) errors.push('Stock symbol is required');
  if (!stock.name) errors.push('Stock name is required');
  
  // Check if currentPrice is present and valid  
  const currentPrice = (stock as Stock & { currentPrice?: number }).currentPrice;
  if (currentPrice === undefined) {
    errors.push('Current price must be a positive number');
  } else if (typeof currentPrice !== 'number' || currentPrice <= 0) {
    errors.push('Current price must be a positive number');
  }
  
  // Optional field validations
  if (stock.dividendYield !== undefined && (stock.dividendYield < 0 || stock.dividendYield > 50)) {
    warnings.push('Dividend yield seems unusually high or negative');
  }
  
  if (stock.peRatio !== undefined && stock.peRatio < 0) {
    warnings.push('P/E ratio cannot be negative');
  }
  
  if (stock.beta !== undefined && (stock.beta < -5 || stock.beta > 5)) {
    warnings.push('Beta value seems extreme');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate an option asset
 */
export function validateOption(option: Partial<Option>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!option.symbol) errors.push('Option symbol is required');
  if (!option.underlyingSymbol) errors.push('Underlying symbol is required');
  if (typeof option.strikePrice !== 'number' || option.strikePrice <= 0) {
    errors.push('Strike price must be a positive number');
  }
  if (!option.expirationDate) {
    errors.push('Expiration date is required');
  } else if (option.expirationDate <= new Date()) {
    warnings.push('Option has expired or expires today');
  }
  if (!option.optionType || !['call', 'put'].includes(option.optionType)) {
    errors.push('Option type must be either call or put');
  }
  
  // Contract size validation
  if (option.contractSize !== undefined && option.contractSize !== 100) {
    warnings.push('Non-standard contract size detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a forex asset
 */
export function validateForex(forex: Partial<Forex>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!forex.symbol) errors.push('Forex symbol is required');
  if (!forex.baseCurrency) errors.push('Base currency is required');
  if (!forex.quoteCurrency) errors.push('Quote currency is required');
  if (forex.baseCurrency === forex.quoteCurrency) {
    errors.push('Base and quote currencies cannot be the same');
  }
  
  // Price validation
  const currentPrice = (forex as Forex & { currentPrice?: number }).currentPrice;
  if (currentPrice !== undefined && (typeof currentPrice !== 'number' || currentPrice <= 0)) {
    errors.push('Current price must be a positive number');
  }
  
  // Leverage validation
  if (forex.leverage !== undefined && (forex.leverage < 1 || forex.leverage > 1000)) {
    warnings.push('Leverage seems extreme');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a cryptocurrency asset
 */
export function validateCryptocurrency(crypto: Partial<Cryptocurrency>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!crypto.symbol) errors.push('Cryptocurrency symbol is required');
  if (!crypto.blockchain) errors.push('Blockchain is required');
  const currentPrice = (crypto as Cryptocurrency & { currentPrice?: number }).currentPrice;
  if (currentPrice !== undefined && (typeof currentPrice !== 'number' || currentPrice <= 0)) {
    errors.push('Current price must be a positive number');
  }
  
  // Supply validations
  if (crypto.circulatingSupply !== undefined && crypto.totalSupply !== undefined) {
    if (crypto.circulatingSupply > crypto.totalSupply) {
      errors.push('Circulating supply cannot exceed total supply');
    }
  }
  
  if (crypto.totalSupply !== undefined && crypto.maxSupply !== undefined) {
    if (crypto.totalSupply > crypto.maxSupply) {
      errors.push('Total supply cannot exceed max supply');
    }
  }
  
  // Rank validation
  if (crypto.rank !== undefined && crypto.rank < 1) {
    errors.push('Market cap rank must be positive');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a REIT asset
 */
export function validateREIT(reit: Partial<REIT>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!reit.symbol) errors.push('REIT symbol is required');
  if (!reit.propertySector) errors.push('Property sector is required');
  if (typeof reit.dividendYield !== 'number') {
    errors.push('Dividend yield is required for REITs');
  } else if (reit.dividendYield < 0 || reit.dividendYield > 50) {
    warnings.push('Dividend yield seems extreme for a REIT');
  }
  
  // REIT-specific validations
  if (reit.occupancyRate !== undefined && (reit.occupancyRate < 0 || reit.occupancyRate > 100)) {
    errors.push('Occupancy rate must be between 0 and 100');
  }
  
  if (reit.priceToNAV !== undefined && reit.priceToNAV < 0) {
    warnings.push('Price to NAV ratio is negative');
  }
  
  if (reit.debtToEquity !== undefined && reit.debtToEquity > 10) {
    warnings.push('Debt to equity ratio seems very high for a REIT');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate any asset based on its type
 */
export function validateAsset(asset: Partial<Asset>): ValidationResult {
  if (!asset.assetType) {
    return {
      isValid: false,
      errors: ['Asset type is required'],
      warnings: []
    };
  }
  
  switch (asset.assetType) {
    case 'stock':
      return validateStock(asset as Partial<Stock>);
    case 'option':
      return validateOption(asset as Partial<Option>);
    case 'forex':
      return validateForex(asset as Partial<Forex>);
    case 'crypto':
      return validateCryptocurrency(asset as Partial<Cryptocurrency>);
    case 'reit':
      return validateREIT(asset as Partial<REIT>);
    default:
      return {
        isValid: false,
        errors: [`Unknown asset type: ${asset.assetType}`],
        warnings: []
      };
  }
}

/**
 * Validate a transaction
 */
export function validateTransaction(transaction: Partial<Transaction>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!transaction.assetSymbol) errors.push('Asset symbol is required');
  if (!transaction.type) errors.push('Transaction type is required');
  if (typeof transaction.quantity !== 'number' || transaction.quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }
  if (typeof transaction.price !== 'number' || transaction.price <= 0) {
    errors.push('Price must be a positive number');
  }
  if (!transaction.date) errors.push('Transaction date is required');
  
  // Fee validation
  if (transaction.fees !== undefined && transaction.fees < 0) {
    errors.push('Fees cannot be negative');
  }
  
  // Total amount validation
  if (transaction.totalAmount !== undefined && transaction.quantity && transaction.price) {
    const expectedTotal = transaction.quantity * transaction.price + (transaction.fees || 0);
    if (Math.abs(transaction.totalAmount - expectedTotal) > 0.01) {
      warnings.push('Total amount does not match quantity * price + fees');
    }
  }
  
  // Date validation
  if (transaction.date && transaction.date > new Date()) {
    warnings.push('Transaction date is in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a position
 */
export function validatePosition(position: Partial<Position>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!position.assetSymbol) errors.push('Asset symbol is required');
  if (typeof position.quantity !== 'number') errors.push('Quantity is required');
  if (typeof position.averageCostBasis !== 'number' || position.averageCostBasis <= 0) {
    errors.push('Average cost basis must be a positive number');
  }
  
  // Logical validations
  if (position.quantity !== undefined && position.quantity < 0) {
    warnings.push('Position has negative quantity (short position)');
  }
  
  if (position.totalCostBasis !== undefined && position.quantity && position.averageCostBasis) {
    const expectedTotal = Math.abs(position.quantity) * position.averageCostBasis;
    if (Math.abs(position.totalCostBasis - expectedTotal) > 0.01) {
      warnings.push('Total cost basis does not match quantity * average cost basis');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a portfolio
 */
export function validatePortfolio(portfolio: Partial<Portfolio>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!portfolio.name) errors.push('Portfolio name is required');
  if (!portfolio.currency) errors.push('Base currency is required');
  
  // Cash balance validation
  if (portfolio.cashBalance !== undefined && portfolio.cashBalance < 0) {
    warnings.push('Portfolio has negative cash balance');
  }
  
  // Portfolio value validation
  if (portfolio.totalValue !== undefined && portfolio.totalValue < 0) {
    warnings.push('Portfolio has negative total value');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
