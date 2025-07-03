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

// Helper function to calculate total available quantity for a symbol
function getTotalAvailableQuantity(buyLots: BuyQueueItem[]): number {
  return buyLots.reduce((total, lot) => total + lot.quantity, 0);
}

export class DailyPLAnalyticsService {
  private readonly DEFAULT_THRESHOLD = 0.01; // $0.01 threshold for neutral

  /**
   * Get daily P/L data for multiple portfolios (aggregated) for a specific month
   */
  async getAggregatedMonthlyPLData(
    portfolioIds: string[],
    year: number,
    month: number, // 0-11 (January = 0)
    options?: PLServiceOptions
  ): Promise<{ data: MonthlyPLSummary | null; error: string | null }> {
    if (portfolioIds.length === 0) {
      return { data: null, error: 'No portfolios provided for aggregation' };
    }

    if (portfolioIds.length === 1) {
      return this.getMonthlyPLData(portfolioIds[0], year, month, options);
    }

    try {
      debug.info('Daily P/L service called for aggregated monthly data', {
        portfolioIds,
        portfolioCount: portfolioIds.length,
        year,
        month,
        monthName: new Date(year, month).toLocaleString('default', { month: 'long' })
      }, 'DailyPL');

      const portfolioResults: MonthlyPLSummary[] = [];
      const errors: string[] = [];

      // Fetch data from each portfolio
      for (const portfolioId of portfolioIds) {
        const result = await this.getMonthlyPLData(portfolioId, year, month, options);
        if (result.error) {
          errors.push(`Portfolio ${portfolioId}: ${result.error}`);
        } else if (result.data) {
          portfolioResults.push(result.data);
        }
      }

      // If all portfolios failed, return error
      if (portfolioResults.length === 0) {
        return { 
          data: null, 
          error: `Failed to fetch data from all portfolios: ${errors.join('; ')}` 
        };
      }

      // Aggregate the results
      const aggregatedData = this.aggregateMonthlyPLData(portfolioResults, year, month);
      
      return { data: aggregatedData, error: errors.length > 0 ? errors.join('; ') : null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating aggregated P/L data'
      };
    }
  }

