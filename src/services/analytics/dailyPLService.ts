/**
 * Enhanced Daily P/L Service for Supabase Integration
 * Calculates daily P/L data from Supabase transactions and positions
 * Supports monthly calendar view with color-coded daily performance
 */

import { SupabaseService } from '../supabaseService';
import { debug } from '../../utils/debug';
import type { 
  Transaction as DBTransaction, 
  Position as DBPosition, 
  Asset as DBAsset 
} from '../../lib/database/types';

// Enhanced transaction type with asset data
export interface EnhancedTransaction extends DBTransaction {
  asset: DBAsset;
}

// Enhanced position type with asset data  
export interface EnhancedPosition extends DBPosition {
  asset: DBAsset;
}

export interface DailyPLData {
  date: string; // YYYY-MM-DD format
  dayOfMonth: number;
  totalPL: number;
  realizedPL: number;
  unrealizedPL: number;
  dividendIncome: number;
  totalFees: number;
  tradeVolume: number;
  transactionCount: number;
  netCashFlow: number;
  hasTransactions: boolean;
  colorCategory: 'no-transactions' | 'positive' | 'negative' | 'neutral';
  transactions: EnhancedTransaction[];
}

export interface MonthlyPLSummary {
  year: number;
  month: number; // 0-11 (January = 0)
  monthName: string;
  dailyData: DailyPLData[];
  totalMonthlyPL: number;
  totalRealizedPL: number;
  totalUnrealizedPL: number;
  totalDividends: number;
  totalFees: number;
  totalVolume: number;
  totalTransactions: number;
  daysWithTransactions: number;
  profitableDays: number;
  lossDays: number;
}

export interface PLServiceOptions {
  baseCurrency?: string;
  threshold?: number; // Threshold for neutral vs positive/negative
}

export class DailyPLAnalyticsService {
  private readonly DEFAULT_THRESHOLD = 0.01; // $0.01 threshold for neutral

