/**
 * React Hook for Dashboard Metrics
 * Provides calculated metrics for dashboard summary boxes
 */

import { useState, useEffect, useCallback } from 'react';
import { useSupabasePortfolios } from './useSupabasePortfolios';
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
  const { activePortfolio } = useSupabasePortfolios();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateMetrics = useCallback(async () => {
    if (!activePortfolio) {
      setMetrics(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if we should use mock data for development/testing
      if (USE_MOCK_DATA || process.env.VITE_USE_MOCK_DASHBOARD === 'true') {
        console.log('🧪 Using mock dashboard data for testing');
        const mockMetrics = getMockDashboardMetrics();
        setMetrics(mockMetrics);
        setLoading(false);
        return;
      }

      // Get today's P/L data
      const today = new Date();
      const todayResult = await dailyPLAnalyticsService.getDayPLDetails(
        activePortfolio.id,
        today
      );

      if (todayResult.error) {
        setError(todayResult.error);
        return;
      }

      const todayData = todayResult.data;

      // Get current month data for additional context
      const monthResult = await dailyPLAnalyticsService.getCurrentMonthPL(
        activePortfolio.id
      );

      let monthlyRealizedPL = 0;
      let monthlyUnrealizedPL = 0;
      let monthlyDividends = 0;
      let monthlyFees = 0;
      let monthlyVolume = 0;

      if (monthResult.data) {
        monthlyRealizedPL = monthResult.data.totalRealizedPL;
        monthlyUnrealizedPL = monthResult.data.totalUnrealizedPL;
        monthlyDividends = monthResult.data.totalDividends;
        monthlyFees = monthResult.data.totalFees;
        monthlyVolume = monthResult.data.totalVolume;
      }

      // Calculate current unrealized P/L from positions
      const positionsResult = await SupabaseService.position.getPositions(activePortfolio.id);
      let currentUnrealizedPL = 0;
      
      if (positionsResult.success && positionsResult.data) {
        // For now, use the average cost basis as a placeholder
        // In a real implementation, you'd fetch current market prices
        positionsResult.data.forEach(position => {
          // Placeholder calculation - in reality you'd use current market price
          const estimatedValue = position.quantity * position.average_cost_basis;
          const costBasis = position.total_cost_basis;
          currentUnrealizedPL += (estimatedValue - costBasis);
        });
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

      setMetrics(dashboardMetrics);
    } catch (err) {
      console.warn('Database query failed, using mock data for testing:', err);
      // Fallback to mock data if database queries fail
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
