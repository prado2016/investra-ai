import { SupabaseService } from './supabaseService';
import { debug } from '../utils/debug';

export interface PositionAnalytics {
  id: string;
  portfolioId: string;
  portfolioName: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetType: string;
  
  // Current Position
  totalQuantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  
  // Market Data
  currentPrice: number;
  marketValue: number;
  
  // P/L Calculations
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalPL: number;
  totalPLPercent: number;
  
  // Transaction History
  buyTransactions: TransactionSummary[];
  sellTransactions: TransactionSummary[];
  totalBought: number;
  totalSold: number;
  
  // Position Status
  isOpen: boolean;
  openDate: string;
  lastTradeDate: string;
  
  // Additional Data
  currency: string;
  fees: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface TransactionSummary {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  fees: number;
  notes?: string;
}

export interface PositionFilter {
  date?: string;
  portfolioId?: string;
  assetType?: string;
  minValue?: number;
  maxValue?: number;
  showClosed?: boolean;
}

export class PositionAnalyticsService {
  /**
   * Get comprehensive position analytics for a portfolio
   */
  async getPositionAnalytics(
    portfolioIds: string[] = [],
    filter: PositionFilter = {}
  ): Promise<{ data: PositionAnalytics[] | null; error: string | null }> {
    try {
      debug.info('Position Analytics service called', { portfolioIds, filter }, 'PositionAnalytics');

      // Get all portfolios if none specified
      if (portfolioIds.length === 0) {
        const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
        if (!portfoliosResult.success || !portfoliosResult.data) {
          return { data: null, error: 'Failed to fetch portfolios' };
        }
        portfolioIds = portfoliosResult.data.map(p => p.id);
      }

      const allPositions: PositionAnalytics[] = [];

      // Process each portfolio
      for (const portfolioId of portfolioIds) {
        const portfolioResult = await this.getPortfolioPositions(portfolioId, filter);
        if (portfolioResult.data) {
          allPositions.push(...portfolioResult.data);
        }
      }

      // Apply filters
      let filteredPositions = allPositions;
      
      if (filter.assetType && filter.assetType !== 'all') {
        filteredPositions = filteredPositions.filter(p => p.assetType === filter.assetType);
      }
      
      if (filter.minValue !== undefined) {
        filteredPositions = filteredPositions.filter(p => p.marketValue >= filter.minValue!);
      }
      
      if (filter.maxValue !== undefined) {
        filteredPositions = filteredPositions.filter(p => p.marketValue <= filter.maxValue!);
      }
      
      if (!filter.showClosed) {
        filteredPositions = filteredPositions.filter(p => p.isOpen);
      }

      // Sort by market value descending
      filteredPositions.sort((a, b) => b.marketValue - a.marketValue);

      return { data: filteredPositions, error: null };
    } catch (error) {
      debug.error('Position Analytics service error', error, 'PositionAnalytics');
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error in position analytics'
      };
    }
  }

  /**
   * Get position analytics for a specific portfolio
   */
  private async getPortfolioPositions(
    portfolioId: string,
    filter: PositionFilter = {}
  ): Promise<{ data: PositionAnalytics[] | null; error: string | null }> {
    try {
      // Get portfolio info
      const portfolioResult = await SupabaseService.portfolio.getPortfolioById(portfolioId);
      if (!portfolioResult.success || !portfolioResult.data) {
        return { data: null, error: 'Portfolio not found' };
      }
      const portfolio = portfolioResult.data;

      // Get all transactions for this portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId, 'all');
      if (!transactionsResult.success || !transactionsResult.data) {
        return { data: [], error: null }; // No transactions is not an error
      }

      const transactions = transactionsResult.data;

      // Filter transactions by date if specified
      let filteredTransactions = transactions;
      if (filter.date) {
        const filterDate = new Date(filter.date);
        filteredTransactions = transactions.filter(t => 
          new Date(t.transaction_date) <= filterDate
        );
      }

      // Group transactions by asset
      const assetGroups = new Map<string, any[]>();
      for (const transaction of filteredTransactions) {
        const assetId = transaction.asset_id;
        if (!assetGroups.has(assetId)) {
          assetGroups.set(assetId, []);
        }
        assetGroups.get(assetId)!.push(transaction);
      }

      const positions: PositionAnalytics[] = [];

      // Process each asset group
      for (const [assetId, assetTransactions] of assetGroups) {
        const position = await this.calculatePositionAnalytics(
          portfolioId,
          portfolio.name,
          assetId,
          assetTransactions,
          filter
        );
        if (position) {
          positions.push(position);
        }
      }

      return { data: positions, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error in portfolio positions'
      };
    }
  }

