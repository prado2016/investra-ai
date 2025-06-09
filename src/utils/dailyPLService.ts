/**
 * Daily P/L Service for Monthly Calendar View
 * Calculates P/L data for each day of a given month
 */

import { formatDate } from './formatting';
import { 
  calculateEnhancedPLForPeriod,
  type PLCalculationOptions
} from './plCalculations';
import type { 
  Transaction, 
  Position
} from '../types/portfolio';

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

export class DailyPLService {
  private readonly THRESHOLD_FOR_NEUTRAL = 0.01; // $0.01 threshold for neutral vs positive/negative

  /**
   * Calculate daily P/L data for a specific month
   */
  public calculateMonthlyPL(
    year: number,
    month: number, // 0-11 (January = 0)
    transactions: Transaction[],
    positions: Position[],
    options?: PLCalculationOptions
  ): MonthlyPLSummary {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0); // Last day of month
    
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
      const dayData = this.calculateDayPL(currentDate, transactions, positions, options);
      
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
      
      if (dayData.totalPL > this.THRESHOLD_FOR_NEUTRAL) {
        profitableDays++;
      } else if (dayData.totalPL < -this.THRESHOLD_FOR_NEUTRAL) {
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
  public calculateDayPL(
    date: Date,
    transactions: Transaction[],
    positions: Position[],
    options?: PLCalculationOptions
  ): DailyPLData {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter transactions for this specific day
    const dayTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startOfDay && transactionDate <= endOfDay;
    });

    const hasTransactions = dayTransactions.length > 0;

    // Use default options if not provided
    const calculationOptions: PLCalculationOptions = {
      costBasisMethod: options?.costBasisMethod || 'FIFO',
      baseCurrency: options?.baseCurrency || 'USD',
      includeTaxImplications: options?.includeTaxImplications || false,
      ...options
    };

    // Calculate P/L using existing enhanced calculation
    const plResults = calculateEnhancedPLForPeriod(
      dayTransactions,
      positions,
      calculationOptions
    );

    // Calculate additional metrics
    let totalBuyVolume = 0;
    let totalSellVolume = 0;

    dayTransactions.forEach(transaction => {
      if (transaction.type === 'buy') {
        totalBuyVolume += transaction.totalAmount;
      } else if (transaction.type === 'sell') {
        totalSellVolume += transaction.totalAmount;
      }
    });

    const tradeVolume = totalBuyVolume + totalSellVolume;
    const colorCategory = this.determineColorCategory(plResults.totalPL, hasTransactions);

    return {
      date: formatDate(date, 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
      dayOfMonth: date.getDate(),
      totalPL: plResults.totalPL,
      realizedPL: plResults.realizedPL,
      unrealizedPL: plResults.unrealizedPL,
      dividendIncome: plResults.dividendIncome,
      totalFees: plResults.totalFees,
      tradeVolume,
      transactionCount: dayTransactions.length,
      netCashFlow: plResults.netCashFlow,
      hasTransactions,
      colorCategory
    };
  }

  /**
   * Determine color category for calendar day styling
   */
  private determineColorCategory(
    totalPL: number,
    hasTransactions: boolean
  ): 'no-transactions' | 'positive' | 'negative' | 'neutral' {
    if (!hasTransactions) {
      return 'no-transactions';
    }

    if (Math.abs(totalPL) <= this.THRESHOLD_FOR_NEUTRAL) {
      return 'neutral';
    }

    return totalPL > 0 ? 'positive' : 'negative';
  }

  /**
   * Get daily P/L data for the current month
   */
  public getCurrentMonthPL(
    transactions: Transaction[],
    positions: Position[],
    options?: PLCalculationOptions
  ): MonthlyPLSummary {
    const now = new Date();
    return this.calculateMonthlyPL(
      now.getFullYear(),
      now.getMonth(),
      transactions,
      positions,
      options
    );
  }

  /**
   * Get daily P/L data for a specific month/year
   */
  public getMonthPL(
    year: number,
    month: number,
    transactions: Transaction[],
    positions: Position[],
    options?: PLCalculationOptions
  ): MonthlyPLSummary {
    return this.calculateMonthlyPL(year, month, transactions, positions, options);
  }

  /**
   * Calculate P/L trend for multiple months
   */
  public calculateMultiMonthTrend(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
    transactions: Transaction[],
    positions: Position[],
    options?: PLCalculationOptions
  ): MonthlyPLSummary[] {
    const results: MonthlyPLSummary[] = [];
    
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthlyData = this.calculateMonthlyPL(
        currentYear,
        currentMonth,
        transactions,
        positions,
        options
      );
      
      results.push(monthlyData);
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    return results;
  }

  /**
   * Get summary statistics for the service
   */
  public getServiceInfo(): { version: string; supportedFeatures: string[] } {
    return {
      version: '1.0.0',
      supportedFeatures: [
        'Daily P/L calculation',
        'Monthly P/L aggregation',
        'Color categorization for calendar',
        'Multi-month trend analysis',
        'Transaction volume calculation',
        'Configurable P/L calculation options'
      ]
    };
  }
}

// Export singleton instance
export const dailyPLService = new DailyPLService();
export default dailyPLService;
