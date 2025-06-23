import { useState, useCallback, useRef, useMemo } from 'react';
import { useNotify } from './useNotify';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // ms
  maxDelay?: number; // ms
  backoffFactor?: number;
  retryCondition?: (error: unknown) => boolean;
  onRetryAttempt?: (attempt: number, error: unknown) => void;
  onMaxAttemptsReached?: (error: unknown) => void;
}

export interface RetryState {
  isRetrying: boolean;
  currentAttempt: number;
  lastError: unknown;
  totalAttempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: unknown) => {
    // Default: retry on network errors, timeouts, and 5xx status codes
    if (typeof error === 'string') {
      const errorStr = error.toLowerCase();
      return errorStr.includes('network') || 
             errorStr.includes('timeout') || 
             errorStr.includes('fetch') ||
             errorStr.includes('connection');
    }
    
    // Handle error objects with status property
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 500 || status === 408 || status === 429;
    }
    
    // Handle error objects with code property
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_ERROR'];
      return retryableCodes.includes(code);
    }
    
    return false;
  },
  onRetryAttempt: () => {},
  onMaxAttemptsReached: () => {}
};

/**
 * Hook for implementing retry logic with exponential backoff
 */
export const useRetry = (options: RetryOptions = {}) => {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const notify = useNotify();
  
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    currentAttempt: 0,
    lastError: null,
    totalAttempts: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1);
    return Math.min(delay, opts.maxDelay);
  }, [opts.baseDelay, opts.backoffFactor, opts.maxDelay]);

  const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);
      
      // Allow abortion of sleep
      if (abortControllerRef.current) {
        abortControllerRef.current.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Retry aborted'));
        });
      }
    });
  };

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    const config = { ...opts, ...customOptions };
    let lastError: unknown;

    // Create abort controller for this retry session
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isRetrying: false,
      currentAttempt: 0,
      totalAttempts: prev.totalAttempts + 1
    }));

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          currentAttempt: attempt,
          isRetrying: attempt > 1
        }));

        const result = await operation();
        
        // Success - reset state
        setState(prev => ({
          ...prev,
          isRetrying: false,
          currentAttempt: 0,
          lastError: null
        }));
        
        abortControllerRef.current = null;
        return result;

      } catch (error) {
        lastError = error;
        
        setState(prev => ({
          ...prev,
          lastError: error
        }));

        // Check if we should retry this error
        if (!config.retryCondition(error) || attempt >= config.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = calculateDelay(attempt);
        
        // Notify about retry attempt
        config.onRetryAttempt(attempt, error);
        
        if (attempt < config.maxAttempts) {
          // Log retry attempts instead of showing notifications to prevent dependency loops
          const errorMsg = (error as Error)?.message || String(error) || 'Operation failed';
          console.warn(`Retrying API call (${attempt}/${config.maxAttempts}): ${errorMsg}. Retrying in ${Math.round(delay / 1000)}s`);
        }

        // Wait before next attempt
        try {
          await sleep(delay);
        } catch (abortError) {
          // Retry was aborted
          setState(prev => ({
            ...prev,
            isRetrying: false,
            currentAttempt: 0
          }));
          abortControllerRef.current = null;
          throw abortError;
        }
      }
    }

    // All attempts failed
    setState(prev => ({
      ...prev,
      isRetrying: false,
      currentAttempt: 0
    }));

    config.onMaxAttemptsReached(lastError);
    abortControllerRef.current = null;
    
    // Log final failure instead of showing notification to prevent dependency loops
    const errorMsg = (lastError as Error)?.message || String(lastError) || 'Operation failed';
    console.error(`Operation failed after ${config.maxAttempts} attempts: ${errorMsg}`);

    throw lastError;
  }, [opts, calculateDelay]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      currentAttempt: 0,
      lastError: null,
      totalAttempts: 0
    });
    abort();
  }, [abort]);

  return {
    ...state,
    executeWithRetry,
    abort,
    reset
  };
};

export default useRetry;