  /**
   * Calculate position analytics for a specific asset
   */
  private async calculatePositionAnalytics(
    portfolioId: string,
    portfolioName: string,
    assetId: string,
    transactions: any[],
    filter: PositionFilter = {}
  ): Promise<PositionAnalytics | null> {
    try {
      if (transactions.length === 0) return null;

      // Get asset info from the first transaction
      const firstTransaction = transactions[0];
      const asset = firstTransaction.asset;
      if (!asset) return null;

      // Sort transactions by date
      const sortedTransactions = [...transactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );

      // Calculate position using FIFO method
      let totalQuantity = 0;
      let totalCostBasis = 0;
      let totalBought = 0;
      let totalSold = 0;
      let realizedPL = 0;
      let totalFees = 0;

      const buyTransactions: TransactionSummary[] = [];
      const sellTransactions: TransactionSummary[] = [];
      const fifoQueue: Array<{ quantity: number; price: number; fees: number }> = [];

      for (const transaction of sortedTransactions) {
        const quantity = Math.abs(transaction.quantity);
        const price = transaction.price;
        const amount = Math.abs(transaction.total_amount);
        const fees = transaction.fees || 0;
        
        totalFees += fees;

        const transactionSummary: TransactionSummary = {
          id: transaction.id,
          date: transaction.transaction_date,
          type: transaction.transaction_type as 'buy' | 'sell',
          quantity,
          price,
          amount,
          fees,
          notes: transaction.notes
        };

        if (transaction.transaction_type === 'buy') {
          // Buy transaction
          totalQuantity += quantity;
          totalCostBasis += amount;
          totalBought += amount;
          buyTransactions.push(transactionSummary);
          
          // Add to FIFO queue
          fifoQueue.push({ quantity, price, fees });
          
        } else if (transaction.transaction_type === 'sell') {
          // Sell transaction
          totalQuantity -= quantity;
          totalSold += amount;
          sellTransactions.push(transactionSummary);
          
          // Calculate realized P/L using FIFO
          let remainingToSell = quantity;
          while (remainingToSell > 0 && fifoQueue.length > 0) {
            const oldestBuy = fifoQueue[0];
            const soldFromThisBuy = Math.min(remainingToSell, oldestBuy.quantity);
            
            // Calculate P/L for this portion
            const costBasis = soldFromThisBuy * oldestBuy.price;
            const saleAmount = soldFromThisBuy * price;
            realizedPL += (saleAmount - costBasis);
            
            // Update cost basis for remaining position
            totalCostBasis -= costBasis;
            
            // Update FIFO queue
            oldestBuy.quantity -= soldFromThisBuy;
            if (oldestBuy.quantity <= 0) {
              fifoQueue.shift();
            }
            
            remainingToSell -= soldFromThisBuy;
          }
        }
      }

      // Skip if position is closed and we're not showing closed positions
      const isOpen = totalQuantity > 0.001; // Account for floating point precision
      if (!isOpen && !filter.showClosed) {
        return null;
      }

      // Calculate average cost basis for remaining position
      const averageCostBasis = isOpen && totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;

      // Get current market price (mock for now - would integrate with real price service)
      const currentPrice = this.getMockCurrentPrice(asset.symbol);
      const marketValue = isOpen ? totalQuantity * currentPrice : 0;

      // Calculate unrealized P/L
      const unrealizedPL = isOpen ? marketValue - totalCostBasis : 0;
      const unrealizedPLPercent = totalCostBasis > 0 ? (unrealizedPL / totalCostBasis) * 100 : 0;

      // Calculate total P/L
      const totalPL = realizedPL + unrealizedPL;
      const totalInvestment = totalBought;
      const totalPLPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

      // Get dates
      const openDate = sortedTransactions[0].transaction_date;
      const lastTradeDate = sortedTransactions[sortedTransactions.length - 1].transaction_date;

      return {
        id: `${portfolioId}-${assetId}`,
        portfolioId,
        portfolioName,
        assetId,
        assetSymbol: asset.symbol,
        assetName: asset.name || asset.symbol,
        assetType: asset.asset_type,
        
        totalQuantity,
        averageCostBasis,
        totalCostBasis,
        
        currentPrice,
        marketValue,
        
        unrealizedPL,
        unrealizedPLPercent,
        realizedPL,
        totalPL,
        totalPLPercent,
        
        buyTransactions,
        sellTransactions,
        totalBought,
        totalSold,
        
        isOpen,
        openDate,
        lastTradeDate,
        
        currency: 'USD', // Default for now
        fees: totalFees,
        dayChange: 0, // Would need real-time data
        dayChangePercent: 0
      };
    } catch (error) {
      debug.error('Error calculating position analytics', error, 'PositionAnalytics');
      return null;
    }
  }

  /**
   * Mock function to get current price - would be replaced with real price service
   */
  private getMockCurrentPrice(symbol: string): number {
    // Mock prices for common symbols
    const mockPrices: Record<string, number> = {
      'AAPL': 175.50,
      'GOOGL': 2800.00,
      'MSFT': 330.00,
      'TSLA': 250.00,
      'NVDA': 450.00,
      'AMZN': 3200.00,
      'META': 280.00,
      'NFLX': 400.00,
      'TQQQ': 85.00,
      'QQQ': 380.00,
      'SPY': 450.00,
      'VOO': 410.00
    };
    
    return mockPrices[symbol] || 100.00; // Default price
  }

  /**
   * Get position details for a specific asset
   */
  async getPositionDetails(
    portfolioId: string,
    assetId: string,
    date?: string
  ): Promise<{ data: PositionAnalytics | null; error: string | null }> {
    try {
      const filter: PositionFilter = { date, portfolioId };
      const positions = await this.getPortfolioPositions(portfolioId, filter);
      
      if (!positions.data) {
        return { data: null, error: positions.error };
      }
      
      const position = positions.data.find(p => p.assetId === assetId);
      return { data: position || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error getting position details'
      };
    }
  }
}

export const positionAnalyticsService = new PositionAnalyticsService();
export default positionAnalyticsService;