// Loading utilities for the stock tracker application
// Note: Some functions disabled due to API mismatch with current LoadingContext

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

// TODO: Re-implement these hooks to match current LoadingContext API
// export const useApiWithLoading = () => { ... }
// export const useMultipleApiCalls = () => { ... }
// export const useRetryableApi = () => { ... }
// export const useFormLoading = (formName: string) => { ... }

export default {
  withLoadingState,
  LoadingKeys,
};
