/**
 * AI Symbol Lookup Hook
 * Task 9: React hook for AI-powered symbol lookup functionality
 */

import { useState, useCallback } from 'react';
import { debug, PerformanceTracker, ErrorTracker } from '../utils/debug';
import type { 
  SymbolLookupResult, 
  SymbolSuggestionResponse, 
  SymbolValidationResponse,
  BatchLookupResponse,
  MarketInsightsResponse,
  APIResponse,
  AIProvider
} from '../types/ai';
import { AISymbolLookupAPI } from '../services/endpoints/aiSymbolLookupAPI';

interface UseAISymbolLookupReturn {
  // Symbol search
  searchSymbols: (query: string, options?: { limit?: number; provider?: AIProvider }) => Promise<APIResponse<SymbolLookupResult[]>>;
  isSearching: boolean;
  
  // Symbol suggestions
  getSuggestions: (query: string, options?: { limit?: number; provider?: AIProvider }) => Promise<APIResponse<SymbolSuggestionResponse>>;
  isLoadingSuggestions: boolean;
  
  // Symbol validation
  validateSymbol: (symbol: string, options?: { provider?: AIProvider }) => Promise<APIResponse<SymbolValidationResponse>>;
  isValidating: boolean;
  
  // Batch operations
  batchLookup: (queries: string[], options?: { maxResultsPerQuery?: number; provider?: AIProvider }) => Promise<APIResponse<BatchLookupResponse>>;
  isBatchProcessing: boolean;
  
  // Market insights
  getMarketInsights: (symbol: string, options?: { analysisType?: 'trend' | 'risk' | 'sentiment' | 'valuation'; provider?: AIProvider }) => Promise<APIResponse<MarketInsightsResponse>>;
  isAnalyzing: boolean;
  
  // Health and cache
  getHealthStatus: () => Promise<APIResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<AIProvider, {
      available: boolean;
      latency?: number;
      error?: string;
    }>;
    cache: {
      entries: number;
      hitRate: number;
    };
  }>>;
  clearCache: () => { cleared: number };
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export const useAISymbolLookup = (): UseAISymbolLookupReturn => {
  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Error state
  const [lastError, setLastError] = useState<string | null>(null);

  // Symbol search
  const searchSymbols = useCallback(async (
    query: string,
    options?: {
      limit?: number;
      provider?: AIProvider;
    }
  ): Promise<APIResponse<SymbolLookupResult[]>> => {
    debug.info('Starting symbol search', { query, options }, 'useAISymbolLookup');
    PerformanceTracker.mark('symbol-search-start');
    
    setIsSearching(true);
    setLastError(null);

    try {
      debug.debug('Calling AISymbolLookupAPI.searchSymbols', { query, options }, 'useAISymbolLookup');
      const response = await AISymbolLookupAPI.searchSymbols({
        query,
        maxResults: options?.limit,
        provider: options?.provider
      });

      PerformanceTracker.measure('symbol-search', 'symbol-search-start');
      
      if (!response.success && response.error) {
        debug.warn('Symbol search failed', { 
          query, 
          error: response.error 
        }, 'useAISymbolLookup');
        setLastError(response.error.message);
      } else {
        debug.info('Symbol search successful', { 
          query, 
          resultCount: response.data?.results?.length || 0 
        }, 'useAISymbolLookup');
      }

      return {
        success: response.success,
        data: response.data?.results || [],
        error: response.error,
        metadata: response.metadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      debug.error('Symbol search error', error, 'useAISymbolLookup');
      ErrorTracker.trackError(error instanceof Error ? error : new Error(errorMessage), {
        query,
        options,
        operation: 'searchSymbols'
      });
      
      setLastError(errorMessage);
      
      return {
        success: false,
        data: [],
        error: { code: 'SEARCH_ERROR', message: errorMessage },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'error',
          processingTime: 0
        }
      };
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Symbol suggestions
  const getSuggestions = useCallback(async (
    query: string,
    options?: {
      limit?: number;
      provider?: AIProvider;
    }
  ): Promise<APIResponse<SymbolSuggestionResponse>> => {
    setIsLoadingSuggestions(true);
    setLastError(null);

    try {
      const response = await AISymbolLookupAPI.getSymbolSuggestions({
        query,
        limit: options?.limit,
        provider: options?.provider
      });

      if (!response.success && response.error) {
        setLastError(response.error.message);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get suggestions';
      setLastError(errorMessage);
      
      return {
        success: false,
        error: { code: 'SUGGESTIONS_ERROR', message: errorMessage },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'error',
          processingTime: 0
        }
      };
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Symbol validation
  const validateSymbol = useCallback(async (
    symbol: string,
    options?: {
      provider?: AIProvider;
    }
  ): Promise<APIResponse<SymbolValidationResponse>> => {
    setIsValidating(true);
    setLastError(null);

    try {
      const response = await AISymbolLookupAPI.validateSymbol({
        symbol,
        provider: options?.provider
      });

      if (!response.success && response.error) {
        setLastError(response.error.message);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setLastError(errorMessage);
      
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: errorMessage },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'error',
          processingTime: 0
        }
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Batch lookup
  const batchLookup = useCallback(async (
    queries: string[],
    options?: {
      maxResultsPerQuery?: number;
      provider?: AIProvider;
    }
  ): Promise<APIResponse<BatchLookupResponse>> => {
    setIsBatchProcessing(true);
    setLastError(null);

    try {
      const response = await AISymbolLookupAPI.batchLookup({
        queries,
        maxResultsPerQuery: options?.maxResultsPerQuery,
        provider: options?.provider
      });

      if (!response.success && response.error) {
        setLastError(response.error.message);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch lookup failed';
      setLastError(errorMessage);
      
      return {
        success: false,
        error: { code: 'BATCH_ERROR', message: errorMessage },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'error',
          processingTime: 0
        }
      };
    } finally {
      setIsBatchProcessing(false);
    }
  }, []);

  // Market insights
  const getMarketInsights = useCallback(async (
    symbol: string,
    options?: {
      analysisType?: 'trend' | 'risk' | 'sentiment' | 'valuation';
      provider?: AIProvider;
    }
  ): Promise<APIResponse<MarketInsightsResponse>> => {
    setIsAnalyzing(true);
    setLastError(null);

    try {
      const response = await AISymbolLookupAPI.getMarketInsights({
        symbol,
        analysisType: options?.analysisType,
        provider: options?.provider
      });

      if (!response.success && response.error) {
        setLastError(response.error.message);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setLastError(errorMessage);
      
      return {
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: errorMessage },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'error',
          processingTime: 0
        }
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Health status
  const getHealthStatus = useCallback(async () => {
    try {
      return await AISymbolLookupAPI.getHealthStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      setLastError(errorMessage);
      
      return {
        success: false,
        error: { code: 'HEALTH_ERROR', message: errorMessage },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'error',
          processingTime: 0
        }
      };
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    return AISymbolLookupAPI.clearCache();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    // Symbol search
    searchSymbols,
    isSearching,
    
    // Symbol suggestions
    getSuggestions,
    isLoadingSuggestions,
    
    // Symbol validation
    validateSymbol,
    isValidating,
    
    // Batch operations
    batchLookup,
    isBatchProcessing,
    
    // Market insights
    getMarketInsights,
    isAnalyzing,
    
    // Health and cache
    getHealthStatus,
    clearCache,
    
    // Error handling
    lastError,
    clearError
  };
};

export default useAISymbolLookup;
