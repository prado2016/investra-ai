import { useState, useEffect, useCallback } from 'react';
import { yahooFinanceBrowserService } from '../services/yahooFinanceBrowserService';
import { useNetwork } from './useNetwork';
import { useRetry } from './useRetry';
import type { AssetType } from '../utils/assetCategorization';

// Inline API types to avoid import issues
interface YahooFinanceQuote {
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

export interface UseQuoteOptions {
  enabled?: boolean;
  refetchInterval?: number; // in milliseconds
  useCache?: boolean;
}

export function useQuote(symbol: string, options: UseQuoteOptions = {}) {
  const { enabled = true, refetchInterval, useCache = true } = options;
  
  const [data, setData] = useState<YahooFinanceQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const network = useNetwork();
  
  // DISABLE retries for single quote to prevent loops
  const retry = useRetry({
    maxAttempts: 1, // No retries
    baseDelay: 0,
    retryCondition: () => false // Never retry
  });

  const fetchQuote = useCallback(async () => {
    if (!symbol || !enabled) return;

    // If offline, try to use cached data without making API call
    if (!network.isOnline) {
      setLoading(false);
      setError('No internet connection. Showing cached data if available.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await retry.executeWithRetry(async () => {
        return await yahooFinanceBrowserService.getQuote(symbol, useCache);
      });
      
      if (response.success && response.data) {
        setData(response.data);
        setLastUpdated(response.timestamp);
        setError(null); // Clear any previous errors
      } else {
        const errorMessage = response.error?.message || 'Failed to fetch quote';
        setError(errorMessage);
        setData(null);
        
        // Log error instead of showing notification to prevent dependencies
        if (network.isOnline && !errorMessage.toLowerCase().includes('network')) {
          console.warn('Yahoo Finance API data update failed:', errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setData(null);
      
      // The retry hook will handle notifications for retry attempts
      // Only show final error if it's not a retryable network error
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                            errorMessage.toLowerCase().includes('fetch') ||
                            errorMessage.toLowerCase().includes('timeout');
      
      if (!isNetworkError) {
        console.error('Yahoo Finance API error (non-network):', err);
      } else {
        console.warn('Yahoo Finance API network error:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled, useCache, network.isOnline, retry]);

  // Initial fetch
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // Set up interval for real-time updates
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(fetchQuote, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchQuote, refetchInterval, enabled]);

  const refetch = useCallback(() => {
    fetchQuote();
  }, [fetchQuote]);

  return {
    data,
    loading: loading || retry.isRetrying,
    error,
    lastUpdated,
    refetch,
    retryState: {
      isRetrying: retry.isRetrying,
      currentAttempt: retry.currentAttempt,
      totalAttempts: retry.totalAttempts
    }
  };
}

export interface UseQuotesOptions {
  enabled?: boolean;
  refetchInterval?: number;
  useCache?: boolean;
}

export function useQuotes(symbols: string[], options: UseQuotesOptions = {}) {
  const { enabled = true, refetchInterval, useCache = true } = options;
  
  const [data, setData] = useState<YahooFinanceQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const network = useNetwork();
  
  // DISABLE retries completely for Yahoo Finance API to prevent loops
  const retryConfig = {
    maxAttempts: 1, // No retries - single attempt only
    baseDelay: 0,
    retryCondition: () => false // Never retry
  };
  
  const retry = useRetry(retryConfig);

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length || !enabled) return;

    if (!network.isOnline) {
      setLoading(false);
      setError('No internet connection. Showing cached data if available.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await retry.executeWithRetry(async () => {
        return await yahooFinanceBrowserService.getQuotes(symbols, useCache);
      });
      
      if (response.success && response.data) {
        setData(response.data);
        setLastUpdated(response.timestamp);
        setError(null);
      } else {
        const errorMessage = response.error?.message || 'Failed to fetch quotes';
        setError(errorMessage);
        setData([]);
        
        // Log error instead of showing notification to prevent dependencies
        if (network.isOnline && !errorMessage.toLowerCase().includes('network')) {
          console.warn('Yahoo Finance API data update failed:', errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setData([]);
      
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                            errorMessage.toLowerCase().includes('fetch') ||
                            errorMessage.toLowerCase().includes('timeout') ||
                            errorMessage.toLowerCase().includes('insufficient_resources');
      
      if (!isNetworkError) {
        console.error('Yahoo Finance API error (non-network):', err);
      } else {
        console.warn('Yahoo Finance API network error:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [symbols, enabled, useCache, network.isOnline, retry]);

  // Initial fetch - only run if enabled
  useEffect(() => {
    if (enabled) {
      fetchQuotes();
    }
  }, [fetchQuotes, enabled]);

  // Set up interval for real-time updates
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(fetchQuotes, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchQuotes, refetchInterval, enabled]);

  const refetch = useCallback(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return {
    data,
    loading: loading || retry.isRetrying,
    error,
    lastUpdated,
    refetch,
    retryState: {
      isRetrying: retry.isRetrying,
      currentAttempt: retry.currentAttempt,
      totalAttempts: retry.totalAttempts
    }
  };
}

export interface UseSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useSearch(query: string, options: UseSearchOptions = {}) {
  const { enabled = true, debounceMs = 300 } = options;
  
  const [data, setData] = useState<Array<{ symbol: string; name: string; type: AssetType }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !enabled) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual symbol search in yahooFinanceBrowserService
      // For now, return empty results
      const response = {
        success: true,
        data: [] as Array<{ symbol: string; name: string; type: AssetType }>,
        timestamp: new Date()
      };
      
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch, debounceMs]);

  return {
    data,
    loading,
    error
  };
}
