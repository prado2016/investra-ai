import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  BarChart3, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  Package
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { usePortfolios } from '../contexts/PortfolioContext';
import { useNotify } from '../hooks/useNotify';
import { SupabaseService } from '../services/supabaseService';
import { positionAnalyticsService, type PositionAnalytics } from '../services/positionAnalyticsService';
import { formatCurrency, formatDate, parseDatabaseDate } from '../utils/formatting';
import TransactionEditModal from './TransactionEditModal';
import type { UnifiedTransactionEntry } from '../types/unifiedEntry';

const ToolContainer = styled(Card)`
  margin-top: 2rem;
`;

const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-primary);
`;

const ToolTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
`;

const ToolDescription = styled.p`
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const ControlsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 250px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const StatValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => 
    props.$positive ? 'var(--color-success-600)' : 
    props.$negative ? 'var(--color-danger-600)' : 
    'var(--text-primary)'
  };
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  font-weight: 500;
`;

const PositionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const PositionCard = styled.div<{ $hasIssues?: boolean }>`
  background: var(--bg-primary);
  border: 2px solid ${props => props.$hasIssues ? 'var(--color-warning-500)' : 'var(--border-primary)'};
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.$hasIssues ? 'var(--color-warning-600)' : 'var(--border-secondary)'};
    box-shadow: var(--shadow-md);
  }
`;

const PositionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetSymbol = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  font-family: var(--font-family-mono);
`;

const AssetName = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 0.25rem 0;
`;

const PortfolioBadge = styled.span`
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid var(--border-primary);
`;

const IssueIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-warning-600);
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
`;

const PositionMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const MetricGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const MetricValue = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => 
    props.$positive ? 'var(--color-success-600)' : 
    props.$negative ? 'var(--color-danger-600)' : 
    'var(--text-primary)'
  };
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-secondary);
  }
  
  &.danger {
    color: var(--color-danger-600);
    border-color: var(--color-danger-300);
    
    &:hover {
      background: var(--color-danger-50);
      border-color: var(--color-danger-400);
    }
  }
`;

const TransactionsList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-secondary);
`;

const TransactionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.75rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--bg-tertiary);
  }
`;

const TransactionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const TransactionActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: var(--text-secondary);
`;

const ErrorContainer = styled.div`
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-danger-200);
`;

interface PositionIssue {
  type: 'small_quantity' | 'zero_value' | 'negative_quantity' | 'missing_transactions';
  message: string;
  severity: 'warning' | 'error';
}

interface EnhancedPosition extends PositionAnalytics {
  issues: PositionIssue[];
  transactionCount: number;
}

const BatchPositionManager: React.FC = () => {
  const { portfolios, activePortfolio } = usePortfolios();
  const notify = useNotify();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<EnhancedPosition[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<EnhancedPosition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransactionEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Load positions and analyze for issues
  const loadPositions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const portfolioIds = activePortfolio ? [activePortfolio.id] : portfolios.map(p => p.id);
      const result = await positionAnalyticsService.getPositionAnalytics(portfolioIds, { showClosed: true });
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      const enhancedPositions: EnhancedPosition[] = (result.data || []).map(position => {
        const issues: PositionIssue[] = [];
        
        // Check for small quantities (likely rounding errors)
        if (position.isOpen && Math.abs(position.totalQuantity) < 0.01) {
          issues.push({
            type: 'small_quantity',
            message: `Very small quantity (${position.totalQuantity}) - possible rounding error`,
            severity: 'warning'
          });
        }
        
        // Check for zero market value but non-zero quantity
        if (position.isOpen && position.marketValue === 0 && position.totalQuantity !== 0) {
          issues.push({
            type: 'zero_value',
            message: 'Zero market value with non-zero quantity',
            severity: 'error'
          });
        }
        
        // Check for negative quantities (shouldn't happen with proper FIFO)
        if (position.totalQuantity < 0) {
          issues.push({
            type: 'negative_quantity',
            message: 'Negative quantity - transaction mismatch',
            severity: 'error'
          });
        }
        
        // Check for missing transactions
        if (position.buyTransactions.length === 0 && position.sellTransactions.length === 0) {
          issues.push({
            type: 'missing_transactions',
            message: 'No buy or sell transactions found',
            severity: 'error'
          });
        }
        
        return {
          ...position,
          issues,
          transactionCount: position.buyTransactions.length + position.sellTransactions.length
        };
      });
      
      setPositions(enhancedPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, [portfolios, activePortfolio]);
  
  // Filter positions based on search and issues
  useEffect(() => {
    let filtered = positions;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(position => 
        position.assetSymbol.toLowerCase().includes(term) ||
        position.assetName.toLowerCase().includes(term) ||
        position.portfolioName.toLowerCase().includes(term)
      );
    }
    
    setFilteredPositions(filtered);
  }, [positions, searchTerm]);
  
  // Load positions on mount and portfolio change
  useEffect(() => {
    if (portfolios.length > 0) {
      loadPositions();
    }
  }, [portfolios, loadPositions]);
  
  // Calculate summary stats
  const stats = React.useMemo(() => {
    const totalPositions = positions.length;
    const openPositions = positions.filter(p => p.isOpen).length;
    const positionsWithIssues = positions.filter(p => p.issues.length > 0).length;
    const positionsWithErrors = positions.filter(p => p.issues.some(issue => issue.severity === 'error')).length;
    
    return {
      totalPositions,
      openPositions,
      positionsWithIssues,
      positionsWithErrors
    };
  }, [positions]);
  
  // Handle transaction editing
  const handleEditTransaction = async (transaction: any, position: EnhancedPosition) => {
    try {
      // Convert to UnifiedTransactionEntry format
      const unifiedTransaction: UnifiedTransactionEntry = {
        id: transaction.id,
        type: 'transaction',
        portfolioId: position.portfolioId,
        date: parseDatabaseDate(transaction.date),
        amount: transaction.amount || 0,
        currency: 'USD',
        notes: transaction.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        transactionType: transaction.type,
        assetId: position.assetId,
        assetSymbol: position.assetSymbol,
        assetType: 'stock' as const,
        quantity: transaction.quantity,
        price: transaction.price,
        fees: transaction.fees || 0
      };
      
      setSelectedTransaction(unifiedTransaction);
      setIsEditModalOpen(true);
    } catch (error) {
      notify.error('Failed to load transaction for editing');
    }
  };
  
  // Handle transaction deletion
  const handleDeleteTransaction = async (transaction: any, position: EnhancedPosition) => {
    if (!confirm(`Are you sure you want to delete this ${transaction.type} transaction of ${transaction.quantity} ${position.assetSymbol}?`)) {
      return;
    }
    
    try {
      const result = await SupabaseService.transaction.deleteTransaction(transaction.id);
      if (result.success) {
        notify.success('Transaction deleted successfully');
        await loadPositions(); // Reload positions
      } else {
        notify.error('Failed to delete transaction: ' + result.error);
      }
    } catch (error) {
      notify.error('Failed to delete transaction');
    }
  };
  
  // Handle position expansion
  const togglePositionExpansion = (positionId: string) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
    } else {
      newExpanded.add(positionId);
    }
    setExpandedPositions(newExpanded);
  };
  
  // Handle transaction edit completion
  const handleTransactionEditComplete = async () => {
    setIsEditModalOpen(false);
    setSelectedTransaction(null);
    await loadPositions(); // Reload positions
  };
  
  if (loading) {
    return (
      <ToolContainer>
        <LoadingContainer>
          <RefreshCw className="animate-spin" size={24} />
          Loading position analysis...
        </LoadingContainer>
      </ToolContainer>
    );
  }
  
  return (
    <ToolContainer>
      <ToolHeader>
        <BarChart3 size={24} />
        <div>
          <ToolTitle>Batch Position Manager</ToolTitle>
        </div>
      </ToolHeader>
      
      <ToolDescription>
        Analyze and fix issues with open positions. This tool identifies positions with potential problems
        like small quantities from rounding errors, negative quantities from transaction mismatches, or 
        missing transactions that cause incorrect position calculations.
      </ToolDescription>
      
      {error && (
        <ErrorContainer>
          <strong>Error loading positions:</strong> {error}
        </ErrorContainer>
      )}
      
      <ControlsContainer>
        <SearchContainer>
          <Search size={16} />
          <SearchInput
            type="text"
            placeholder="Search by symbol, name, or portfolio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={loadPositions}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </ControlsContainer>
      
      <StatsContainer>
        <StatCard>
          <StatValue>{stats.totalPositions}</StatValue>
          <StatLabel>Total Positions</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue $positive={stats.openPositions > 0}>{stats.openPositions}</StatValue>
          <StatLabel>Open Positions</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue $negative={stats.positionsWithIssues > 0}>{stats.positionsWithIssues}</StatValue>
          <StatLabel>Positions with Issues</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue $negative={stats.positionsWithErrors > 0}>{stats.positionsWithErrors}</StatValue>
          <StatLabel>Positions with Errors</StatLabel>
        </StatCard>
      </StatsContainer>
      
      {filteredPositions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          {searchTerm ? 'No positions match your search criteria.' : 'No positions found.'}
        </div>
      ) : (
        <PositionsGrid>
          {filteredPositions.map((position) => (
            <PositionCard key={position.id} $hasIssues={position.issues.length > 0}>
              <PositionHeader>
                <AssetInfo>
                  <AssetSymbol>{position.assetSymbol}</AssetSymbol>
                  <AssetName>{position.assetName}</AssetName>
                </AssetInfo>
                <PortfolioBadge>{position.portfolioName}</PortfolioBadge>
              </PositionHeader>
              
              {position.issues.length > 0 && (
                <IssueIndicator>
                  <AlertTriangle size={16} />
                  {position.issues.length} issue{position.issues.length > 1 ? 's' : ''} detected
                </IssueIndicator>
              )}
              
              <PositionMetrics>
                <MetricGroup>
                  <MetricLabel>Quantity</MetricLabel>
                  <MetricValue 
                    $negative={position.totalQuantity < 0}
                    $positive={position.totalQuantity > 0}
                  >
                    {position.totalQuantity.toLocaleString()}
                  </MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Market Value</MetricLabel>
                  <MetricValue>{formatCurrency(position.marketValue)}</MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Avg Cost</MetricLabel>
                  <MetricValue>{formatCurrency(position.averageCostBasis)}</MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Unrealized P/L</MetricLabel>
                  <MetricValue 
                    $positive={position.unrealizedPL > 0} 
                    $negative={position.unrealizedPL < 0}
                  >
                    {formatCurrency(position.unrealizedPL)}
                  </MetricValue>
                </MetricGroup>
              </PositionMetrics>
              
              <ActionsContainer>
                <ActionButton
                  onClick={() => togglePositionExpansion(position.id)}
                >
                  <Package size={12} />
                  {expandedPositions.has(position.id) ? 'Hide' : 'Show'} Transactions ({position.transactionCount})
                </ActionButton>
              </ActionsContainer>
              
              {expandedPositions.has(position.id) && (
                <div style={{ marginTop: '1rem' }}>
                  <TransactionsList>
                    {[...position.buyTransactions, ...position.sellTransactions]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((transaction) => (
                      <TransactionItem key={transaction.id}>
                        <TransactionInfo>
                          <div style={{ fontWeight: '600' }}>
                            {transaction.type.toUpperCase()} {transaction.quantity} @ {formatCurrency(transaction.price)}
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            {formatDate(parseDatabaseDate(transaction.date))} • {formatCurrency(transaction.amount)}
                          </div>
                        </TransactionInfo>
                        <TransactionActions>
                          <ActionButton
                            onClick={() => handleEditTransaction(transaction, position)}
                          >
                            <Edit3 size={10} />
                          </ActionButton>
                          <ActionButton
                            className="danger"
                            onClick={() => handleDeleteTransaction(transaction, position)}
                          >
                            <Trash2 size={10} />
                          </ActionButton>
                        </TransactionActions>
                      </TransactionItem>
                    ))}
                  </TransactionsList>
                </div>
              )}
              
              {position.issues.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--color-warning-700)', marginBottom: '0.5rem' }}>
                    Issues Found:
                  </div>
                  {position.issues.map((issue, index) => (
                    <div key={index} style={{ fontSize: '0.75rem', color: 'var(--color-warning-600)' }}>
                      • {issue.message}
                    </div>
                  ))}
                </div>
              )}
            </PositionCard>
          ))}
        </PositionsGrid>
      )}
      
      {/* Transaction Edit Modal */}
      {selectedTransaction && (
        <TransactionEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          transaction={selectedTransaction}
          onSave={async () => {
            await handleTransactionEditComplete();
          }}
        />
      )}
    </ToolContainer>
  );
};

export default BatchPositionManager;