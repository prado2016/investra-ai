/**
 * React Hook for Supabase Position Management
 * Provides access to position data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { useSupabasePortfolios } from './useSupabasePortfolios';
import type { Position as DbPosition, Asset } from '../lib/database/types';
import type { Position as FrontendPosition, Currency } from '../types/portfolio';

/**
 * Convert database Position to frontend Position format
 */
function mapDbPositionToFrontend(dbPosition: DbPosition & { asset: Asset }): FrontendPosition {
  return {
    id: dbPosition.id,
    assetId: dbPosition.asset_id,
    assetSymbol: dbPosition.asset.symbol,
    assetName: dbPosition.asset.name || dbPosition.asset.symbol,
    assetType: dbPosition.asset.asset_type,
    quantity: dbPosition.quantity,
    averageCostBasis: dbPosition.average_cost_basis,
    totalCostBasis: dbPosition.total_cost_basis,
    // Calculate current market value (we'll need to get real-time prices)
    currentMarketValue: dbPosition.total_cost_basis, // Fallback to cost basis
    currentPrice: dbPosition.average_cost_basis, // Fallback to average cost
    unrealizedPL: 0, // Will be calculated with real-time prices
    unrealizedPLPercent: 0,
    realizedPL: dbPosition.realized_pl,
    totalReturn: dbPosition.realized_pl, // For now, just realized P&L
    totalReturnPercent: 0,
    currency: dbPosition.asset.currency as Currency,
    openDate: new Date(dbPosition.open_date),
    lastTransactionDate: new Date(dbPosition.updated_at),
    costBasisMethod: dbPosition.cost_basis_method,
    lots: [], // We'll need to fetch lots separately if needed
    createdAt: new Date(dbPosition.created_at),
    updatedAt: new Date(dbPosition.updated_at)
  };
}

interface UseSupabasePositionsReturn {
  positions: FrontendPosition[];
  loading: boolean;
  error: string | null;
  refreshPositions: () => Promise<void>;
}

/**
 * Hook for managing positions from Supabase
 */
export function useSupabasePositions(): UseSupabasePositionsReturn {
  const [positions, setPositions] = useState<FrontendPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the active portfolio to fetch positions for
  const { activePortfolio } = useSupabasePortfolios();

  const fetchPositions = useCallback(async () => {
    if (!activePortfolio) {
      console.log('🔍 POSITIONS_HOOK_DEBUG: No active portfolio, skipping fetch');
      setPositions([]);
      setLoading(false);
      return;
    }

    console.log('🔍 POSITIONS_HOOK_DEBUG: fetchPositions called for portfolio:', activePortfolio.id);
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 POSITIONS_HOOK_DEBUG: Calling SupabaseService.position.getPositions()');
      const result = await SupabaseService.position.getPositions(activePortfolio.id);
      console.log('🔍 POSITIONS_HOOK_DEBUG: Service result:', result);

      if (result.success && result.data) {
        console.log('🔍 POSITIONS_HOOK_DEBUG: Mapping positions:', result.data.length);
        const mappedPositions = result.data.map(mapDbPositionToFrontend);
        console.log('🔍 POSITIONS_HOOK_DEBUG: Mapped positions:', mappedPositions);
        setPositions(mappedPositions);
      } else {
        console.log('🔍 POSITIONS_HOOK_DEBUG: Service failed:', result.error);
        setError(result.error || 'Failed to fetch positions');
        setPositions([]);
      }
    } catch (err) {
      console.error('🔍 POSITIONS_HOOK_DEBUG: Error fetching positions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  const refreshPositions = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  // Fetch positions when active portfolio changes
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    positions,
    loading,
    error,
    refreshPositions
  };
}

export default useSupabasePositions;
