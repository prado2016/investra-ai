import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Loader,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { PositionDetailsModal } from './PositionDetailsModal';

import { formatCurrency, formatPercentage } from '../utils';
import { useQuotes } from '../hooks/useYahooFinance';
import { useNotify } from '../hooks/useNotify';
import { useNetwork } from '../hooks/useNetwork';
import { NetworkError } from './NetworkError';
import { getAssetInfo } from '../utils/sampleData';
import type { Position } from '../types/portfolio';

// Styled components for the table
const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin: 1rem 0;
`;

const TableHeader = styled.div`
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TableTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const FilterInput = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: #f1f5f9;
`;

const TableRow = styled.tr`
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background: #f1f5f9 !important;
  }

  &:nth-child(even) {
    background: #f9fafb;
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
  position: relative;

  &:hover {
    background: #e2e8f0;
  }
  
  &:first-child {
    border-top-left-radius: 12px;
  }
  
  &:last-child {
    border-top-right-radius: 12px;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
`;

const AssetTypeTag = styled.span<{ $assetType: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${({ $assetType }) => {
    switch ($assetType) {
      case 'stock':
        return 'background: #dbeafe; color: #1e40af;';
      case 'crypto':
        return 'background: #fef3c7; color: #d97706;';
      case 'forex':
        return 'background: #d1fae5; color: #059669;';
      case 'option':
        return 'background: #fce7f3; color: #be185d;';
      case 'reit':
        return 'background: #ede9fe; color: #7c2d12;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

const CostBasisTag = styled.span<{ $method: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${({ $method }) => {
    switch ($method) {
      case 'FIFO':
        return 'background: #e0f2fe; color: #0277bd;';
      case 'LIFO':
        return 'background: #f3e5f5; color: #7b1fa2;';
      case 'AVERAGE_COST':
        return 'background: #e8f5e8; color: #2e7d32;';
      case 'SPECIFIC_LOT':
        return 'background: #fff3e0; color: #ef6c00;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

const PriceCell = styled.div<{ $isPositive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ $isPositive }) => 
    $isPositive === true ? '#059669' : 
    $isPositive === false ? '#dc2626' : 
    '#374151'};
  font-weight: ${({ $isPositive }) => $isPositive !== undefined ? '600' : '400'};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #dc2626;
  text-align: center;
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
  text-align: center;
`;

// Responsive table wrapper
const ResponsiveTableWrapper = styled.div`
  overflow-x: auto;
  
  @media (max-width: 768px) {
    ${StyledTable} {
      min-width: 800px;
    }
  }
`;

type SortKey = keyof Position | 'currentPrice' | 'assetName';
type SortDirection = 'asc' | 'desc' | null;

interface EnhancedPosition extends Position {
  currentPrice: number;
  assetName: string;
  transactionCount?: number;
}

interface PositionsTableProps {
  positions: Position[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onRecalculate?: () => Promise<void>;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  loading = false,
  error,
  onRefresh,
  onRecalculate
}) => {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filterText, setFilterText] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const notify = useNotify();
  const network = useNetwork();

  // Get asset information lookup
  const assetInfoMap = useMemo(() => getAssetInfo(), []);

  // Get unique symbols for real-time quotes - LIMIT TO FIRST 3 SYMBOLS FOR TESTING
  const symbols = useMemo(() => {
    const uniqueSymbols = Array.from(new Set(positions.map(p => p.assetSymbol)));
    return uniqueSymbols.slice(0, 3); // LIMIT TO 3 SYMBOLS FOR TESTING
  }, [positions]);

  // Re-enable with VERY conservative settings
  const { 
    data: quotes, 
    loading: quotesLoading, 
    refetch,
    retryState 
  } = useQuotes(symbols, {
    enabled: symbols.length > 0 && symbols.length <= 3, // Only if we have 3 or fewer symbols
    refetchInterval: 300000, // 5 minutes between updates
    useCache: true
  });

  // Create a map of current prices
  const currentPrices = useMemo(() => {
    const priceMap = new Map();
    quotes?.forEach(quote => {
      priceMap.set(quote.symbol, quote.price);
    });
    return priceMap;
  }, [quotes]);

  // Enhanced positions with current prices and asset info
  const enhancedPositions = useMemo(() => {
    return positions.map(position => {
      const assetInfo = assetInfoMap.get(position.assetSymbol);
      
      // Get current price from real-time quotes, fallback to calculated price
      let currentPrice = currentPrices.get(position.assetSymbol);
      if (!currentPrice || currentPrice <= 0) {
        // Fallback to current market value divided by quantity
        currentPrice = position.quantity > 0 ? position.currentMarketValue / position.quantity : position.averageCostBasis;
      }
      
      // Recalculate market value and P&L with current price
      const currentMarketValue = currentPrice * position.quantity;
      const unrealizedPL = currentMarketValue - position.totalCostBasis;
      const unrealizedPLPercent = position.totalCostBasis > 0 ? (unrealizedPL / position.totalCostBasis) * 100 : 0;
      
      return {
        ...position,
        currentPrice,
        currentMarketValue,
        unrealizedPL,
        unrealizedPLPercent,
        assetName: assetInfo?.name || position.assetSymbol
      } as EnhancedPosition;
    });
  }, [positions, currentPrices, assetInfoMap]);

  // Filtered positions
  const filteredPositions = useMemo(() => {
    if (!filterText.trim()) return enhancedPositions;
    
    const searchTerm = filterText.toLowerCase();
    return enhancedPositions.filter(position => 
      position.assetSymbol.toLowerCase().includes(searchTerm) ||
      position.assetName.toLowerCase().includes(searchTerm) ||
      position.assetType.toLowerCase().includes(searchTerm)
    );
  }, [enhancedPositions, filterText]);

  // Sorted positions
  const sortedPositions = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredPositions;

    return [...filteredPositions].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      // Handle special computed fields
      if (sortKey === 'currentPrice') {
        aValue = a.currentPrice;
        bValue = b.currentPrice;
      } else if (sortKey === 'assetName') {
        aValue = a.assetName;
        bValue = b.assetName;
      } else {
        // Access Position properties with proper typing
        aValue = (a as EnhancedPosition)[sortKey as keyof EnhancedPosition] as string | number | Date;
        bValue = (b as EnhancedPosition)[sortKey as keyof EnhancedPosition] as string | number | Date;
      }

      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredPositions, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => 
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      );
      if (sortDirection === 'desc') {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={14} />;
    if (sortDirection === 'asc') return <ArrowUp size={14} />;
    if (sortDirection === 'desc') return <ArrowDown size={14} />;
    return <ArrowUpDown size={14} />;
  };

  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_COOLDOWN = 30000; // 30 seconds cooldown

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
      const remainingTime = Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000);
      notify.warning('Refresh Cooldown', `Please wait ${remainingTime} seconds before refreshing again`);
      return;
    }

    try {
      setLastRefreshTime(now);
      await refetch();
      onRefresh?.();
      notify.success('Data Refreshed', 'Position data has been updated with latest prices');
    } catch (error) {
      notify.apiError(error, 'Failed to refresh position data');
    }
  };

  const handleRecalculate = async () => {
    if (!onRecalculate) return;
    
    try {
      setRecalculating(true);
      await onRecalculate();
      notify.success('Positions Recalculated', 'All positions have been recalculated from transaction history');
    } catch (error) {
      notify.error('Failed to recalculate positions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRecalculating(false);
    }
  };

  const handlePositionClick = (position: Position) => {
    setSelectedPosition(position);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPosition(null);
  };

  const handleRefreshPositions = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  if (loading) {
    return (
      <TableContainer>
        <LoadingContainer>
          <Loader className="animate-spin" size={24} />
          <span>Loading positions...</span>
        </LoadingContainer>
      </TableContainer>
    );
  }

  // Check for network-related errors
  const isNetworkError = error && (
    error.toLowerCase().includes('network') ||
    error.toLowerCase().includes('connection') ||
    error.toLowerCase().includes('timeout') ||
    error.toLowerCase().includes('fetch') ||
    !network.isOnline
  );

  if (isNetworkError || (!network.isOnline && positions.length === 0)) {
    return (
      <TableContainer>
        <NetworkError
          type={!network.isOnline ? 'offline' : 'error'}
          title={!network.isOnline ? 'No Internet Connection' : 'Network Error'}
          message={!network.isOnline 
            ? 'Unable to load position data without internet connection'
            : error || 'Failed to load position data due to network issues'
          }
          onRetry={handleRefresh}
          showSuggestions={!network.isOnline}
        />
      </TableContainer>
    );
  }

  if (error && !isNetworkError) {
    return (
      <TableContainer>
        <ErrorContainer>
          <AlertCircle size={48} />
          <h3>Error Loading Positions</h3>
          <p>{error}</p>
          {onRefresh && (
            <RefreshButton onClick={handleRefresh}>
              <RefreshCw size={16} />
              Try Again
            </RefreshButton>
          )}
        </ErrorContainer>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <TableHeader>
        <div>
          <TableTitle>Open Positions</TableTitle>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280', 
            marginTop: '0.25rem',
            fontStyle: 'italic'
          }}>
            Click on any position to view transactions and details
          </div>
        </div>
        <FilterContainer>
          <FilterInput
            type="text"
            placeholder="Filter by symbol, name, or type..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <RefreshButton 
            onClick={handleRefresh}
            disabled={quotesLoading || retryState.isRetrying}
          >
            <RefreshCw 
              size={16} 
              className={(quotesLoading || retryState.isRetrying) ? 'animate-spin' : ''}
            />
            {retryState.isRetrying 
              ? `Retrying (${retryState.currentAttempt})` 
              : 'Refresh'
            }
          </RefreshButton>
          {onRecalculate && (
            <RefreshButton 
              onClick={handleRecalculate}
              disabled={recalculating || quotesLoading || retryState.isRetrying}
              style={{ 
                marginLeft: '0.5rem',
                background: 'var(--color-accent-600)',
                borderColor: 'var(--color-accent-600)'
              }}
            >
              <RefreshCw 
                size={16} 
                className={recalculating ? 'animate-spin' : ''}
              />
              {recalculating ? 'Recalculating...' : 'Recalculate Positions'}
            </RefreshButton>
          )}
        </FilterContainer>
      </TableHeader>

      {sortedPositions.length === 0 ? (
        <EmptyContainer>
          <h3>No Positions Found</h3>
          <p>
            {filterText.trim() 
              ? 'No positions match your search criteria.'
              : 'You have no open positions. Start by adding some trades!'
            }
          </p>
        </EmptyContainer>
      ) : (
        <ResponsiveTableWrapper>
          <StyledTable>
            <TableHead>
              <tr>
                <TableHeaderCell onClick={() => handleSort('assetType')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Asset Type {getSortIcon('assetType')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('assetSymbol')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Symbol {getSortIcon('assetSymbol')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('assetName')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Name {getSortIcon('assetName')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('quantity')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Quantity {getSortIcon('quantity')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('averageCostBasis')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Avg Cost {getSortIcon('averageCostBasis')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('costBasisMethod')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Cost Method {getSortIcon('costBasisMethod')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('currentPrice')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Current Price {getSortIcon('currentPrice')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('currentMarketValue')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Market Value {getSortIcon('currentMarketValue')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('unrealizedPL')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Unrealized P&L {getSortIcon('unrealizedPL')}
                  </span>
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('unrealizedPLPercent')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Return % {getSortIcon('unrealizedPLPercent')}
                  </span>
                </TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {sortedPositions.map((position) => (
                <TableRow 
                  key={`${position.assetSymbol}-${position.id}`}
                  onClick={() => handlePositionClick(position)}
                  title="Click to view position details and transactions"
                >
                  <TableCell>
                    <AssetTypeTag $assetType={position.assetType}>
                      {position.assetType}
                    </AssetTypeTag>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{position.assetSymbol}</strong>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          color: '#6b7280', 
                          background: '#f3f4f6', 
                          padding: '0.125rem 0.5rem', 
                          borderRadius: '0.75rem',
                          cursor: 'help'
                        }}
                        title="Click to view transactions that make up this position"
                      >
                        📊
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{position.assetName || '-'}</TableCell>
                  <TableCell>{position.quantity.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrency(position.averageCostBasis)}</TableCell>
                  <TableCell>
                    <CostBasisTag $method={position.costBasisMethod}>
                      {position.costBasisMethod}
                    </CostBasisTag>
                  </TableCell>
                  <TableCell>
                    <PriceCell>
                      {formatCurrency(position.currentPrice)}
                      {quotesLoading && <Loader size={12} className="animate-spin" />}
                    </PriceCell>
                  </TableCell>
                  <TableCell>{formatCurrency(position.currentMarketValue)}</TableCell>
                  <TableCell>
                    <PriceCell $isPositive={position.unrealizedPL > 0 ? true : position.unrealizedPL < 0 ? false : undefined}>
                      {position.unrealizedPL > 0 ? <TrendingUp size={16} /> : position.unrealizedPL < 0 ? <TrendingDown size={16} /> : null}
                      {formatCurrency(position.unrealizedPL)}
                    </PriceCell>
                  </TableCell>
                  <TableCell>
                    <PriceCell $isPositive={position.unrealizedPLPercent > 0 ? true : position.unrealizedPLPercent < 0 ? false : undefined}>
                      {formatPercentage(position.unrealizedPLPercent)}
                    </PriceCell>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </StyledTable>
        </ResponsiveTableWrapper>
      )}
      
      {/* Position Details Modal */}
      {selectedPosition && (
        <PositionDetailsModal
          position={selectedPosition}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onRefresh={handleRefreshPositions}
        />
      )}
    </TableContainer>
  );
};
