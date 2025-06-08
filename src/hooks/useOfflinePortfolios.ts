import { useOffline } from './useOffline';

/**
 * Hook for offline portfolio management
 */
export const useOfflinePortfolios = () => {
  const { getPortfoliosOffline, createPortfolioOffline } = useOffline();
  
  return {
    getPortfoliosOffline,
    createPortfolioOffline
  };
};
