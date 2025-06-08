/**
 * React Hook for Supabase Portfolio Management
 * Provides access to portfolio data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
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

  const fetchPortfolios = useCallback(async () => {
    console.log('🔍 PORTFOLIO_HOOK_DEBUG: fetchPortfolios called');
    setLoading(true);
    setError(null);

    try {
      // Use mock data if enabled for testing
      console.log('🔍 PORTFOLIO_HOOK_DEBUG: VITE_USE_MOCK_DASHBOARD =', import.meta.env.VITE_USE_MOCK_DASHBOARD);
      if (import.meta.env.VITE_USE_MOCK_DASHBOARD === 'true') {
        console.log('🧪 Using mock portfolio data for testing');
        setPortfolios([mockPortfolio]);
        setActivePortfolioState(mockPortfolio);
        setLoading(false);
        return;
      }

      console.log('🔍 PORTFOLIO_HOOK_DEBUG: Calling SupabaseService.portfolio.getPortfolios()');
      const result = await SupabaseService.portfolio.getPortfolios();
      console.log('🔍 PORTFOLIO_HOOK_DEBUG: Service result:', result);

      if (result.success && result.data) {
        console.log('🔍 PORTFOLIO_HOOK_DEBUG: Setting portfolios:', result.data.length);
        setPortfolios(result.data);
        
        // Set the first portfolio as active if none is selected
        if (result.data.length > 0 && !activePortfolio) {
          const defaultPortfolio = result.data.find(p => p.is_default) || result.data[0];
          console.log('🔍 PORTFOLIO_HOOK_DEBUG: Setting active portfolio:', defaultPortfolio.id);
          setActivePortfolioState(defaultPortfolio);
        }
      } else {
        console.log('🔍 PORTFOLIO_HOOK_DEBUG: Service failed:', result.error);
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
