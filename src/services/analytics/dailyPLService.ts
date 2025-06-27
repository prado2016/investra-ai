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
  '''  async getMonthlyPLData(
    portfolioId: string,
    year: number,
    month: number, // 0-11 (January = 0)
    options?: PLServiceOptions
  ): Promise<{ data: MonthlyPLSummary | null; error: string | null }> {'''
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
        console.error('❌ dailyPLService: Failed to fetch transactions for month data:', transactionsResult.error);
        return { data: null, error: `Failed to fetch transactions: ${transactionsResult.error}` };
      }

      // Get all positions for the portfolio
      const positionsResult = await SupabaseService.position.getPositions(portfolioId);
      if (!positionsResult.success) {
        console.error('❌ dailyPLService: Failed to fetch positions for month data:', positionsResult.error);
        return { data: null, error: `Failed to fetch positions: ${positionsResult.error}` };
      }

      const transactions = transactionsResult.data || [];
      const positions = positionsResult.data || [];

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

      console.log('🔍 dailyPLService: Processing monthly data:', {
        totalTransactions: transactions.length,
        totalPositions: positions.length,
        year,
        month: month + 1, // Display as 1-12 instead of 0-11
        monthName: new Date(year, month).toLocaleString('default', { month: 'long' })
      });

      // Handle completely empty portfolio gracefully
      if (transactions.length === 0 && positions.length === 0) {
        console.log('ℹ️ dailyPLService: No transactions or positions, creating empty month summary');
        const emptyMonthSummary: MonthlyPLSummary = {
          year,
          month,
          monthName: new Date(year, month).toLocaleString('default', { month: 'long' }),
          dailyData: [],
          totalMonthlyPL: 0,
          totalRealizedPL: 0,
          totalUnrealizedPL: 0,
          totalDividends: 0,
          totalFees: 0,
          totalVolume: 0,
          totalTransactions: 0,
          daysWithTransactions: 0,
          profitableDays: 0,
          lossDays: 0
        };
        return { data: emptyMonthSummary, error: null };
      }

      '''      // Calculate monthly P/L data
      const monthlyData = await this.calculateMonthlyPL(
        year,
        month,
        transactions,
        positions,
        options
      );'''

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
  '''  private async calculateMonthlyPL(
    year: number,
    month: number,
    transactions: EnhancedTransaction[],
    positions: EnhancedPosition[],
    options?: PLServiceOptions
  ): Promise<MonthlyPLSummary> {
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
      const dayData = await this.calculateDayPL(
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
  }'''

  /**
   * Calculate P/L data for a specific day
   */
  '''  private processDayTrades(
    dayTransactions: EnhancedTransaction[],
    positions: EnhancedPosition[]
  ): { realizedPL: number; remainingTransactions: EnhancedTransaction[] } {
    let realizedPL = 0;
    const remainingTransactions: EnhancedTransaction[] = [];
    const tradesBySymbol: { [symbol: string]: EnhancedTransaction[] } = {};

    for (const t of dayTransactions) {
      const symbol = t.asset.symbol;
      if (!tradesBySymbol[symbol]) {
        tradesBySymbol[symbol] = [];
      }
      tradesBySymbol[symbol].push(t);
    }

    for (const symbol in tradesBySymbol) {
      const trades = tradesBySymbol[symbol];
      const buys = trades.filter(t => t.transaction_type === 'buy').sort((a, b) => a.total_amount - b.total_amount);
      const sells = trades.filter(t => t.transaction_type === 'sell').sort((a, b) => a.total_amount - b.total_amount);

      while (buys.length > 0 && sells.length > 0) {
        const buy = buys.shift()!;
        const sell = sells.shift()!;
        
        const matchedQuantity = Math.min(buy.quantity, sell.quantity);
        const buyPrice = buy.price;
        const sellPrice = sell.price;

        realizedPL += (sellPrice - buyPrice) * matchedQuantity;

        if (buy.quantity > matchedQuantity) {
          buys.unshift({ ...buy, quantity: buy.quantity - matchedQuantity });
        }
        if (sell.quantity > matchedQuantity) {
          sells.unshift({ ...sell, quantity: sell.quantity - matchedQuantity });
        }
      }
      remainingTransactions.push(...buys, ...sells);
    }

    return { realizedPL, remainingTransactions };
  }

  '''  '''  private async calculateDayPL(
    date: Date,
    transactions: EnhancedTransaction[],
    positions: EnhancedPosition[],
    threshold: number
  ): Promise<DailyPLData> {''''''''
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

    '''    const { realizedPL: dayTradePL, remainingTransactions } = this.processDayTrades(dayTransactions, positions);
    realizedPL += dayTradePL;

    // Process each transaction
    remainingTransactions.forEach(transaction => {
      const totalAmount = transaction.total_amount;
      const fees = transaction.fees || 0;
      
      totalFees += fees;
      
      switch (transaction.transaction_type) {
        case 'buy': {
          tradeVolume += totalAmount;
          netCashFlow -= totalAmount; // Cash outflow
          break;
        }
          
        case 'sell': {
          tradeVolume += totalAmount;
          netCashFlow += totalAmount; // Cash inflow
          
          // P/L for sells is now handled by FIFO logic below
          break;
        }
          
        case 'dividend': {
          dividendIncome += totalAmount;
          netCashFlow += totalAmount; // Cash inflow
          break;
        }
        
        case 'option_expired': {
          // When an option expires, we need to check if it was a short or long position
          const position = positions.find(p => p.asset_id === transaction.asset_id);
          if (position) {
            if (position.quantity < 0) {
              // This was a short position that expired - we keep the premium (profit)
              // The original sell premium is already counted in realized P/L
              // No additional P/L calculation needed for expiration
            } else {
              // This was a long position that expired - loss equals the premium paid
              const premiumLoss = position.quantity * position.average_cost_basis;
              realizedPL -= premiumLoss; // Loss from expired long option
            }
          }
          break;
        }
          
        default:
          // Handle other transaction types as needed
          break;
      }
    });'''

    '''    const sells = remainingTransactions.filter(t => t.transaction_type === 'sell');
    if (sells.length > 0) {
      realizedPL += await this.calculateFIFOPL(sells, transactions);
    }

    // For unrealized P/L, we would need current market prices
    // This is simplified - in practice, you'd fetch current prices
    const unrealizedPL = 0; // Placeholder'''

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
  '''  private async calculateFIFOPL(
    sellTransactions: EnhancedTransaction[],
    allTransactions: EnhancedTransaction[]
  ): Promise<number> {
    let realizedPL = 0;
    const buys = allTransactions.filter(t => t.transaction_type === 'buy').sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    for (const sell of sellTransactions) {
      let sellQuantity = sell.quantity;
      const sellPrice = sell.price;

      for (const buy of buys) {
        if (buy.asset.symbol !== sell.asset.symbol || buy.quantity === 0) {
          continue;
        }

        const matchQuantity = Math.min(sellQuantity, buy.quantity);
        const buyPrice = buy.price;

        realizedPL += (sellPrice - buyPrice) * matchQuantity;

        buy.quantity -= matchQuantity;
        sellQuantity -= matchQuantity;

        if (sellQuantity === 0) {
          break;
        }
      }
    }

    return realizedPL;
  }

  private determineColorCategory('''
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
      console.log('🔍 dailyPLService.getDayPLDetails called:', { 
        portfolioId, 
        date: date.toISOString(), 
        dateString: date.toISOString().split('T')[0] 
      });

      // Get transactions for the portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        console.error('❌ dailyPLService: Failed to fetch transactions:', transactionsResult.error);
        return { data: null, error: `Failed to fetch transactions: ${transactionsResult.error}` };
      }

      // Get positions for the portfolio
      const positionsResult = await SupabaseService.position.getPositions(portfolioId);
      if (!positionsResult.success) {
        console.error('❌ dailyPLService: Failed to fetch positions:', positionsResult.error);
        return { data: null, error: `Failed to fetch positions: ${positionsResult.error}` };
      }

      const transactions = transactionsResult.data || [];
      const positions = positionsResult.data || [];

      console.log('🔍 dailyPLService: Data fetched successfully:', {
        transactionCount: transactions.length,
        positionCount: positions.length
      });

      // Handle empty data gracefully
      if (transactions.length === 0 && positions.length === 0) {
        console.log('ℹ️ dailyPLService: No transactions or positions found, returning empty day data');
        const emptyDayData: DailyPLData = {
          date: date.toISOString().split('T')[0],
          dayOfMonth: date.getDate(),
          totalPL: 0,
          realizedPL: 0,
          unrealizedPL: 0,
          dividendIncome: 0,
          totalFees: 0,
          tradeVolume: 0,
          transactionCount: 0,
          netCashFlow: 0,
          hasTransactions: false,
          colorCategory: 'no-transactions',
          transactions: []
        };
        return { data: emptyDayData, error: null };
      }

      const threshold = options?.threshold || this.DEFAULT_THRESHOLD;
      '''      const dayData = await this.calculateDayPL(
        date,
        transactionsResult.data,
        positionsResult.data,
        threshold
      );'''

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
