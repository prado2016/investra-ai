/**
 * React Hook for Supabase Position Management
 * Provides access to position data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { usePortfolios } from '../contexts/PortfolioContext';
import type { Position as DbPosition, Asset } from '../lib/database/types';
import type { Position as FrontendPosition, Currency } from '../types/portfolio';

// Extended position type for multi-portfolio view
type ExtendedPosition = FrontendPosition & {
  portfolioName?: string;
  portfolioId?: string;
};

/**
 * Convert database Position to frontend Position format
 */
function mapDbPositionToFrontend(dbPosition: DbPosition & { asset: Asset }): FrontendPosition {
  // Calculate initial current price from total cost basis and quantity
  const initialCurrentPrice = dbPosition.quantity > 0 ? dbPosition.total_cost_basis / dbPosition.quantity : dbPosition.average_cost_basis;
  
  // Initial market value equals cost basis (will be updated with real-time prices)
  const initialMarketValue = dbPosition.total_cost_basis;
  
  // Initial unrealized P&L is 0 since market value equals cost basis
  const unrealizedPL = initialMarketValue - dbPosition.total_cost_basis;
  const unrealizedPLPercent = dbPosition.total_cost_basis > 0 ? (unrealizedPL / dbPosition.total_cost_basis) * 100 : 0;
  
  // Calculate total return including realized P&L
  const totalReturn = dbPosition.realized_pl + unrealizedPL;
  const totalReturnPercent = dbPosition.total_cost_basis > 0 ? (totalReturn / dbPosition.total_cost_basis) * 100 : 0;

  return {
    id: dbPosition.id,
    assetId: dbPosition.asset_id,
    assetSymbol: dbPosition.asset.symbol,
    assetName: dbPosition.asset.name || dbPosition.asset.symbol,
    assetType: dbPosition.asset.asset_type,
    quantity: dbPosition.quantity,
    averageCostBasis: dbPosition.average_cost_basis,
    totalCostBasis: dbPosition.total_cost_basis,
    currentMarketValue: initialMarketValue,
    currentPrice: initialCurrentPrice,
    unrealizedPL,
    unrealizedPLPercent,
    realizedPL: dbPosition.realized_pl,
    totalReturn,
    totalReturnPercent,
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
  positions: ExtendedPosition[];
  loading: boolean;
  error: string | null;
  refreshPositions: () => Promise<void>;
  recalculatePositions: () => Promise<void>;
}

/**
 * Hook for managing positions from Supabase
 */
export function useSupabasePositions(): UseSupabasePositionsReturn {
  const [positions, setPositions] = useState<ExtendedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the active portfolio and all portfolios to fetch positions for
  const { activePortfolio, portfolios } = usePortfolios();

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Handle "All Portfolios" case vs specific portfolio
      if (!activePortfolio) {
        // Fetch positions from all portfolios
        if (portfolios.length === 0) {
          setPositions([]);
          setLoading(false);
          return;
        }

        console.log('📊 Fetching positions from all portfolios:', portfolios.length);
        const allPositions: ExtendedPosition[] = [];
        
        // Fetch positions from each portfolio
        for (const portfolio of portfolios) {
          try {
            const result = await SupabaseService.position.getPositions(portfolio.id);
            if (result.success && result.data) {
              const mappedPositions = result.data.map(pos => ({
                ...mapDbPositionToFrontend(pos),
                portfolioName: portfolio.name, // Add portfolio name for display
                portfolioId: portfolio.id
              }));
              allPositions.push(...mappedPositions);
            }
          } catch (portfolioError) {
            console.error(`Error fetching positions for portfolio ${portfolio.name}:`, portfolioError);
            // Continue with other portfolios
          }
        }
        
        setPositions(allPositions);
        setLoading(false);
        return;
      }

      // Specific portfolio case
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
  }, [activePortfolio, portfolios]);

  const refreshPositions = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  const recalculatePositions = useCallback(async () => {
    if (!activePortfolio) {
      // Recalculate for all portfolios
      console.log('🔄 Starting position recalculation for all portfolios');
      
      for (const portfolio of portfolios) {
        try {
          console.log(`🔄 Recalculating positions for portfolio: ${portfolio.name}`);
          const result = await SupabaseService.position.recalculatePositions(portfolio.id);
          
          if (!result.success) {
            console.error(`Failed to recalculate positions for portfolio ${portfolio.name}:`, result.error);
            // Continue with other portfolios instead of throwing
          } else {
            console.log(`✅ Recalculation complete for ${portfolio.name}:`, result.data);
          }
        } catch (error) {
          console.error(`Error recalculating positions for portfolio ${portfolio.name}:`, error);
          // Continue with other portfolios
        }
      }
    } else {
      // Recalculate for specific portfolio
      console.log('🔄 Starting position recalculation for portfolio:', activePortfolio.id);
      
      const result = await SupabaseService.position.recalculatePositions(activePortfolio.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to recalculate positions');
      }
      
      console.log('✅ Recalculation complete:', result.data);
    }
    
    // Refresh positions after recalculation
    await fetchPositions();
  }, [activePortfolio, portfolios, fetchPositions]);

  // Fetch positions when active portfolio changes
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    positions,
    loading,
    error,
    refreshPositions,
    recalculatePositions
  };
}

export default useSupabasePositions;
