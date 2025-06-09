// Loading utilities for the stock tracker application

/**
 * Utility function to wrap any async function with loading state management
 */
export const withLoadingState = async <T>(
  asyncFn: () => Promise<T>,
  loadingKey: string,
  setLoading: (key: string, loading: boolean) => void
): Promise<T> => {
  try {
    setLoading(loadingKey, true);
    const result = await asyncFn();
    return result;
  } finally {
    setLoading(loadingKey, false);
  }
};

/**
 * Common loading keys for consistent usage across the app
 */
export const LoadingKeys = {
  // API calls
  FETCH_POSITIONS: 'fetchPositions',
  FETCH_TRANSACTIONS: 'fetchTransactions',
  FETCH_MARKET_DATA: 'fetchMarketData',
  FETCH_PORTFOLIO_SUMMARY: 'fetchPortfolioSummary',
  
  // Data operations
  SAVE_TRANSACTION: 'saveTransaction',
  UPDATE_POSITION: 'updatePosition',
  DELETE_TRANSACTION: 'deleteTransaction',
  
  // Settings operations
  SAVE_SETTINGS: 'saveSettings',
  IMPORT_DATA: 'importData',
  EXPORT_DATA: 'exportData',
  
  // Authentication (for future use)
  LOGIN: 'login',
  LOGOUT: 'logout',
  REFRESH_TOKEN: 'refreshToken',
  
  // General operations
  INITIAL_LOAD: 'initialLoad',
  PAGE_TRANSITION: 'pageTransition',
  FORM_SUBMIT: 'formSubmit',
} as const;

/**
 * Type for loading keys
 */
export type LoadingKeyType = typeof LoadingKeys[keyof typeof LoadingKeys];

/**
 * Hook for API calls with automatic loading state management
 */
export const useApiWithLoading = () => {
  const { setLoading, isLoading } = useGlobalLoading();

  const callApi = async <T>(
    apiFunction: () => Promise<T>,
    loadingKey: LoadingKeyType,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      throwOnError?: boolean;
    }
  ): Promise<T | null> => {
    try {
      setLoading(loadingKey, true);
      const result = await apiFunction();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      if (options?.onError) {
        options.onError(err);
      }
      
      if (options?.throwOnError !== false) {
        throw err;
      }
      
      return null;
    } finally {
      setLoading(loadingKey, false);
    }
  };

  return {
    callApi,
    isLoading
  };
};

/**
 * Decorator function to add loading state to any async function
 */
export const withLoading = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  loadingKey: LoadingKeyType
) => {
  return async (...args: T): Promise<R> => {
    // This would need to be used within a component that has access to loading context
    // For global usage, you'd need to access the context differently
    const loading = useLoading();
    
    try {
      loading.startLoading(loadingKey);
      return await fn(...args);
    } finally {
      loading.stopLoading(loadingKey);
    }
  };
};

/**
 * Utility for handling multiple concurrent API calls with loading states
 */
export const useMultipleApiCalls = () => {
  const { setLoading, isLoading } = useLoading();

  const callMultipleApis = async <T extends Record<string, () => Promise<unknown>>>(
    apiCalls: T,
    globalLoadingKey?: LoadingKeyType
  ): Promise<{ [K in keyof T]: unknown | null }> => {
    const results = {} as { [K in keyof T]: unknown | null };
    
    if (globalLoadingKey) {
      setLoading(globalLoadingKey, true);
    }

    try {
      // Start individual loading states
      Object.keys(apiCalls).forEach(key => {
        setLoading(`${key}Loading`, true);
      });

      // Execute all API calls concurrently
      const promises = Object.entries(apiCalls).map(async ([key, apiCall]) => {
        try {
          const result = await apiCall();
          results[key as keyof T] = result;
        } catch (error) {
          console.error(`API call ${key} failed:`, error);
          results[key as keyof T] = null;
        } finally {
          setLoading(`${key}Loading`, false);
        }
      });

      await Promise.all(promises);
      return results;
    } finally {
      if (globalLoadingKey) {
        setLoading(globalLoadingKey, false);
      }
    }
  };

  return {
    callMultipleApis,
    isLoading
  };
};

/**
 * Utility for retry logic with loading states
 */
export const useRetryableApi = () => {
  const { setLoading } = useLoading();

  const callWithRetry = async <T>(
    apiFunction: () => Promise<T>,
    loadingKey: LoadingKeyType,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      onRetry,
      shouldRetry = () => true
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt === 0) {
          setLoading(loadingKey, true);
        }
        
        const result = await apiFunction();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries && shouldRetry(lastError)) {
          if (onRetry) {
            onRetry(attempt + 1, lastError);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        } else {
          break;
        }
      } finally {
        if (attempt === maxRetries) {
          setLoading(loadingKey, false);
        }
      }
    }
    
    setLoading(loadingKey, false);
    throw lastError!;
  };

  return callWithRetry;
};

/**
 * Helper function to create loading states for form submissions
 */
export const useFormLoading = (formName: string) => {
  const loadingKey = `form_${formName}` as LoadingKeyType;
  const { isLoading, setLoading } = useLoading();

  const submitWithLoading = async <T>(
    submitFunction: () => Promise<T>
  ): Promise<T> => {
    try {
      setLoading(loadingKey, true);
      return await submitFunction();
    } finally {
      setLoading(loadingKey, false);
    }
  };

  return {
    isSubmitting: isLoading(loadingKey),
    submitWithLoading
  };
};

export default {
  withLoadingState,
  LoadingKeys,
  useApiWithLoading,
  useMultipleApiCalls,
  useRetryableApi,
  useFormLoading
};
