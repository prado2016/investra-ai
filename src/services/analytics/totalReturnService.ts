/**
 * Total Return Analytics Service
 * Calculates comprehensive portfolio performance metrics
 */

import { SupabaseService } from '../supabaseService';
import type { 
  Transaction as DBTransaction, 
  Position as DBPosition
} from '../../lib/database/types';

export interface TotalReturnData {
  totalReturn: number;
  totalReturnPercent: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedPL: number;
  totalUnrealizedPL: number;
  totalDividends: number;
  totalFees: number;
  netCashFlow: number;
  firstInvestmentDate: Date | null;
  daysSinceFirstInvestment: number;
  annualizedReturn?: number;
}

export interface TotalReturnOptions {
  includeDividends?: boolean;
  includeFees?: boolean;
  baseCurrency?: string;
}

export class TotalReturnAnalyticsService {
  /**
   * Calculate comprehensive total return for a portfolio
   */
  async calculateTotalReturn(
    portfolioId: string,
    options?: TotalReturnOptions
  ): Promise<{ data: TotalReturnData | null; error: string | null }> {
    try {
      console.log('🔍 TotalReturn: Calculating total return for portfolio:', portfolioId);

      // Get all transactions for the portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        console.error('❌ TotalReturn: Failed to fetch transactions:', transactionsResult.error);
        return { data: null, error: `Failed to fetch transactions: ${transactionsResult.error}` };
      }

      // Get all positions for the portfolio
      const positionsResult = await SupabaseService.position.getPositions(portfolioId);
      if (!positionsResult.success) {
        console.error('❌ TotalReturn: Failed to fetch positions:', positionsResult.error);
        return { data: null, error: `Failed to fetch positions: ${positionsResult.error}` };
      }

      const transactions = transactionsResult.data || [];
      const positions = positionsResult.data || [];

      console.log('🔍 TotalReturn: Data fetched:', {
        transactionCount: transactions.length,
        positionCount: positions.length
      });

      // Handle empty portfolio
      if (transactions.length === 0 && positions.length === 0) {
        const emptyData: TotalReturnData = {
          totalReturn: 0,
          totalReturnPercent: 0,
          totalInvested: 0,
          totalCurrentValue: 0,
          totalRealizedPL: 0,
          totalUnrealizedPL: 0,
          totalDividends: 0,
          totalFees: 0,
          netCashFlow: 0,
          firstInvestmentDate: null,
          daysSinceFirstInvestment: 0
        };
        return { data: emptyData, error: null };
      }

      // Calculate metrics
      const totalReturnData = this.calculateReturnMetrics(transactions, positions, options);
      
      console.log('✅ TotalReturn: Calculated successfully:', {
        totalReturn: totalReturnData.totalReturn,
        totalReturnPercent: totalReturnData.totalReturnPercent,
        totalInvested: totalReturnData.totalInvested
      });

      return { data: totalReturnData, error: null };
    } catch (error) {
      console.error('❌ TotalReturn: Error calculating total return:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating total return'
      };
    }
  }

  /**
   * Calculate return metrics from transactions and positions
   */
  private calculateReturnMetrics(
    transactions: DBTransaction[],
    positions: DBPosition[],
    options?: TotalReturnOptions
  ): TotalReturnData {
    const includeDividends = options?.includeDividends ?? true;
    const includeFees = options?.includeFees ?? true;

    let totalInvested = 0;  // Total cash invested (buy transactions)
    // let totalWithdrawn = 0; // Total cash withdrawn (sell transactions) - currently unused
    let totalRealizedPL = 0;
    let totalDividends = 0;
    let totalFees = 0;
    let netCashFlow = 0;
    let firstInvestmentDate: Date | null = null;

    // Process all transactions
    transactions.forEach(transaction => {
      const totalAmount = transaction.total_amount;
      const fees = transaction.fees || 0;
      const transactionDate = new Date(transaction.transaction_date);

      if (includeFees) {
        totalFees += fees;
      }

      switch (transaction.transaction_type) {
        case 'buy':
          totalInvested += totalAmount;
          netCashFlow -= totalAmount; // Cash outflow
          
          // Track first investment date
          if (!firstInvestmentDate || transactionDate < firstInvestmentDate) {
            firstInvestmentDate = transactionDate;
          }
          break;

        case 'sell': {
          totalWithdrawn += totalAmount;
          netCashFlow += totalAmount; // Cash inflow
          
          // Calculate realized P/L for sells
          // This is a simplified calculation - in practice you'd match with specific lots
          const position = positions.find(p => p.asset_id === transaction.asset_id);
          if (position) {
            const sellProceeds = totalAmount - fees;
            const costBasis = transaction.quantity * position.average_cost_basis;
            const realizedGain = sellProceeds - costBasis;
            totalRealizedPL += realizedGain;
          }
          break;
        }

        case 'dividend':
          if (includeDividends) {
            totalDividends += totalAmount;
            netCashFlow += totalAmount; // Cash inflow
          }
          break;

        case 'option_expired': {
          // Option expired - total loss of premium paid
          // The total_amount should be 0, but we track it as a realized loss
          const position = positions.find(p => p.asset_id === transaction.asset_id);
          if (position) {
            const premiumLoss = transaction.quantity * position.average_cost_basis;
            totalRealizedPL -= premiumLoss;
          }
          break;
        }

        default:
          // Handle other transaction types as needed
          break;
      }
    });

    // Calculate current value of positions (unrealized)
    let totalCurrentValue = 0;
    let totalUnrealizedPL = 0;

    positions.forEach(position => {
      // For now, use average cost basis as current price (placeholder)
      // In a real implementation, you'd fetch current market prices
      const currentPrice = position.average_cost_basis; // Placeholder
      const currentValue = position.quantity * currentPrice;
      const costBasis = position.total_cost_basis;
      const unrealizedGain = currentValue - costBasis;

      totalCurrentValue += currentValue;
      totalUnrealizedPL += unrealizedGain;
    });

    // Calculate total return
    const totalReturn = totalRealizedPL + totalUnrealizedPL + (includeDividends ? totalDividends : 0) - (includeFees ? totalFees : 0);
    
    // Calculate return percentage
    const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Calculate days since first investment
    const daysSinceFirstInvestment = firstInvestmentDate 
      ? Math.floor((Date.now() - (firstInvestmentDate as Date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate annualized return if we have enough time data
    let annualizedReturn: number | undefined;
    if (daysSinceFirstInvestment > 365 && totalInvested > 0) {
      const years = daysSinceFirstInvestment / 365;
      const totalReturnRatio = totalReturn / totalInvested;
      annualizedReturn = (Math.pow(1 + totalReturnRatio, 1 / years) - 1) * 100;
    }

    return {
      totalReturn,
      totalReturnPercent,
      totalInvested,
      totalCurrentValue,
      totalRealizedPL,
      totalUnrealizedPL,
      totalDividends,
      totalFees,
      netCashFlow,
      firstInvestmentDate,
      daysSinceFirstInvestment,
      annualizedReturn
    };
  }

  /**
   * Get service information
   */
  getServiceInfo(): { 
    version: string; 
    supportedFeatures: string[];
  } {
    return {
      version: '1.0.0',
      supportedFeatures: [
        'Total portfolio return calculation',
        'Percentage return calculation',
        'Realized vs unrealized P/L breakdown',
        'Dividend income tracking',
        'Fee impact analysis',
        'Annualized return calculation',
        'Investment timeline tracking'
      ]
    };
  }
}

// Export singleton instance
export const totalReturnAnalyticsService = new TotalReturnAnalyticsService();
export default totalReturnAnalyticsService;
