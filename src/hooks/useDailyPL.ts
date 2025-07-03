/**
 * React Hook for Daily P/L Analytics
 * Provides easy access to daily P/L data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { dailyPLAnalyticsService, type MonthlyPLSummary, type DailyPLData, type PLServiceOptions, type EnhancedTransaction } from '../services/analytics/dailyPLService';
import { usePortfolios } from '../contexts/PortfolioContext';

interface UseDailyPLOptions extends PLServiceOptions {
  portfolioId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseDailyPLReturn {
  monthlyData: MonthlyPLSummary | null;
  dailyData: DailyPLData[];
  loading: boolean;
  error: string | null;
  orphanTransactions: EnhancedTransaction[];
  refreshData: () => Promise<void>;
  getMonthData: (year: number, month: number) => Promise<void>;
  getDayDetails: (date: Date) => Promise<DailyPLData | null>;
}

/**
 * Hook for accessing monthly P/L data
 */
export function useDailyPL(
  portfolioId: string | null,
  year?: number,
  month?: number,
  options?: UseDailyPLOptions
): UseDailyPLReturn {
  const { portfolios } = usePortfolios();
  const [monthlyData, setMonthlyData] = useState<MonthlyPLSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orphanTransactions, setOrphanTransactions] = useState<EnhancedTransaction[]>([]);

  // Use current month/year if not provided
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth();

  const fetchMonthData = useCallback(async (fetchYear: number, fetchMonth: number) => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (portfolioId) {
        // Single portfolio case
        result = await dailyPLAnalyticsService.getMonthlyPLData(
          portfolioId,
          fetchYear,
          fetchMonth,
          options
        );
      } else {
        // All portfolios case - aggregate data from all portfolios
        const portfolioIds = portfolios.map(p => p.id);
        if (portfolioIds.length === 0) {
          setMonthlyData(null);
          setOrphanTransactions([]);
          setError('No portfolios available');
          return;
        }
        
        result = await dailyPLAnalyticsService.getAggregatedMonthlyPLData(
          portfolioIds,
          fetchYear,
          fetchMonth,
          options
        );
      }

      if (result.error) {
        setError(result.error);
        setMonthlyData(null);
        setOrphanTransactions([]);
      } else {
        setMonthlyData(result.data);
        setOrphanTransactions(result.data?.orphanTransactions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setMonthlyData(null);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, portfolios, options]);

  const refreshData = useCallback(async () => {
    await fetchMonthData(targetYear, targetMonth);
  }, [fetchMonthData, targetYear, targetMonth]);

  const getMonthData = useCallback(async (newYear: number, newMonth: number) => {
    await fetchMonthData(newYear, newMonth);
  }, [fetchMonthData]);

  const getDayDetails = useCallback(async (date: Date): Promise<DailyPLData | null> => {
    try {
      if (portfolioId) {
        // Single portfolio case
        const result = await dailyPLAnalyticsService.getDayPLDetails(portfolioId, date, options);
        return result.data;
      } else {
        // All portfolios case - use the monthly data that's already aggregated
        if (!monthlyData) return null;
        
        const dateString = date.toISOString().split('T')[0];
        const dayData = monthlyData.dailyData.find(d => d.date === dateString);
        return dayData || null;
      }
    } catch (err) {
      console.error('Error fetching day details:', err);
      return null;
    }
  }, [portfolioId, monthlyData, options]);

  // Initial data fetch
  useEffect(() => {
    // Fetch data for single portfolio or all portfolios
    if (portfolioId || portfolios.length > 0) {
      fetchMonthData(targetYear, targetMonth);
    }
  }, [portfolioId, portfolios.length, targetYear, targetMonth, fetchMonthData]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (options?.autoRefresh && (portfolioId || portfolios.length > 0)) {
      const interval = setInterval(refreshData, options.refreshInterval || 60000); // Default 1 minute
      return () => clearInterval(interval);
    }
  }, [options?.autoRefresh, options?.refreshInterval, portfolioId, portfolios.length, refreshData]);

  return {
    monthlyData,
    dailyData: monthlyData?.dailyData || [],
    loading,
    error,
    orphanTransactions,
    refreshData,
    getMonthData,
    getDayDetails
  };
}

/**
 * Hook for accessing current month P/L data
 */
export function useCurrentMonthPL(
  portfolioId: string | null,
  options?: UseDailyPLOptions
): UseDailyPLReturn {
  const currentDate = new Date();
  return useDailyPL(
    portfolioId,
    currentDate.getFullYear(),
    currentDate.getMonth(),
    options
  );
}

/**
 * Hook for multi-month trend analysis
 */
export function useMultiMonthPL(
  portfolioId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  options?: PLServiceOptions
) {
  const [trendData, setTrendData] = useState<MonthlyPLSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendData = useCallback(async () => {
    if (!portfolioId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await dailyPLAnalyticsService.getMultiMonthTrend(
        portfolioId,
        startYear,
        startMonth,
        endYear,
        endMonth,
        options
      );

      if (result.error) {
        setError(result.error);
        setTrendData(null);
      } else {
        setTrendData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setTrendData(null);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, startYear, startMonth, endYear, endMonth, options]);

  useEffect(() => {
    if (portfolioId) {
      fetchTrendData();
    }
  }, [portfolioId, fetchTrendData]);

  return {
    trendData,
    loading,
    error,
    refreshData: fetchTrendData
  };
}

export default useDailyPL;
