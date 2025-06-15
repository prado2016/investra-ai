/**
 * React Hook for Dashboard Metrics
 * Provides calculated metrics for dashboard summary boxes
 */

import { useState, useEffect, useCallback } from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { dailyPLAnalyticsService } from '../services/analytics/dailyPLService';
import { SupabaseService } from '../services/supabaseService';
import { getMockDashboardMetrics, USE_MOCK_DATA } from '../utils/mockDashboardData';

export interface DashboardMetrics {
  totalDailyPL: number;
  realizedPL: number;
  unrealizedPL: number;
  dividendIncome: number;
  tradingFees: number;
  tradeVolume: number;
  netCashFlow: number;
  // Additional contextual data
  transactionCount: number;
  lastUpdated: Date;
}

interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
}

export function useDashboardMetrics(): UseDashboardMetricsReturn {
  const { activePortfolio } = usePortfolios();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateMetrics = useCallback(async () => {
    console.log('🔍 DashboardMetrics: calculateMetrics called', { 
      activePortfolio: activePortfolio?.id, 
      activePortfolioName: activePortfolio?.name 
    });
    
    if (!activePortfolio) {
      console.log('🔍 DashboardMetrics: No active portfolio, setting metrics to null');
      setMetrics(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if we should use mock data for development/testing
      if (USE_MOCK_DATA || process.env.VITE_USE_MOCK_DASHBOARD === 'true') {
        console.log('🧪 DashboardMetrics: Using mock dashboard data for testing');
        console.log('🧪 Environment check:', { 
          USE_MOCK_DATA, 
          env: process.env.VITE_USE_MOCK_DASHBOARD,
          nodeEnv: process.env.NODE_ENV 
        });
        const mockMetrics = getMockDashboardMetrics();
        console.log('🧪 Mock metrics:', mockMetrics);
        setMetrics(mockMetrics);
        setLoading(false);
        return;
      }

      console.log('🔍 DashboardMetrics: Using real data, fetching from dailyPLService...');

      // Get today's P/L data with better error handling
      const today = new Date();
      console.log('🔍 DashboardMetrics: Fetching today data for date:', today.toISOString());
      
      const todayResult = await dailyPLAnalyticsService.getDayPLDetails(
        activePortfolio.id,
        today
      );

      console.log('🔍 DashboardMetrics: Today result:', { 
        error: todayResult.error, 
        hasData: !!todayResult.data,
        totalPL: todayResult.data?.totalPL 
      });

      // More resilient error handling - don't fail completely if today's data is missing
      let todayData = null;
      if (todayResult.error) {
        console.warn('⚠️ DashboardMetrics: Today data fetch failed:', todayResult.error);
        // Continue with null data - we'll provide fallback values
      } else {
        todayData = todayResult.data;
      }

      // Get current month data for additional context
      console.log('🔍 DashboardMetrics: Fetching current month data...');
      const monthResult = await dailyPLAnalyticsService.getCurrentMonthPL(
        activePortfolio.id
      );

      console.log('🔍 DashboardMetrics: Month result:', { 
        error: monthResult.error, 
        hasData: !!monthResult.data 
      });

      let monthlyRealizedPL = 0;
      let monthlyDividends = 0;
      let monthlyFees = 0;

      if (monthResult.data) {
        monthlyRealizedPL = monthResult.data.totalRealizedPL;
        monthlyDividends = monthResult.data.totalDividends;
        monthlyFees = monthResult.data.totalFees;
        console.log('🔍 DashboardMetrics: Month data extracted:', {
          monthlyRealizedPL,
          monthlyDividends,
          monthlyFees
        });
      } else if (monthResult.error) {
        console.warn('⚠️ DashboardMetrics: Month data fetch failed:', monthResult.error);
      }

      // Calculate current unrealized P/L from positions
      console.log('🔍 DashboardMetrics: Fetching positions...');
      const positionsResult = await SupabaseService.position.getPositions(activePortfolio.id);
      let currentUnrealizedPL = 0;
      
      console.log('🔍 DashboardMetrics: Positions result:', { 
        success: positionsResult.success, 
        count: positionsResult.data?.length 
      });
      
      if (positionsResult.success && positionsResult.data) {
        // For now, use the average cost basis as a placeholder
        // In a real implementation, you'd fetch current market prices
        positionsResult.data.forEach(position => {
          // Placeholder calculation - in reality you'd use current market price
          const estimatedValue = position.quantity * position.average_cost_basis;
          const costBasis = position.total_cost_basis;
          currentUnrealizedPL += (estimatedValue - costBasis);
        });
        console.log('🔍 DashboardMetrics: Calculated unrealized P/L:', currentUnrealizedPL);
      }

      const dashboardMetrics: DashboardMetrics = {
        totalDailyPL: todayData?.totalPL || 0,
        realizedPL: monthlyRealizedPL, // Monthly total
        unrealizedPL: currentUnrealizedPL, // Current unrealized P/L
        dividendIncome: monthlyDividends, // Monthly total
        tradingFees: monthlyFees, // Monthly total
        tradeVolume: todayData?.tradeVolume || 0, // Today's volume
        netCashFlow: todayData?.netCashFlow || 0, // Today's net cash flow
        transactionCount: todayData?.transactionCount || 0,
        lastUpdated: new Date()
      };

      console.log('✅ DashboardMetrics: Final metrics calculated:', dashboardMetrics);
      setMetrics(dashboardMetrics);
      
      // Set warning if some data failed to load
      if (todayResult.error || monthResult.error) {
        setError(`Some data unavailable: ${todayResult.error || monthResult.error}`);
      }
    } catch (err) {
      console.error('❌ DashboardMetrics: Critical error, falling back to mock data:', err);
      // Fallback to mock data if database queries fail completely
      const mockMetrics = getMockDashboardMetrics();
      setMetrics(mockMetrics);
      setError('Using mock data - ' + (err instanceof Error ? err.message : 'Unknown error calculating metrics'));
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  const refreshMetrics = useCallback(async () => {
    await calculateMetrics();
  }, [calculateMetrics]);

  // Calculate metrics when active portfolio changes
  useEffect(() => {
    if (activePortfolio) {
      calculateMetrics();
    }
  }, [activePortfolio, calculateMetrics]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
}

export default useDashboardMetrics;
