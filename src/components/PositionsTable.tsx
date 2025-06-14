import React, { useState, useMemo } from 'react';
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

// Inline types to avoid import issues
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';
type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';

interface PositionLot {
  id: string;
  transactionId: string;
  quantity: number;
  costBasis: number;
  purchaseDate: Date;
  remainingQuantity: number;
}

interface Position {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName?: string;
  assetType: AssetType;
  quantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentMarketValue: number;
  currentPrice?: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  currency: Currency;
  openDate: Date;
  lastTransactionDate: Date;
  costBasisMethod: CostBasisMethod;
  lots: PositionLot[];
  createdAt: Date;
  updatedAt: Date;
}

import { formatCurrency, formatPercentage } from '../utils';
import { useQuotes } from '../hooks/useYahooFinance';
import { useNotify } from '../hooks/useNotify';
import { useNetwork } from '../hooks/useNetwork';
import { NetworkError } from './NetworkError';
import { getAssetInfo } from '../utils/sampleData';

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
  &:hover {
    background: #f8fafc;
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
  const notify = useNotify();
  const network = useNetwork();

  // Get asset information lookup
  const assetInfoMap = useMemo(() => getAssetInfo(), []);

  // COMPLETELY DISABLE real-time quotes to prevent infinite loop
  const emptySymbols = useMemo(() => [], []); // Stable empty array
  const { 
    data: quotes, 
    loading: quotesLoading, 
    refetch,
    retryState 
  } = useQuotes(emptySymbols, {
    enabled: false,
    refetchInterval: undefined, // Remove interval completely
    useCache: false
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
      const currentPrice = currentPrices.get(position.assetSymbol) || 
        (position.currentMarketValue / position.quantity);
      
      return {
        ...position,
        currentPrice,
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

  const handleRefresh = async () => {
    try {
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
        <TableTitle>Open Positions</TableTitle>
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
                <TableRow key={`${position.assetSymbol}-${position.id}`}>
                  <TableCell>
                    <AssetTypeTag $assetType={position.assetType}>
                      {position.assetType}
                    </AssetTypeTag>
                  </TableCell>
                  <TableCell>
                    <strong>{position.assetSymbol}</strong>
                  </TableCell>
                  <TableCell>{position.assetName || '-'}</TableCell>
                  <TableCell>{position.quantity.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrency(position.averageCostBasis)}</TableCell>
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
    </TableContainer>
  );
};
