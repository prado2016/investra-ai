// Import directly from source to avoid any module resolution issues
import type { PropertySector, BaseAsset as CommonBaseAsset } from './common';

// Re-export asset specific interfaces only, not the base types
export interface Stock extends CommonBaseAsset {
  assetType: 'stock';
  sector?: string;
  industry?: string;
  dividendYield?: number;
  peRatio?: number;
  eps?: number; // Earnings per share
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

// Option Asset Interface  
export interface Option extends CommonBaseAsset {
  assetType: 'option';
  underlyingSymbol: string;
  strikePrice: number;
  expirationDate: Date;
  optionType: 'call' | 'put';
  contractSize: number; // Usually 100 for equity options
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

// Forex Asset Interface
export interface Forex extends CommonBaseAsset {
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

// Cryptocurrency Asset Interface
export interface Cryptocurrency extends CommonBaseAsset {
  assetType: 'crypto';
  blockchain: string;
  totalSupply?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  rank?: number; // Market cap rank
  allTimeHigh?: number;
  allTimeLow?: number;
  priceChange24h?: number;
  priceChangePercent24h?: number;
  volumeChange24h?: number;
  dominance?: number; // Market dominance percentage
  hashRate?: number;
  difficulty?: number;
  blockTime?: number;
  networkFees?: number;
}

// REIT Asset Interface
export interface REIT extends CommonBaseAsset {
  assetType: 'reit';
  propertySector: PropertySector;
  dividendYield: number;
  fundsFromOperations?: number; // FFO
  adjustedFundsFromOperations?: number; // AFFO
  netAssetValue?: number; // NAV
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

// Union type for all asset types
export type Asset = Stock | Option | Forex | Cryptocurrency | REIT | ETF;

// ETF Asset Interface
export interface ETF extends CommonBaseAsset {
  assetType: 'etf';
  category: 'equity' | 'bond' | 'commodity' | 'international' | 'sector' | 'theme' | 'balanced';
  expenseRatio?: number;
  dividendYield?: number;
  aum?: number; // Assets under management
  inceptionDate?: Date;
  issuer?: string; // e.g., Vanguard, iShares, SPDR
  trackingIndex?: string; // e.g., S&P 500, NASDAQ-100
  totalReturn1Year?: number;
  totalReturn3Year?: number;
  totalReturn5Year?: number;
  beta?: number;
  sharpeRatio?: number;
  standardDeviation?: number;
  top10Holdings?: string[];
  sectorAllocation?: Record<string, number>;
  geographicAllocation?: Record<string, number>;
  averageVolume?: number;
  premiumDiscount?: number; // Premium/discount to NAV
  lastDistributionDate?: Date;
  distributionFrequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
}
