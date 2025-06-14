/**
 * React Hook for Supabase Position Management
 * Provides access to position data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { usePortfolios } from '../contexts/PortfolioContext';
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
  recalculatePositions: () => Promise<void>;
}

/**
 * Hook for managing positions from Supabase
 */
export function useSupabasePositions(): UseSupabasePositionsReturn {
  const [positions, setPositions] = useState<FrontendPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the active portfolio to fetch positions for
  const { activePortfolio } = usePortfolios();

  const fetchPositions = useCallback(async () => {
    if (!activePortfolio) {
      setPositions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await SupabaseService.position.getPositions(activePortfolio.id);

      if (result.success && result.data) {
        const mappedPositions = result.data.map(mapDbPositionToFrontend);
        setPositions(mappedPositions);
      } else {
        setError(result.error || 'Failed to fetch positions');
        setPositions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  const refreshPositions = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  const recalculatePositions = useCallback(async () => {
    if (!activePortfolio) {
      throw new Error('No active portfolio');
    }

    console.log('🔄 Starting position recalculation for portfolio:', activePortfolio.id);
    
    const result = await SupabaseService.position.recalculatePositions(activePortfolio.id);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to recalculate positions');
    }
    
    console.log('✅ Recalculation complete:', result.data);
    
    // Refresh positions after recalculation
    await fetchPositions();
  }, [activePortfolio, fetchPositions]);

  // Fetch positions when active portfolio changes
  useEffect(() => {
    fetchPositions();
  }, [activePortfolio?.id]); // Only depend on the portfolio ID, not the entire fetchPositions function

  return {
    positions,
    loading,
    error,
    refreshPositions,
    recalculatePositions
  };
}

export default useSupabasePositions;