  /**
   * Get daily P/L data for a specific portfolio and month
   */
  async getMonthlyPLData(
    portfolioId: string,
    year: number,
    month: number, // 0-11 (January = 0)
    options?: PLServiceOptions
  ): Promise<{ data: MonthlyPLSummary | null; error: string | null }> {
      try {
      // Log the service call with detailed information
      debug.info('Daily P/L service called for monthly data', {
        portfolioId,
        year,
        month,
        monthName: new Date(year, month).toLocaleString('default', { month: 'long' })
      }, 'DailyPL');
      console.log('🔍 DAILY_PL_DEBUG: getMonthlyPLData called:', { year, month, portfolioId, timestamp: new Date().toISOString() });

      // Get all transactions for the portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        return { data: null, error: transactionsResult.error };
      }

      // Get all positions for the portfolio
      const positionsResult = await SupabaseService.position.getPositions(portfolioId);
      if (!positionsResult.success) {
        return { data: null, error: positionsResult.error };
      }

      const transactions = transactionsResult.data;
      const positions = positionsResult.data;

      // Log the fetched data with specific focus on target date
      debug.info('Fetched portfolio data for analysis', {
        totalTransactions: transactions.length,
        totalPositions: positions.length,
        april28Transactions: transactions.filter(t => {
          const dateStr = typeof t.transaction_date === 'string' 
            ? t.transaction_date.split('T')[0] 
            : new Date(t.transaction_date).toISOString().split('T')[0];
          return dateStr === '2025-04-28';
        }).length,
        sampleTransactions: transactions.slice(0, 3).map(t => ({
          id: t.id,
          date: t.transaction_date,
          type: t.transaction_type,
          symbol: t.asset?.symbol
        }))
      }, 'DailyPL');
      
      // Enhanced console logging for immediate visibility
      const april28Count = transactions.filter(t => {
        const dateStr = typeof t.transaction_date === 'string' 
          ? t.transaction_date.split('T')[0] 
          : new Date(t.transaction_date).toISOString().split('T')[0];
        return dateStr === '2025-04-28';
      }).length;
      
      console.log('🔍 DAILY_PL_DEBUG: Fetched data analysis:', {
        totalTransactions: transactions.length,
        april28TransactionCount: april28Count,
        sampleDates: transactions.slice(0, 5).map(t => ({
          date: t.transaction_date,
          symbol: t.asset?.symbol
        })),
        timestamp: new Date().toISOString()
      });

      // Calculate monthly P/L data
      const monthlyData = this.calculateMonthlyPL(
        year,
        month,
        transactions,
        positions,
        options
      );

      return { data: monthlyData, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating P/L data'
      };
    }
  }

  /**
   * Calculate daily P/L data for a specific month
   */
  private calculateMonthlyPL(
    year: number,
    month: number,
    transactions: EnhancedTransaction[],
    positions: EnhancedPosition[],
    options?: PLServiceOptions
  ): MonthlyPLSummary {
    const threshold = options?.threshold || this.DEFAULT_THRESHOLD;
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    const dailyData: DailyPLData[] = [];
    let totalMonthlyPL = 0;
    let totalRealizedPL = 0;
    let totalUnrealizedPL = 0;
    let totalDividends = 0;
    let totalFees = 0;
    let totalVolume = 0;
    let totalTransactions = 0;
    let daysWithTransactions = 0;
    let profitableDays = 0;
    let lossDays = 0;

    // Iterate through each day of the month
    for (let day = 1; day <= endOfMonth.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const dayData = this.calculateDayPL(
        currentDate,
        transactions,
        positions,
        threshold
      );
      
      dailyData.push(dayData);
      
      // Accumulate monthly totals
      totalMonthlyPL += dayData.totalPL;
      totalRealizedPL += dayData.realizedPL;
      totalUnrealizedPL += dayData.unrealizedPL;
      totalDividends += dayData.dividendIncome;
      totalFees += dayData.totalFees;
      totalVolume += dayData.tradeVolume;
      totalTransactions += dayData.transactionCount;
      
      if (dayData.hasTransactions) {
        daysWithTransactions++;
      }
      
      if (dayData.totalPL > threshold) {
        profitableDays++;
      } else if (dayData.totalPL < -threshold) {
        lossDays++;
      }
    }

    return {
      year,
      month,
      monthName: startOfMonth.toLocaleString('default', { month: 'long' }),
      dailyData,
      totalMonthlyPL,
      totalRealizedPL,
      totalUnrealizedPL,
      totalDividends,
      totalFees,
      totalVolume,
      totalTransactions,
      daysWithTransactions,
      profitableDays,
      lossDays
    };
  }

  /**
   * Calculate P/L data for a specific day
   */
  private calculateDayPL(
    date: Date,
    transactions: EnhancedTransaction[],
    positions: EnhancedPosition[],
    threshold: number
  ): DailyPLData {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Log the day calculation inputs for troubleshooting
    debug.debug('Calculating daily P/L for specific date', {
      targetDate: date.toISOString(),
      targetDateString: dateString,
      totalTransactions: transactions.length,
      sampleTransactions: transactions.slice(0, 3).map(t => ({
        id: t.id,
        date: t.transaction_date,
        type: t.transaction_type,
        symbol: t.asset?.symbol
      }))
    }, 'DailyPL');
    
    // Filter transactions for this specific day
    const dayTransactions = transactions.filter(transaction => {
      // Since transaction_date is a DATE type from PostgreSQL,
      // Supabase returns it as a string in YYYY-MM-DD format
      let transactionDateString: string;
      
      if (typeof transaction.transaction_date === 'string') {
        // If it's a string (which it should be from Supabase), just extract the date part
        transactionDateString = transaction.transaction_date.includes('T') 
          ? transaction.transaction_date.split('T')[0]
          : transaction.transaction_date;
      } else {
        // Fallback: if it's somehow a Date object, convert it properly
        const transactionDate = new Date(transaction.transaction_date);
        transactionDateString = transactionDate.toISOString().split('T')[0];
      }
      
      const matches = transactionDateString === dateString;
      
      // Log detailed transaction filtering for specific target date
      if (dateString === '2025-04-28') {
        debug.debug('Transaction date filtering for April 28, 2025', {
          transactionId: transaction.id,
          originalDate: transaction.transaction_date,
          extractedDate: transactionDateString,
          targetDate: dateString,
          matches,
          symbol: transaction.asset?.symbol
        }, 'DailyPL');
      }
      
      return matches;
    });

    const hasTransactions = dayTransactions.length > 0;
    
    // Log the transaction filtering results
    if (dateString === '2025-04-28') {
      debug.info('Transaction filtering results for April 28, 2025', {
        totalTransactions: transactions.length,
        filteredTransactions: dayTransactions.length,
        filteredTransactionIds: dayTransactions.map(t => t.id),
        hasTransactions
      }, 'DailyPL');
      
      // Enhanced console logging for immediate visibility
      console.log('🔍 DAILY_PL_DEBUG: April 28, 2025 filtering results:', {
        dateString,
        totalTransactionsAvailable: transactions.length,
        filteredForDay: dayTransactions.length,
        hasTransactions,
        sampleFilteredTransactions: dayTransactions.slice(0, 3).map(t => ({
          id: t.id,
          date: t.transaction_date,
          type: t.transaction_type,
          symbol: t.asset?.symbol,
          amount: t.quantity
        })),
        timestamp: new Date().toISOString()
      });
    }

    // Calculate daily metrics
    let realizedPL = 0;
    let dividendIncome = 0;
    let totalFees = 0;
    let tradeVolume = 0;
    let netCashFlow = 0;

    // Process each transaction
    dayTransactions.forEach(transaction => {
      const totalAmount = transaction.total_amount;
      const fees = transaction.fees || 0;
      
      totalFees += fees;
      
      switch (transaction.transaction_type) {
        case 'buy':
          tradeVolume += totalAmount;
          netCashFlow -= totalAmount; // Cash outflow
          break;
          
        case 'sell':
          tradeVolume += totalAmount;
          netCashFlow += totalAmount; // Cash inflow
          
          // Calculate realized P/L for sells
          // Note: This is a simplified calculation
          // In a real system, you'd need to match with specific buy lots
          const position = positions.find(p => p.asset_id === transaction.asset_id);
          if (position) {
            const sellProceeds = totalAmount - fees;
            const costBasis = transaction.quantity * position.average_cost_basis;
            realizedPL += sellProceeds - costBasis;
          }
          break;
          
        case 'dividend':
          dividendIncome += totalAmount;
          netCashFlow += totalAmount; // Cash inflow
          break;
          
        default:
          // Handle other transaction types as needed
          break;
      }
    });

    // For unrealized P/L, we would need current market prices
    // This is simplified - in practice, you'd fetch current prices
    const unrealizedPL = 0; // Placeholder

    const totalPL = realizedPL + unrealizedPL + dividendIncome - totalFees;
    const colorCategory = this.determineColorCategory(totalPL, hasTransactions, threshold);

    const result = {
      date: dateString,
      dayOfMonth: date.getDate(),
      totalPL,
      realizedPL,
      unrealizedPL,
      dividendIncome,
      totalFees,
      tradeVolume,
      transactionCount: dayTransactions.length,
      netCashFlow,
      hasTransactions,
      colorCategory,
      transactions: dayTransactions
    };

    // Log final result for April 28, 2025
    if (dateString === '2025-04-28') {
      console.log('🔍 DAILY_PL_DEBUG: Final result for April 28, 2025:', {
        ...result,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  }

  /**
   * Determine color category for calendar day styling
   */
  private determineColorCategory(
    totalPL: number,
    hasTransactions: boolean,
    threshold: number
  ): 'no-transactions' | 'positive' | 'negative' | 'neutral' {
    if (!hasTransactions) {
      return 'no-transactions';
    }

    if (Math.abs(totalPL) <= threshold) {
      return 'neutral';
    }

    return totalPL > 0 ? 'positive' : 'negative';
  }

  /**
   * Get daily P/L data for the current month
   */
  async getCurrentMonthPL(
    portfolioId: string,
    options?: PLServiceOptions
  ): Promise<{ data: MonthlyPLSummary | null; error: string | null }> {
    const now = new Date();
    return this.getMonthlyPLData(
      portfolioId,
      now.getFullYear(),
      now.getMonth(),
      options
    );
  }

  /**
   * Get daily P/L data for a specific day
   */
  async getDayPLDetails(
    portfolioId: string,
    date: Date,
    options?: PLServiceOptions
  ): Promise<{ data: DailyPLData | null; error: string | null }> {
    try {
      // Get transactions for the portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        return { data: null, error: transactionsResult.error };
      }

      // Get positions for the portfolio
      const positionsResult = await SupabaseService.position.getPositions(portfolioId);
      if (!positionsResult.success) {
        return { data: null, error: positionsResult.error };
      }

      const threshold = options?.threshold || this.DEFAULT_THRESHOLD;
      const dayData = this.calculateDayPL(
        date,
        transactionsResult.data,
        positionsResult.data,
        threshold
      );

      return { data: dayData, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating day P/L'
      };
    }
  }

  /**
   * Calculate P/L trend for multiple months
   */
  async getMultiMonthTrend(
    portfolioId: string,
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
    options?: PLServiceOptions
  ): Promise<{ data: MonthlyPLSummary[] | null; error: string | null }> {
    try {
      const results: MonthlyPLSummary[] = [];
      
      let currentYear = startYear;
      let currentMonth = startMonth;
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        const monthData = await this.getMonthlyPLData(
          portfolioId,
          currentYear,
          currentMonth,
          options
        );
        
        if (!monthData.data) {
          return { data: null, error: monthData.error };
        }
        
        results.push(monthData.data);
        
        // Move to next month
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
      
      return { data: results, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating multi-month trend'
      };
    }
  }

  /**
   * Get service information and capabilities
   */
  getServiceInfo(): { 
    version: string; 
    supportedFeatures: string[];
    integration: string;
  } {
    return {
      version: '2.0.0',
      integration: 'Supabase',
      supportedFeatures: [
        'Daily P/L calculation from Supabase data',
        'Monthly P/L aggregation',
        'Color categorization for calendar display',
        'Multi-month trend analysis',
        'Transaction volume calculation',
        'Realized/Unrealized P/L breakdown',
        'Dividend income tracking',
        'Trading fees calculation',
        'Net cash flow analysis'
      ]
    };
  }
}

// Export singleton instance
export const dailyPLAnalyticsService = new DailyPLAnalyticsService();
export default dailyPLAnalyticsService;
