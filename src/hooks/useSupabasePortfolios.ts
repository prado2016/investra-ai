/**
 * React Hook for Supabase Portfolio Management
 * Provides access to portfolio data with loading states and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthProvider';
import { requestDebouncer } from '../utils/requestDebouncer';
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

export interface UsePortfoliosReturn {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  setActivePortfolio: (portfolio: Portfolio | null) => void;
  loading: boolean;
  error: string | null;
  fetchPortfolios: () => Promise<void>;
}

export interface UseSupabasePortfoliosOptions {
  isTestMode?: boolean;
  testPortfolio?: Portfolio;
}

/**
 * Hook for managing portfolios from Supabase
 */
export function useSupabasePortfolios(options: UseSupabasePortfoliosOptions = {}): UsePortfoliosReturn {
  const { user, loading: authLoading } = useAuth();
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current % 10 === 0) {  // Log every 10th render to avoid console spam
      console.warn(`Portfolio hook re-rendered ${renderCount.current} times`);
    }
  });

  const { isTestMode = false, testPortfolio } = options;
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolioState] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use mock data if in test mode or specifically configured
      if (isTestMode || import.meta.env.VITE_USE_MOCK_DASHBOARD === 'true') {
        const testPortfolios = [testPortfolio || mockPortfolio];
        setPortfolios(testPortfolios);
        setActivePortfolioState(testPortfolio || mockPortfolio);
        setLoading(false);
        return;
      }

      // Debounce the actual API call
      const debouncedFetch = requestDebouncer.debounce(
        `portfolios-${user?.id}`,
        () => SupabaseService.portfolio.getPortfolios(),
        2000 // 2 second debounce for portfolios
      );

      const result = await debouncedFetch();

      if (result.success && result.data) {
        setPortfolios(result.data);
        // Use a functional update to avoid referencing outer activePortfolio
        setActivePortfolioState(prev => {
          if (result.data.length > 0 && !prev) {
            return result.data.find(p => p.is_default) || result.data[0];
          }
          return prev;
        });
      } else if (result.success && result.data && result.data.length === 0) {
        // No portfolios exist, create a default one
        console.log('📝 No portfolios found, creating default portfolio');
        try {
          const createResult = await SupabaseService.portfolio.createPortfolio(
            'My Portfolio',
            'Default portfolio',
            'USD'
          );
          
          if (createResult.success && createResult.data) {
            setPortfolios([createResult.data]);
            setActivePortfolioState(createResult.data);
          } else {
            setError(createResult.error || 'Failed to create default portfolio');
            setPortfolios([]);
          }
        } catch (createErr) {
          console.warn('Failed to create default portfolio:', createErr);
          setError('Failed to create default portfolio');
          setPortfolios([]);
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
  }, [isTestMode, user?.id]); // Include user.id for debounce key
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // testPortfolio intentionally excluded to prevent loops

  const setActivePortfolio = useCallback((portfolio: Portfolio | null) => {
    setActivePortfolioState(portfolio);
  }, []);

  const refreshPortfolios = useCallback(async () => {
    await fetchPortfolios();
  }, [fetchPortfolios]);

  // Initial fetch - now dependent on user and auth loading state
  useEffect(() => {
    // Only fetch if we have a user and auth is no longer loading
    // And we haven't already loaded portfolios
    if (user && !authLoading && portfolios.length === 0 && !loading) {
      console.log('🏦 Fetching portfolios for user:', user.id);
      fetchPortfolios();
    } else if (!authLoading && !user) {
      // If auth is done and there's no user, clear any existing data
      setPortfolios([]);
      setActivePortfolioState(null);
    }
  }, [user?.id, authLoading]); // Only depend on user ID and auth loading state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // fetchPortfolios, loading, portfolios.length, user intentionally excluded to prevent loops

  return {
    portfolios,
    activePortfolio,
    setActivePortfolio,
    loading,
    error,
    fetchPortfolios,
    refreshPortfolios
  };
}

export default useSupabasePortfolios;
