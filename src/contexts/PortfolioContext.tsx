/**
 * Portfolio Context Provider
 * Provides global portfolio state management across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { useAuth } from './AuthProvider';
import { requestDebouncer } from '../utils/requestDebouncer';
import type { Portfolio } from '../lib/database/types';

interface PortfolioContextValue {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  setActivePortfolio: (portfolio: Portfolio | null) => void;
  loading: boolean;
  error: string | null;
  fetchPortfolios: () => Promise<void>;
  refreshPortfolios: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

export const usePortfolios = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolios must be used within a PortfolioProvider');
  }
  return context;
};

interface PortfolioProviderProps {
  children: React.ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

  const fetchPortfolios = useCallback(async () => {
    if (!user?.id) {
      console.log('📋 PortfolioContext: No user, skipping fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🏦 PortfolioContext: Fetching portfolios for user:', user.id);
      
      // Debounce the API call to prevent rapid repeated calls
      const debouncedFetch = requestDebouncer.debounce(
        `portfolios-${user.id}`,
        () => SupabaseService.portfolio.getPortfolios(),
        5000 // Increased debounce to 5 seconds
      );

      const result = await debouncedFetch();

      if (result.success && result.data) {
        console.log('🏦 PortfolioContext: Fetched portfolios:', result.data);
        setPortfolios(result.data);
        
        // Keep activePortfolio as null by default to show "All Portfolios"
        // Users can manually select a specific portfolio if needed
        setActivePortfolio(prevActivePortfolio => {
          if (!prevActivePortfolio && result.data.length > 0) {
            console.log('🏦 PortfolioContext: Keeping active portfolio as null for "All Portfolios" view');
            return null; // This will show "All Portfolios" in the selector
          }
          return prevActivePortfolio; // Keep current active portfolio if already set
        });
      } else if (result.success && (!result.data || result.data.length === 0)) {
        // No portfolios exist, create a default one
        console.log('📝 PortfolioContext: No portfolios found, creating default');
        try {
          const createResult = await SupabaseService.portfolio.createPortfolio(
            'My Portfolio',
            'Default portfolio',
            'USD'
          );
          
          if (createResult.success && createResult.data) {
            setPortfolios([createResult.data]);
            setActivePortfolio(createResult.data);
          } else {
            setError(createResult.error || 'Failed to create default portfolio');
          }
        } catch (createErr) {
          console.error('Failed to create default portfolio:', createErr);
          setError('Failed to create default portfolio');
        }
      } else {
        setError(result.error || 'Failed to fetch portfolios');
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Removed activePortfolio from dependencies

  const refreshPortfolios = useCallback(async () => {
    await fetchPortfolios();
  }, [fetchPortfolios]);

  // Fetch portfolios when user is available and auth is loaded
  useEffect(() => {
    if (user && !authLoading) {
      // Allow refetching but use debouncer to prevent spam
      console.log('🏦 PortfolioContext: Initiating portfolio fetch for user:', user.id);
      fetchPortfolios();
    } else if (!user && !authLoading) {
      // Clear portfolios when user logs out
      console.log('🏦 PortfolioContext: Clearing portfolios (user logged out)');
      setPortfolios([]);
      setActivePortfolio(null);
      fetchInitiatedRef.current = false;
    }
  }, [user, authLoading, fetchPortfolios]);

  const value: PortfolioContextValue = {
    portfolios,
    activePortfolio,
    setActivePortfolio,
    loading,
    error,
    fetchPortfolios,
    refreshPortfolios
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export default PortfolioProvider;
