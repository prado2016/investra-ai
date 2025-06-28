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
  orphanTransactions: EnhancedTransaction[];
}

export interface PLServiceOptions {
  baseCurrency?: string;
  threshold?: number; // Threshold for neutral vs positive/negative
}

// Represents a buy transaction in the FIFO queue
interface BuyQueueItem {
  quantity: number;
  price: number;
  transaction: EnhancedTransaction;
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

      // Get all transactions for the portfolio, sorted by date
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        console.error('❌ dailyPLService: Failed to fetch transactions for month data:', transactionsResult.error);
        return { data: null, error: `Failed to fetch transactions: ${transactionsResult.error}` };
      }

      const transactions = transactionsResult.data || [];

      // Handle completely empty portfolio gracefully
      if (transactions.length === 0) {
        console.log('ℹ️ dailyPLService: No transactions, creating empty month summary');
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

      // Calculate monthly P/L data
      const monthlyData = this.calculateMonthlyPL(
        year,
        month,
        transactions,
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
   * Calculate daily P/L data for a specific month using a stateful FIFO queue.
   */
  private calculateMonthlyPL(
    year: number,
    month: number,
    transactions: EnhancedTransaction[],
    options?: PLServiceOptions
  ): MonthlyPLSummary {
    const threshold = options?.threshold || this.DEFAULT_THRESHOLD;
    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0));

    const dailyData: DailyPLData[] = [];
    let totalMonthlyPL = 0;
    let totalRealizedPL = 0;
    let totalUnrealizedPL = 0; // Placeholder
    let totalDividends = 0;
    let totalFees = 0;
    let totalVolume = 0;
    let totalTransactions = 0;
    let daysWithTransactions = 0;
    let profitableDays = 0;
    let lossDays = 0;
    const orphanTransactions: EnhancedTransaction[] = [];

    // FIFO queue for buys, stateful across the month
    const buyQueue = new Map<string, BuyQueueItem[]>();

    // Pre-populate the buy queue with transactions before the start of the month
    for (const t of transactions) {
        const transactionDate = new Date(t.transaction_date);
        if (transactionDate < startOfMonth) {
            if (t.transaction_type === 'buy') {
                const symbol = t.asset.symbol;
                if (!buyQueue.has(symbol)) {
                    buyQueue.set(symbol, []);
                }
                buyQueue.get(symbol)!.push({
                    quantity: t.quantity,
                    price: t.price,
                    transaction: t,
                });
            } else if (t.transaction_type === 'sell') {
                // Process sells before the month to adjust the queue
                let remainingQty = t.quantity;
                const symbol = t.asset.symbol;
                const queue = buyQueue.get(symbol);

                if (queue) {
                    while (remainingQty > 0 && queue.length > 0) {
                        const buyItem = queue[0];
                        const matchedQty = Math.min(buyItem.quantity, remainingQty);
                        buyItem.quantity -= matchedQty;
                        remainingQty -= matchedQty;
                        if (buyItem.quantity === 0) {
                            queue.shift();
                        }
                    }
                }
            }
        }
    }


    // Iterate through each day of the month
    for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
      const currentDate = new Date(Date.UTC(year, month, day));
      const dateString = currentDate.toISOString().split('T')[0];

      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.transaction_date).toISOString().split('T')[0];
        return tDate === dateString;
      });

      let realizedPL = 0;
      let dividendIncome = 0;
      let dailyTotalFees = 0;
      let tradeVolume = 0;
      let netCashFlow = 0;

      // Process buys for the day
      const dayBuys = dayTransactions.filter(t => t.transaction_type === 'buy');
      for (const buy of dayBuys) {
        const symbol = buy.asset.symbol;
        if (!buyQueue.has(symbol)) {
          buyQueue.set(symbol, []);
        }
        buyQueue.get(symbol)!.push({
          quantity: buy.quantity,
          price: buy.price,
          transaction: buy,
        });
        tradeVolume += buy.total_amount;
        dailyTotalFees += buy.fees || 0;
        netCashFlow -= buy.total_amount;
      }

      // Process sells for the day
      const daySells = dayTransactions.filter(t => t.transaction_type === 'sell');
      for (const sell of daySells) {
        let remainingQty = sell.quantity;
        const symbol = sell.asset.symbol;
        const queue = buyQueue.get(symbol);

        tradeVolume += sell.total_amount;
        dailyTotalFees += sell.fees || 0;
        netCashFlow += sell.total_amount;

        if (queue) {
          while (remainingQty > 0 && queue.length > 0) {
            const buyItem = queue[0];
            const matchedQty = Math.min(buyItem.quantity, remainingQty);

            realizedPL += (sell.price - buyItem.price) * matchedQty;

            buyItem.quantity -= matchedQty;
            remainingQty -= matchedQty;

            if (buyItem.quantity === 0) {
              queue.shift();
            }
          }
        }
        if (remainingQty > 0) {
            debug.warn(`Unmatched sell quantity for ${symbol}`, {
                unmatchedQuantity: remainingQty,
                transactionId: sell.id,
                transactionDate: sell.transaction_date,
            }, 'DailyPL');
            orphanTransactions.push({ ...sell, quantity: remainingQty });
        }
      }

      // Process dividends and other transactions
      const dayDividends = dayTransactions.filter(t => t.transaction_type === 'dividend');
      for (const dividend of dayDividends) {
        dividendIncome += dividend.total_amount;
        dailyTotalFees += dividend.fees || 0;
        netCashFlow += dividend.total_amount;
      }

      const hasTransactions = dayTransactions.length > 0;
      const totalPL = realizedPL + dividendIncome - dailyTotalFees;
      const colorCategory = this.determineColorCategory(totalPL, hasTransactions, threshold);

      const dayData: DailyPLData = {
        date: dateString,
        dayOfMonth: day,
        totalPL,
        realizedPL,
        unrealizedPL: 0, // Placeholder
        dividendIncome,
        totalFees: dailyTotalFees,
        tradeVolume,
        transactionCount: dayTransactions.length,
        netCashFlow,
        hasTransactions,
        colorCategory,
        transactions: dayTransactions,
      };

      dailyData.push(dayData);

      // Accumulate monthly totals
      totalMonthlyPL += totalPL;
      totalRealizedPL += realizedPL;
      totalDividends += dividendIncome;
      totalFees += dailyTotalFees;
      totalVolume += tradeVolume;
      totalTransactions += dayTransactions.length;

      if (hasTransactions) {
        daysWithTransactions++;
      }

      if (totalPL > threshold) {
        profitableDays++;
      } else if (totalPL < -threshold) {
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
      lossDays,
      orphanTransactions,
    };
  }

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
      console.log('🔍 dailyPLService.getDayPLDetails called:', {
        portfolioId,
        date: date.toISOString(),
        dateString: date.toISOString().split('T')[0]
      });

      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();

      const monthlyResult = await this.getMonthlyPLData(portfolioId, year, month, options);

      if (monthlyResult.error || !monthlyResult.data) {
          return { data: null, error: monthlyResult.error || "Failed to compute monthly data." };
      }

      const dateString = date.toISOString().split('T')[0];
      const dayData = monthlyResult.data.dailyData.find(d => d.date === dateString);

      if (!dayData) {
          return { data: null, error: `No data found for date ${dateString}`};
      }

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
      version: '2.1.0', // Updated version
      integration: 'Supabase',
      supportedFeatures: [
        'Daily P/L calculation with stateful FIFO logic',
        'Monthly P/L aggregation',
        'Color categorization for calendar display',
        'Multi-month trend analysis',
        'Transaction volume calculation',
        'Realized P/L breakdown',
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