  /**
   * Aggregate monthly P/L data from multiple portfolios
   */
  private aggregateMonthlyPLData(
    portfolioResults: MonthlyPLSummary[],
    year: number,
    month: number
  ): MonthlyPLSummary {
    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0));
    
    // Create a map of date -> aggregated daily data
    const dailyDataMap = new Map<string, DailyPLData>();
    
    // Initialize all days of the month with empty data
    for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
      const currentDate = new Date(Date.UTC(year, month, day));
      const dateString = currentDate.toISOString().split('T')[0];
      
      dailyDataMap.set(dateString, {
        date: dateString,
        dayOfMonth: day,
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
      });
    }

    // Aggregate data from all portfolios
    let totalMonthlyPL = 0;
    let totalRealizedPL = 0;
    let totalUnrealizedPL = 0;
    let totalDividends = 0;
    let totalFees = 0;
    let totalVolume = 0;
    let totalTransactions = 0;
    const profitableDaysSet = new Set<string>();
    const lossDaysSet = new Set<string>();
    const daysWithTransactionsSet = new Set<string>();
    const allOrphanTransactions: EnhancedTransaction[] = [];

    // Process each portfolio's data
    for (const portfolioData of portfolioResults) {
      totalMonthlyPL += portfolioData.totalMonthlyPL;
      totalRealizedPL += portfolioData.totalRealizedPL;
      totalUnrealizedPL += portfolioData.totalUnrealizedPL;
      totalDividends += portfolioData.totalDividends;
      totalFees += portfolioData.totalFees;
      totalVolume += portfolioData.totalVolume;
      totalTransactions += portfolioData.totalTransactions;
      allOrphanTransactions.push(...portfolioData.orphanTransactions);

      // Process daily data
      for (const dayData of portfolioData.dailyData) {
        const aggregatedDay = dailyDataMap.get(dayData.date);
        if (aggregatedDay) {
          aggregatedDay.totalPL += dayData.totalPL;
          aggregatedDay.realizedPL += dayData.realizedPL;
          aggregatedDay.unrealizedPL += dayData.unrealizedPL;
          aggregatedDay.dividendIncome += dayData.dividendIncome;
          aggregatedDay.totalFees += dayData.totalFees;
          aggregatedDay.tradeVolume += dayData.tradeVolume;
          aggregatedDay.transactionCount += dayData.transactionCount;
          aggregatedDay.netCashFlow += dayData.netCashFlow;
          aggregatedDay.transactions.push(...dayData.transactions);
          
          if (dayData.hasTransactions) {
            aggregatedDay.hasTransactions = true;
            daysWithTransactionsSet.add(dayData.date);
          }

          // Track profitable/loss days
          if (dayData.totalPL > (this.DEFAULT_THRESHOLD)) {
            profitableDaysSet.add(dayData.date);
          } else if (dayData.totalPL < -(this.DEFAULT_THRESHOLD)) {
            lossDaysSet.add(dayData.date);
          }
        }
      }
    }

    // Update color categories for aggregated daily data
    const dailyData: DailyPLData[] = [];
    for (const [, dayData] of dailyDataMap) {
      dayData.colorCategory = this.determineColorCategory(
        dayData.totalPL, 
        dayData.hasTransactions, 
        this.DEFAULT_THRESHOLD
      );
      dailyData.push(dayData);
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
      daysWithTransactions: daysWithTransactionsSet.size,
      profitableDays: profitableDaysSet.size,
      lossDays: lossDaysSet.size,
      orphanTransactions: allOrphanTransactions
    };
  }

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
          lossDays: 0,
          orphanTransactions: []
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
    const totalUnrealizedPL = 0; // Placeholder
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
                // Process sells before the month to adjust the queue with validation
                const symbol = t.asset.symbol;
                const quantityToSell = t.quantity;
                const queue = buyQueue.get(symbol);
                
                // Validate available quantity before processing historical sells
                const availableQuantity = queue ? getTotalAvailableQuantity(queue) : 0;
                
                if (availableQuantity < quantityToSell) {
                  console.warn(`❌ Invalid historical SELL: insufficient quantity for ${symbol} on ${t.transaction_date}`, {
                    symbol,
                    requestedQuantity: quantityToSell,
                    availableQuantity,
                    transactionId: t.id,
                    date: t.transaction_date
                  });
                  // Add to orphan transactions but continue processing
                  orphanTransactions.push(t);
                } else if (queue) {
                    let remainingQty = quantityToSell;
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

      // Process sells for the day with symbol validation
      const daySells = dayTransactions.filter(t => t.transaction_type === 'sell');
      for (const sell of daySells) {
        const symbol = sell.asset.symbol;
        const quantityToSell = sell.quantity;
        const queue = buyQueue.get(symbol);

        // Validate that we have sufficient quantity for this symbol
        const availableQuantity = queue ? getTotalAvailableQuantity(queue) : 0;
        
        if (availableQuantity < quantityToSell) {
          console.warn(`❌ Invalid SELL: insufficient quantity for ${symbol} on ${dateString}`, {
            symbol,
            requestedQuantity: quantityToSell,
            availableQuantity,
            transactionId: sell.id,
            date: dateString
          });
          debug.warn(`Invalid SELL: insufficient quantity for ${symbol}`, {
            symbol,
            requestedQuantity: quantityToSell,
            availableQuantity,
            transactionId: sell.id,
            transactionDate: sell.transaction_date,
          }, 'DailyPL');
          
          // Add to orphan transactions and skip processing
          orphanTransactions.push(sell);
          continue;
        }

        // Process valid sell transaction
        let remainingQty = quantityToSell;
        
        tradeVolume += sell.total_amount;
        dailyTotalFees += sell.fees || 0;
        netCashFlow += sell.total_amount;

        // Match SELL to FIFO BUYs
        while (remainingQty > 0 && queue!.length > 0) {
          const buyItem = queue![0];
          const matchedQty = Math.min(buyItem.quantity, remainingQty);

          realizedPL += (sell.price - buyItem.price) * matchedQty;

          buyItem.quantity -= matchedQty;
          remainingQty -= matchedQty;

          if (buyItem.quantity === 0) {
            queue!.shift();
          }
        }
        
        // This should not happen due to our validation above, but kept as safety check
        if (remainingQty > 0) {
          debug.warn(`Unexpected unmatched sell quantity for ${symbol} after validation`, {
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