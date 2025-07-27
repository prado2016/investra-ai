/**
 * React Hook for Dashboard Metrics
 * Provides calculated metrics for dashboard summary boxes
 */

import { useState, useEffect, useCallback } from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { dailyPLAnalyticsService } from '../services/analytics/dailyPLService';
import { totalReturnAnalyticsService } from '../services/analytics/totalReturnService';
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
  netDeposits: number; // New: Total cash added/removed
  timeWeightedReturnRate: number; // New: Annualized performance (TWR)
  // All-time total return metrics
  totalReturn: number;
  totalReturnPercent: number;
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
  const { activePortfolio, portfolios } = usePortfolios();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateMetrics = useCallback(async () => {
    console.log('🔍 DashboardMetrics: calculateMetrics called', { 
      activePortfolio: activePortfolio?.id, 
      activePortfolioName: activePortfolio?.name,
      portfoliosCount: portfolios.length
    });
    
    // If no specific portfolio is selected, aggregate all portfolios
    const targetPortfolios = activePortfolio ? [activePortfolio] : portfolios;
    
    if (targetPortfolios.length === 0) {
      console.log('🔍 DashboardMetrics: No portfolios available');
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
      
      // Aggregate data from all target portfolios
      const aggregatedTodayData = {
        totalPL: 0,
        tradeVolume: 0,
        netCashFlow: 0,
        transactionCount: 0
      };
      
      const todayErrors: string[] = [];
      
      for (const portfolio of targetPortfolios) {
        const todayResult = await dailyPLAnalyticsService.getDayPLDetails(
          portfolio.id,
          today
        );
        
        if (todayResult.error) {
          todayErrors.push(`${portfolio.name}: ${todayResult.error}`);
        } else if (todayResult.data) {
          aggregatedTodayData.totalPL += todayResult.data.totalPL || 0;
          aggregatedTodayData.tradeVolume += todayResult.data.tradeVolume || 0;
          aggregatedTodayData.netCashFlow += todayResult.data.netCashFlow || 0;
          aggregatedTodayData.transactionCount += todayResult.data.transactionCount || 0;
        }
      }

      console.log('🔍 DashboardMetrics: Aggregated today result:', { 
        errors: todayErrors, 
        aggregatedData: aggregatedTodayData
      });

      // More resilient error handling - don't fail completely if today's data is missing
      const todayData = aggregatedTodayData;
      if (todayErrors.length > 0) {
        console.warn('⚠️ DashboardMetrics: Some today data fetch failed:', todayErrors);
        // Continue with aggregated data - we'll provide fallback values
      }

      // Get current month data for additional context - aggregate across portfolios
      console.log('🔍 DashboardMetrics: Fetching current month data...');
      
      let monthlyRealizedPL = 0;
      let monthlyDividends = 0;
      let monthlyFees = 0;
      const monthErrors: string[] = [];
      
      for (const portfolio of targetPortfolios) {
        const monthResult = await dailyPLAnalyticsService.getCurrentMonthPL(
          portfolio.id
        );
        
        if (monthResult.error) {
          monthErrors.push(`${portfolio.name}: ${monthResult.error}`);
        } else if (monthResult.data) {
          monthlyRealizedPL += monthResult.data.totalRealizedPL || 0;
          monthlyDividends += monthResult.data.totalDividends || 0;
          monthlyFees += monthResult.data.totalFees || 0;
        }
      }
      
      console.log('🔍 DashboardMetrics: Aggregated month data:', {
        monthlyRealizedPL,
        monthlyDividends,
        monthlyFees,
        errors: monthErrors
      });

      // Calculate current unrealized P/L from positions - aggregate across portfolios
      console.log('🔍 DashboardMetrics: Fetching positions...');
      let currentUnrealizedPL = 0;
      const positionsErrors: string[] = [];
      
      for (const portfolio of targetPortfolios) {
        const positionsResult = await SupabaseService.position.getPositions(portfolio.id);
        
        if (positionsResult.success && positionsResult.data) {
          // For now, use the average cost basis as a placeholder
          // In a real implementation, you'd fetch current market prices
          positionsResult.data.forEach(position => {
            // Placeholder calculation - in reality you'd use current market price
            const estimatedValue = position.quantity * position.average_cost_basis;
            const costBasis = position.total_cost_basis;
            currentUnrealizedPL += (estimatedValue - costBasis);
          });
        } else {
          positionsErrors.push(`${portfolio.name}: Failed to fetch positions`);
        }
      }
      
      console.log('🔍 DashboardMetrics: Aggregated positions result:', { 
        currentUnrealizedPL,
        errors: positionsErrors
      });

      // Calculate all-time total return - aggregate across portfolios
      console.log('🔍 DashboardMetrics: Fetching total return data...');
      
      let allTimeTotalReturn = 0;
      let allTimeTotalReturnPercent = 0;
      const totalReturnErrors: string[] = [];
      let totalInitialValue = 0;
      
      for (const portfolio of targetPortfolios) {
        const totalReturnResult = await totalReturnAnalyticsService.calculateTotalReturn(
          portfolio.id,
          { includeDividends: true, includeFees: true }
        );
        
        if (totalReturnResult.error) {
          totalReturnErrors.push(`${portfolio.name}: ${totalReturnResult.error}`);
        } else if (totalReturnResult.data) {
          allTimeTotalReturn += totalReturnResult.data.totalReturn || 0;
          // For percentage calculation, we need to weight by initial values
          // This is a simplified approach - in reality you'd want more sophisticated calculation
          totalInitialValue += (totalReturnResult.data as any).initialValue || 0;
        }
      }
      
      // Calculate weighted average return percentage
      if (totalInitialValue > 0) {
        allTimeTotalReturnPercent = (allTimeTotalReturn / totalInitialValue) * 100;
      }
      
      console.log('🔍 DashboardMetrics: Aggregated total return result:', { 
        allTimeTotalReturn,
        allTimeTotalReturnPercent,
        totalInitialValue,
        errors: totalReturnErrors
      });

      const dashboardMetrics: DashboardMetrics = {
        totalDailyPL: todayData?.totalPL || 0,
        realizedPL: monthlyRealizedPL, // Monthly total
        unrealizedPL: currentUnrealizedPL, // Current unrealized P/L
        dividendIncome: monthlyDividends, // Monthly total
        tradingFees: monthlyFees, // Monthly total
        tradeVolume: todayData?.tradeVolume || 0, // Today's volume
        netCashFlow: todayData?.netCashFlow || 0, // Today's net cash flow
        netDeposits: 50000, // Placeholder for Net Deposits
        timeWeightedReturnRate: 0.15, // Placeholder for Time-Weighted Return Rate (15%)
        totalReturn: allTimeTotalReturn, // All-time total return
        totalReturnPercent: allTimeTotalReturnPercent, // All-time return percentage
        transactionCount: todayData?.transactionCount || 0,
        lastUpdated: new Date()
      };

      console.log('✅ DashboardMetrics: Final metrics calculated:', dashboardMetrics);
      setMetrics(dashboardMetrics);
      
      // Set warning if some data failed to load
      const allErrors = [...todayErrors, ...monthErrors, ...positionsErrors, ...totalReturnErrors];
      if (allErrors.length > 0) {
        setError(`Some data unavailable: ${allErrors.join('; ')}`);
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
  }, [activePortfolio, portfolios]);

  const refreshMetrics = useCallback(async () => {
    await calculateMetrics();
  }, [calculateMetrics]);

  // Calculate metrics when active portfolio changes or when portfolios are loaded
  useEffect(() => {
    if (portfolios.length > 0) {
      calculateMetrics();
    }
  }, [activePortfolio, portfolios, calculateMetrics]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
}

export default useDashboardMetrics;
