/**
 * React Hook for Daily P/L Analytics
 * Provides easy access to daily P/L data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { dailyPLAnalyticsService, type MonthlyPLSummary, type DailyPLData, type PLServiceOptions } from '../services/analytics/dailyPLService';

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
  refreshData: () => Promise<void>;
  getMonthData: (year: number, month: number) => Promise<void>;
  getDayDetails: (date: Date) => Promise<DailyPLData | null>;
}

/**
 * Hook for accessing monthly P/L data
 */
export function useDailyPL(
  portfolioId: string,
  year?: number,
  month?: number,
  options?: UseDailyPLOptions
): UseDailyPLReturn {
  const [monthlyData, setMonthlyData] = useState<MonthlyPLSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use current month/year if not provided
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth();

  const fetchMonthData = useCallback(async (fetchYear: number, fetchMonth: number) => {
    if (!portfolioId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await dailyPLAnalyticsService.getMonthlyPLData(
        portfolioId,
        fetchYear,
        fetchMonth,
        options
      );

      if (result.error) {
        setError(result.error);
        setMonthlyData(null);
      } else {
        setMonthlyData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setMonthlyData(null);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, options]);

  const refreshData = useCallback(async () => {
    await fetchMonthData(targetYear, targetMonth);
  }, [fetchMonthData, targetYear, targetMonth]);

  const getMonthData = useCallback(async (newYear: number, newMonth: number) => {
    await fetchMonthData(newYear, newMonth);
  }, [fetchMonthData]);

  const getDayDetails = useCallback(async (date: Date): Promise<DailyPLData | null> => {
    if (!portfolioId) return null;

    try {
      const result = await dailyPLAnalyticsService.getDayPLDetails(portfolioId, date, options);
      return result.data;
    } catch (err) {
      console.error('Error fetching day details:', err);
      return null;
    }
  }, [portfolioId, options]);

  // Initial data fetch
  useEffect(() => {
    if (portfolioId) {
      fetchMonthData(targetYear, targetMonth);
    }
  }, [portfolioId, targetYear, targetMonth, fetchMonthData]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (options?.autoRefresh && portfolioId) {
      const interval = setInterval(refreshData, options.refreshInterval || 60000); // Default 1 minute
      return () => clearInterval(interval);
    }
  }, [options?.autoRefresh, options?.refreshInterval, portfolioId, refreshData]);

  return {
    monthlyData,
    dailyData: monthlyData?.dailyData || [],
    loading,
    error,
    refreshData,
    getMonthData,
    getDayDetails
  };
}

/**
 * Hook for accessing current month P/L data
 */
export function useCurrentMonthPL(
  portfolioId: string,
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
