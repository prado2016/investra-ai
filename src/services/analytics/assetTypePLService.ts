import { SupabaseService } from '../supabaseService';
import { debug } from '../../utils/debug';
import type { Transaction as DBTransaction, Asset as DBAsset } from '../../lib/database/types';

export interface EnhancedTransaction extends DBTransaction {
  asset: DBAsset;
}

export interface AssetTypePLData {
  assetType: string;
  totalPL: number;
  realizedPL: number;
  unrealizedPL: number;
}

export class AssetTypePLService {
  async getAssetTypePL(
    portfolioId: string
  ): Promise<{ data: AssetTypePLData[] | null; error: string | null }> {
    try {
      debug.info('Asset Type P/L service called', { portfolioId }, 'AssetTypePL');

      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        console.error('❌ assetTypePLService: Failed to fetch transactions:', transactionsResult.error);
        return { data: null, error: `Failed to fetch transactions: ${transactionsResult.error}` };
      }

      const transactions = transactionsResult.data || [];
      if (transactions.length === 0) {
        return { data: [], error: null };
      }

      const assetTypePL = this.calculateAssetTypePL(transactions);

      return { data: assetTypePL, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error calculating Asset Type P/L'
      };
    }
  }

  private calculateAssetTypePL(transactions: EnhancedTransaction[]): AssetTypePLData[] {
    const assetTypeMap = new Map<string, { realizedPL: number; unrealizedPL: number }>();

    // This is a simplified calculation. A more accurate calculation would require fetching current prices for unrealized P/L.
    for (const t of transactions) {
      if (!assetTypeMap.has(t.asset.asset_type)) {
        assetTypeMap.set(t.asset.asset_type, { realizedPL: 0, unrealizedPL: 0 });
      }

      const pl = assetTypeMap.get(t.asset.asset_type)!;

      if (t.transaction_type === 'sell') {
        // Simplified realized P/L calculation
        pl.realizedPL += t.total_amount;
      } else if (t.transaction_type === 'buy') {
        pl.realizedPL -= t.total_amount;
      }
    }

    const result: AssetTypePLData[] = [];
    for (const [assetType, pl] of assetTypeMap.entries()) {
      result.push({
        assetType,
        totalPL: pl.realizedPL + pl.unrealizedPL,
        realizedPL: pl.realizedPL,
        unrealizedPL: pl.unrealizedPL,
      });
    }

    return result;
  }
}

export const assetTypePLService = new AssetTypePLService();
export default assetTypePLService;
