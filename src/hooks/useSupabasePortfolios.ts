/**
 * React Hook for Supabase Portfolio Management
 * Provides access to portfolio data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { useTestConfig } from './useTestConfig';
import type { Portfolio } from '../lib/database/types';

// Mock portfolio for testing
const mockPortfolio: Portfolio = {
  id: 'mock-portfolio-id',
  user_id: 'mock-user-id',
  name: 'Mock Trading Portfolio',
  description: 'Sample portfolio for testing dashboard metrics',
  currency: 'USD',
  is_default: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

interface UsePortfoliosReturn {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  refreshPortfolios: () => Promise<void>;
  setActivePortfolio: (portfolio: Portfolio) => void;
}

/**
 * Hook for managing portfolios from Supabase
 */
export function useSupabasePortfolios(): UsePortfoliosReturn {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolioState] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isTestMode, mockPortfolio: testPortfolio } = useTestConfig();

  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use mock data if in test mode or specifically configured
      if (isTestMode || import.meta.env.VITE_USE_MOCK_DASHBOARD === 'true') {
        console.log('🧪 Using mock portfolio data for testing');
        const testPortfolios = [testPortfolio || mockPortfolio];
        setPortfolios(testPortfolios);
        setActivePortfolioState(testPortfolio || mockPortfolio);
        setLoading(false);
        return;
      }

      const result = await SupabaseService.portfolio.getPortfolios();

      if (result.success && result.data) {
        setPortfolios(result.data);
        
        // Set the first portfolio as active if none is selected
        if (result.data.length > 0 && !activePortfolio) {
          const defaultPortfolio = result.data.find(p => p.is_default) || result.data[0];
          setActivePortfolioState(defaultPortfolio);
        }
      } else {
        setError(result.error || 'Failed to fetch portfolios');
        setPortfolios([]);
      }
    } catch (err) {
      console.warn('Portfolio fetch failed, using mock data:', err);
      // Fallback to mock data if database queries fail
      setPortfolios([mockPortfolio]);
      setActivePortfolioState(mockPortfolio);
      setError('Using mock data - ' + (err instanceof Error ? err.message : 'Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  const setActivePortfolio = useCallback((portfolio: Portfolio) => {
    setActivePortfolioState(portfolio);
  }, []);

  const refreshPortfolios = useCallback(async () => {
    await fetchPortfolios();
  }, [fetchPortfolios]);

  // Initial fetch
  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  return {
    portfolios,
    activePortfolio,
    loading,
    error,
    refreshPortfolios,
    setActivePortfolio
  };
}

export default useSupabasePortfolios;
