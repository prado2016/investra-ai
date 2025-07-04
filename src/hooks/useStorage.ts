
import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { useNotify } from './useNotify';

// Inline types to avoid import issues  
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'option_expired' | 'short_option_expired' | 'short_option_assigned';
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
  portfolioId?: string; // Make it optional to maintain backward compatibility
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

/**
 * Hook for managing positions data
 */
export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedPositions = storageService.getPositions();
      setPositions(loadedPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePosition = useCallback(async (position: Position) => {
    try {
      const success = storageService.savePosition(position);
      if (success) {
        await loadPositions();
        notify.formSaved('Position');
        return true;
      } else {
        throw new Error('Failed to save position');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save position';
      setError(errorMessage);
      notify.apiError(err, errorMessage);
      return false;
    }
  }, [loadPositions, notify]);

  const deletePosition = useCallback(async (id: string) => {
    try {
      const success = storageService.deletePosition(id);
      if (success) {
        await loadPositions();
        notify.success('Position Deleted', 'Position has been removed successfully');
        return true;
      } else {
        throw new Error('Failed to delete position');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete position';
      setError(errorMessage);
      notify.apiError(err, errorMessage);
      return false;
    }
  }, [loadPositions, notify]);

  const updatePosition = useCallback(async (id: string, updates: Partial<Position>) => {
    try {
      const success = storageService.updatePosition(id, updates);
      if (success) {
        await loadPositions();
        notify.success('Position Updated', 'Position has been updated successfully');
        return true;
      } else {
        throw new Error('Failed to update position');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update position';
      setError(errorMessage);
      notify.apiError(err, errorMessage);
      return false;
    }
  }, [loadPositions, notify]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  return {
    positions,
    loading,
    error,
    refetch: loadPositions,
    savePosition,
    deletePosition,
    updatePosition
  };
}

/**
 * Hook for managing transactions data
 */
export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedTransactions = storageService.getTransactions();
      setTransactions(loadedTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTransaction = useCallback(async (transaction: Transaction) => {
    try {
      const success = storageService.saveTransaction(transaction);
      if (success) {
        await loadTransactions();
        notify.formSaved('Transaction');
        return true;
      } else {
        throw new Error('Failed to save transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save transaction';
      setError(errorMessage);
      notify.apiError(err, errorMessage);
      return false;
    }
  }, [loadTransactions, notify]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const success = storageService.deleteTransaction(id);
      if (success) {
        await loadTransactions();
        notify.success('Transaction Deleted', 'Transaction has been removed successfully');
        return true;
      } else {
        throw new Error('Failed to delete transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      notify.apiError(err, errorMessage);
      return false;
    }
  }, [loadTransactions, notify]);

  const getTransactionsByAsset = useCallback((assetId: string) => {
    return storageService.getTransactionsByAsset(assetId);
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      // Get existing transaction and merge with updates
      const existingTransaction = storageService.getTransaction(id);
      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }
      
      const updatedTransaction = { ...existingTransaction, ...updates };
      const success = storageService.saveTransaction(updatedTransaction);
      if (success) {
        await loadTransactions();
        notify.success('Transaction Updated', 'Transaction has been updated successfully');
        return true;
      } else {
        throw new Error('Failed to update transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(errorMessage);
      notify.apiError(err, errorMessage);
      return false;
    }
  }, [loadTransactions, notify]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: loadTransactions,
    saveTransaction,
    deleteTransaction,
    updateTransaction,
    getTransactionsByAsset
  };
}

/**
 * Hook for managing portfolios data
 */
export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedPortfolios = storageService.getPortfolios();
      setPortfolios(loadedPortfolios);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePortfolio = useCallback(async (portfolio: Portfolio) => {
    try {
      const success = storageService.savePortfolio(portfolio);
      if (success) {
        await loadPortfolios();
        return true;
      } else {
        throw new Error('Failed to save portfolio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save portfolio');
      return false;
    }
  }, [loadPortfolios]);

  const deletePortfolio = useCallback(async (id: string) => {
    try {
      const success = storageService.deletePortfolio(id);
      if (success) {
        await loadPortfolios();
        return true;
      } else {
        throw new Error('Failed to delete portfolio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete portfolio');
      return false;
    }
  }, [loadPortfolios]);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  return {
    portfolios,
    loading,
    error,
    refetch: loadPortfolios,
    savePortfolio,
    deletePortfolio
  };
}

/**
 * Hook for managing data export/import and backup operations
 */
export function useDataManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(() => {
    try {
      setError(null);
      const jsonData = storageService.exportData();
      
      // Create and download the file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `investra-ai-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return jsonData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
      return null;
    }
  }, []);

  const importData = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      
      // Read file contents
      const jsonData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
      
      const success = storageService.importData(jsonData);
      if (!success) {
        throw new Error('Failed to import data');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll use the local storage service
      // In a full Supabase implementation, we'd call a Supabase service instead
      const success = storageService.clearAllData();
      if (!success) {
        throw new Error('Failed to clear data');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateDataIntegrity = useCallback(() => {
    try {
      setError(null);
      return storageService.validateDataIntegrity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate data integrity');
      return false;
    }
  }, []);

  const getStorageInfo = useCallback(() => {
    try {
      setError(null);
      return storageService.getStorageInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get storage info');
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
  }, []);

  return {
    loading,
    error,
    exportData,
    importData,
    clearAllData,
    validateDataIntegrity,
    getStorageInfo
  };
}

/**
 * Hook for managing cache operations
 */
export function useCache() {
  const getCacheEntry = useCallback(<T>(key: string): T | null => {
    return storageService.getCacheEntry<T>(key);
  }, []);

  const setCacheEntry = useCallback(<T>(key: string, data: T, ttlMinutes?: number): boolean => {
    return storageService.setCacheEntry(key, data, ttlMinutes);
  }, []);

  const deleteCacheEntry = useCallback((key: string): boolean => {
    return storageService.deleteCacheEntry(key);
  }, []);

  const clearCache = useCallback((): boolean => {
    return storageService.clearCache();
  }, []);

  return {
    getCacheEntry,
    setCacheEntry,
    deleteCacheEntry,
    clearCache
  };
}
