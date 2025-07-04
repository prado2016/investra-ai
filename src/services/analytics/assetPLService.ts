import { SupabaseService } from '../supabaseService';
import { debug } from '../../utils/debug';
import type { Transaction as DBTransaction, Asset as DBAsset } from '../../lib/database/types';

export interface EnhancedTransaction extends DBTransaction {
  asset: DBAsset;
}

export interface AssetPLData {
  symbol: string;
  assetType: string;
  totalPL: number;
  realizedPL: number;
  unrealizedPL: number;
}

export class AssetPLService {
  async getAssetPL(
    portfolioId: string
  ): Promise<{ data: AssetPLData[] | null; error: string | null }> {
    try {
      debug.info('Asset P/L service called', { portfolioId }, 'AssetPL');

      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        console.error('❌ assetPLService: Failed to fetch transactions:', transactionsResult.error);
        return { data: null, error: `Failed to fetch transactions: ${transactionsResult.error}` };
      }

      const transactions = transactionsResult.data || [];
      if (transactions.length === 0) {
        return { data: [], error: null };
      }

      const assetPL = this.calculateAssetPL(transactions);

      return { data: assetPL, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating Asset P/L'
      };
    }
  }

  private calculateAssetPL(transactions: EnhancedTransaction[]): AssetPLData[] {
    const assetMap = new Map<string, { 
      assetType: string; 
      realizedPL: number; 
      unrealizedPL: number; 
    }>();

    // Group transactions by asset symbol
    for (const t of transactions) {
      const symbol = t.asset.symbol;
      
      if (!assetMap.has(symbol)) {
        assetMap.set(symbol, { 
          assetType: t.asset.asset_type,
          realizedPL: 0, 
          unrealizedPL: 0 
        });
      }

      const pl = assetMap.get(symbol)!;

      if (t.transaction_type === 'sell') {
        // For covered calls, the profit is immediate on sell
        if (t.strategy_type === 'covered_call') {
          pl.realizedPL += t.total_amount;
        } else {
          // Regular sell - simplified P/L calculation
          pl.realizedPL += t.total_amount;
        }
      } else if (t.transaction_type === 'buy') {
        // For covered call buybacks, reduce the profit
        if (t.strategy_type === 'covered_call') {
          pl.realizedPL -= t.total_amount;
        } else {
          // Regular buy - cost basis
          pl.realizedPL -= t.total_amount;
        }
      }
    }

    const result: AssetPLData[] = [];
    for (const [symbol, pl] of assetMap.entries()) {
      result.push({
        symbol,
        assetType: pl.assetType,
        totalPL: pl.realizedPL + pl.unrealizedPL,
        realizedPL: pl.realizedPL,
        unrealizedPL: pl.unrealizedPL,
      });
    }

    // Sort by total P/L descending
    result.sort((a, b) => b.totalPL - a.totalPL);

    return result;
  }

  async getAggregatedAssetPL(
    portfolioIds: string[]
  ): Promise<{ data: AssetPLData[] | null; error: string | null }> {
    try {
      debug.info('Aggregated Asset P/L service called', { portfolioIds }, 'AssetPL');

      const allAssetPL: AssetPLData[] = [];

      for (const portfolioId of portfolioIds) {
        const result = await this.getAssetPL(portfolioId);
        if (result.error) {
          console.error(`❌ Failed to get asset P/L for portfolio ${portfolioId}:`, result.error);
          continue;
        }
        
        if (result.data) {
          allAssetPL.push(...result.data);
        }
      }

      // Aggregate by symbol across all portfolios
      const aggregatedMap = new Map<string, AssetPLData>();
      
      for (const assetPL of allAssetPL) {
        if (aggregatedMap.has(assetPL.symbol)) {
          const existing = aggregatedMap.get(assetPL.symbol)!;
          existing.totalPL += assetPL.totalPL;
          existing.realizedPL += assetPL.realizedPL;
          existing.unrealizedPL += assetPL.unrealizedPL;
        } else {
          aggregatedMap.set(assetPL.symbol, { ...assetPL });
        }
      }

      const result = Array.from(aggregatedMap.values());
      result.sort((a, b) => b.totalPL - a.totalPL);

      return { data: result, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating aggregated Asset P/L'
      };
    }
  }
}

export const assetPLService = new AssetPLService();
export default assetPLService;