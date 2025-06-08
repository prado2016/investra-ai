import { useState, useCallback, useRef } from 'react';
import { symbolLookupEndpoint } from '../services/endpoints/symbolLookupEndpoint';
import { EnhancedAISymbolParser } from '../services/ai/enhancedSymbolParser';
import { YahooFinanceValidator } from '../services/yahooFinanceValidator';
import type { 
  SymbolLookupEndpointRequest, 
  SymbolLookupEndpointResponse
} from '../services/endpoints/symbolLookupEndpoint';

interface UseSymbolLookupState {
  isLoading: boolean;
  error: string | null;
  data: SymbolLookupEndpointResponse | null;
  rateLimitInfo: {
    remainingRequests: number;
    resetTime: string;
    dailyLimitReached: boolean;
    hourlyLimitReached: boolean;
  } | null;
}

interface UseSymbolLookupOptions {
  onSuccess?: (data: SymbolLookupEndpointResponse) => void;
  onError?: (error: string) => void;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export function useSymbolLookup(options: UseSymbolLookupOptions = {}) {
  const [state, setState] = useState<UseSymbolLookupState>({
    isLoading: false,
    error: null,
    data: null,
    rateLimitInfo: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const {
    onSuccess,
    onError,
    retryOnFailure = true,
    maxRetries = 3,
  } = options;

  const lookupSymbol = useCallback(async (
    request: SymbolLookupEndpointRequest
  ): Promise<SymbolLookupEndpointResponse | null> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await symbolLookupEndpoint.lookup(request);

      // Update rate limit info from response metadata
      setState(prev => ({
        ...prev,
        isLoading: false,
        data: response,
        rateLimitInfo: {
          remainingRequests: response.metadata.rateLimit.remaining || 0,
          resetTime: response.metadata.rateLimit.resetTime || '',
          dailyLimitReached: false,
          hourlyLimitReached: false,
        },
      }));

      retryCountRef.current = 0;
      onSuccess?.(response);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if we should retry
      const shouldRetry = 
        retryOnFailure &&
        retryCountRef.current < maxRetries &&
        !abortControllerRef.current?.signal.aborted;

      if (shouldRetry) {
        retryCountRef.current++;
        
        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
        
        setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            lookupSymbol(request);
          }
        }, delay);

        return null;
      }

      // Update error state
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      retryCountRef.current = 0;
      onError?.(errorMessage);
      return null;
    }
  }, [onSuccess, onError, retryOnFailure, maxRetries]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearData = useCallback(() => {
    setState(prev => ({
      ...prev,
      data: null,
      error: null,
    }));
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  // Health check function
  const checkHealth = useCallback(async () => {
    try {
      const health = await symbolLookupEndpoint.healthCheck();
      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  }, []);

  // Get usage statistics
  const getUsageStats = useCallback(async () => {
    try {
      const stats = await symbolLookupEndpoint.getUsageStats();
      return stats;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    lookupSymbol,
    clearError,
    clearData,
    cancel,
    
    // Utilities
    checkHealth,
    getUsageStats,
    
    // Computed values
    canRetry: !!state.error && retryCountRef.current < maxRetries,
    retryCount: retryCountRef.current,
    isRateLimited: state.error?.includes('rate limit') || false,
  };
}

// Convenience hook for symbol validation using AI parsing + Yahoo Finance validation
export function useSymbolValidation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSymbol = useCallback(async (query: string): Promise<boolean> => {
    if (!query.trim()) return false;

    setIsLoading(true);
    setError(null);

    try {
      // First, try to parse the query using AI symbol parser
      const parseResult = await EnhancedAISymbolParser.parseQuery(query.trim());
      
      if (!parseResult.parsedSymbol) {
        setError('Could not parse symbol from query');
        return false;
      }

      // Then validate the parsed symbol with Yahoo Finance
      const validationResult = await YahooFinanceValidator.validateSymbol(parseResult.parsedSymbol);
      
      if (!validationResult.isValid) {
        setError(validationResult.error || 'Symbol validation failed');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSuggestions = useCallback(async (query: string): Promise<string[]> => {
    if (!query.trim()) return [];

    try {
      // Use AI symbol parser to get suggestions
      const parseResult = await EnhancedAISymbolParser.parseQuery(query.trim());
      
      if (parseResult.parsedSymbol) {
        return [parseResult.parsedSymbol];
      }
      
      return [];
    } catch (err) {
      console.warn('Failed to get suggestions:', err);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    validateSymbol,
    getSuggestions,
    isLoading,
    error,
    clearError,
  };
}

export type { UseSymbolLookupState, UseSymbolLookupOptions };
