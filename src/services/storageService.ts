
/**
 * Local Storage Service for Stock Tracker App
 * Provides CRUD operations for transactions, positions, and portfolio data
 * Implements offline-first architecture with data persistence
 */

// Inline types to avoid import issues
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'option_expired';
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';
type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';

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

// Storage keys
const STORAGE_KEYS = {
  POSITIONS: 'stock_tracker_positions',
  TRANSACTIONS: 'stock_tracker_transactions',
  PORTFOLIOS: 'stock_tracker_portfolios',
  SETTINGS: 'stock_tracker_settings',
  CACHE: 'stock_tracker_cache',
  METADATA: 'stock_tracker_metadata'
} as const;

// Metadata for tracking data versions and migrations
interface StorageMetadata {
  version: string;
  lastUpdated: string;
  dataIntegrity: boolean;
}

// Cache structure for API data
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

interface CacheStore {
  [key: string]: CacheEntry;
}

/**
 * Local Storage Service Class
 */
export class StorageService {
  private static instance: StorageService;
  
  private constructor() {
    this.initializeStorage();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize storage with default structure
   */
  private initializeStorage(): void {
    try {
      const metadata = this.getMetadata();
      if (!metadata) {
        this.setMetadata({
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          dataIntegrity: true
        });
      }

      // Initialize empty collections if they don't exist
      if (!this.getItem(STORAGE_KEYS.POSITIONS)) {
        this.setItem(STORAGE_KEYS.POSITIONS, []);
      }
      if (!this.getItem(STORAGE_KEYS.TRANSACTIONS)) {
        this.setItem(STORAGE_KEYS.TRANSACTIONS, []);
      }
      if (!this.getItem(STORAGE_KEYS.PORTFOLIOS)) {
        this.setItem(STORAGE_KEYS.PORTFOLIOS, []);
      }
      if (!this.getItem(STORAGE_KEYS.CACHE)) {
        this.setItem(STORAGE_KEYS.CACHE, {});
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  /**
   * Generic storage operations
   */
  private setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      return false;
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  private removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      return false;
    }
  }

  /**
   * Position CRUD operations
   */
  public getPositions(): Position[] {
    return this.getItem<Position[]>(STORAGE_KEYS.POSITIONS) || [];
  }

  public getPosition(id: string): Position | null {
    const positions = this.getPositions();
    return positions.find(position => position.id === id) || null;
  }

  public savePosition(position: Position): boolean {
    const positions = this.getPositions();
    const existingIndex = positions.findIndex(p => p.id === position.id);
    
    if (existingIndex >= 0) {
      positions[existingIndex] = { ...position, updatedAt: new Date() };
    } else {
      positions.push({ ...position, createdAt: new Date(), updatedAt: new Date() });
    }
    
    return this.setItem(STORAGE_KEYS.POSITIONS, positions);
  }

  public deletePosition(id: string): boolean {
    const positions = this.getPositions();
    const filteredPositions = positions.filter(position => position.id !== id);
    return this.setItem(STORAGE_KEYS.POSITIONS, filteredPositions);
  }

  public updatePosition(id: string, updates: Partial<Position>): boolean {
    const positions = this.getPositions();
    const index = positions.findIndex(position => position.id === id);
    
    if (index >= 0) {
      positions[index] = { 
        ...positions[index], 
        ...updates, 
        updatedAt: new Date() 
      };
      return this.setItem(STORAGE_KEYS.POSITIONS, positions);
    }
    
    return false;
  }

  /**
   * Transaction CRUD operations
   */
  public getTransactions(): Transaction[] {
    return this.getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
  }

  public getTransaction(id: string): Transaction | null {
    const transactions = this.getTransactions();
    return transactions.find(transaction => transaction.id === id) || null;
  }

  public saveTransaction(transaction: Transaction): boolean {
    const transactions = this.getTransactions();
    const existingIndex = transactions.findIndex(t => t.id === transaction.id);
    
    if (existingIndex >= 0) {
      transactions[existingIndex] = { ...transaction, updatedAt: new Date() };
    } else {
      transactions.push({ ...transaction, createdAt: new Date(), updatedAt: new Date() });
    }
    
    return this.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  public deleteTransaction(id: string): boolean {
    const transactions = this.getTransactions();
    const filteredTransactions = transactions.filter(transaction => transaction.id !== id);
    return this.setItem(STORAGE_KEYS.TRANSACTIONS, filteredTransactions);
  }

  public getTransactionsByAsset(assetId: string): Transaction[] {
    const transactions = this.getTransactions();
    return transactions.filter(transaction => transaction.assetId === assetId);
  }

  /**
   * Portfolio CRUD operations
   */
  public getPortfolios(): Portfolio[] {
    return this.getItem<Portfolio[]>(STORAGE_KEYS.PORTFOLIOS) || [];
  }

  public getPortfolio(id: string): Portfolio | null {
    const portfolios = this.getPortfolios();
    return portfolios.find(portfolio => portfolio.id === id) || null;
  }

  public savePortfolio(portfolio: Portfolio): boolean {
    const portfolios = this.getPortfolios();
    const existingIndex = portfolios.findIndex(p => p.id === portfolio.id);
    
    if (existingIndex >= 0) {
      portfolios[existingIndex] = { ...portfolio, updatedAt: new Date() };
    } else {
      portfolios.push({ ...portfolio, createdAt: new Date(), updatedAt: new Date() });
    }
    
    return this.setItem(STORAGE_KEYS.PORTFOLIOS, portfolios);
  }

  public deletePortfolio(id: string): boolean {
    const portfolios = this.getPortfolios();
    const filteredPortfolios = portfolios.filter(portfolio => portfolio.id !== id);
    return this.setItem(STORAGE_KEYS.PORTFOLIOS, filteredPortfolios);
  }

  /**
   * Cache operations for API data
   */
  public getCacheEntry<T>(key: string): T | null {
    const cache = this.getItem<CacheStore>(STORAGE_KEYS.CACHE) || {};
    const entry = cache[key];
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.deleteCacheEntry(key);
      return null;
    }
    
    return entry.data as T;
  }

  public setCacheEntry<T>(key: string, data: T, ttlMinutes: number = 5): boolean {
    const cache = this.getItem<CacheStore>(STORAGE_KEYS.CACHE) || {};
    cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000 // convert to milliseconds
    };
    
    return this.setItem(STORAGE_KEYS.CACHE, cache);
  }

  public deleteCacheEntry(key: string): boolean {
    const cache = this.getItem<CacheStore>(STORAGE_KEYS.CACHE) || {};
    delete cache[key];
    return this.setItem(STORAGE_KEYS.CACHE, cache);
  }

  public clearCache(): boolean {
    return this.setItem(STORAGE_KEYS.CACHE, {});
  }

  /**
   * Metadata operations
   */
  public getMetadata(): StorageMetadata | null {
    return this.getItem<StorageMetadata>(STORAGE_KEYS.METADATA);
  }

  public setMetadata(metadata: StorageMetadata): boolean {
    return this.setItem(STORAGE_KEYS.METADATA, metadata);
  }

  /**
   * Backup and restore operations
   */
  public exportData(): string {
    const data = {
      positions: this.getPositions(),
      transactions: this.getTransactions(),
      portfolios: this.getPortfolios(),
      metadata: this.getMetadata(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.positions || !data.transactions || !data.portfolios) {
        throw new Error('Invalid data format');
      }
      
      // Import data
      this.setItem(STORAGE_KEYS.POSITIONS, data.positions);
      this.setItem(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      this.setItem(STORAGE_KEYS.PORTFOLIOS, data.portfolios);
      
      // Update metadata
      this.setMetadata({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        dataIntegrity: true
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * Data integrity and cleanup operations
   */
  public validateDataIntegrity(): boolean {
    try {
      const positions = this.getPositions();
      const transactions = this.getTransactions();
      const portfolios = this.getPortfolios();
      
      // Basic validation checks
      const isValid = Array.isArray(positions) && 
                     Array.isArray(transactions) && 
                     Array.isArray(portfolios);
      
      // Update metadata
      const metadata = this.getMetadata();
      if (metadata) {
        metadata.dataIntegrity = isValid;
        this.setMetadata(metadata);
      }
      
      return isValid;
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return false;
    }
  }

  public clearAllData(): boolean {
    try {
      this.removeItem(STORAGE_KEYS.POSITIONS);
      this.removeItem(STORAGE_KEYS.TRANSACTIONS);
      this.removeItem(STORAGE_KEYS.PORTFOLIOS);
      this.removeItem(STORAGE_KEYS.SETTINGS);
      this.removeItem(STORAGE_KEYS.CACHE);
      this.removeItem(STORAGE_KEYS.METADATA);
      
      this.initializeStorage();
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Storage space management
   */
  public getStorageInfo(): { 
    used: number; 
    available: number; 
    percentage: number;
    positionsCount: number;
    transactionsCount: number;
    portfoliosCount: number;
    cacheSize: number;
  } {
    try {
      const used = new Blob(Object.values(localStorage)).size;
      const available = 5 * 1024 * 1024; // Approximate 5MB localStorage limit
      const percentage = (used / available) * 100;
      
      const positions = this.getPositions();
      const transactions = this.getTransactions();
      const portfolios = this.getPortfolios();
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('stock_tracker_cache_'));
      
      return { 
        used, 
        available, 
        percentage,
        positionsCount: positions.length,
        transactionsCount: transactions.length,
        portfoliosCount: portfolios.length,
        cacheSize: cacheKeys.length
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { 
        used: 0, 
        available: 5 * 1024 * 1024, 
        percentage: 0,
        positionsCount: 0,
        transactionsCount: 0,
        portfoliosCount: 0,
        cacheSize: 0
      };
    }
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();
export default storageService;
