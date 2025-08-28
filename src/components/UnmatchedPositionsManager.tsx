/**
 * Unmatched Positions Manager Component
 * Tool for identifying and closing unmatched sell transactions (orphan transactions)
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  DollarSign,
  Calendar,
  TrendingDown,
  RefreshCw,
  Zap
} from 'lucide-react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { useDailyPL } from '../hooks/useDailyPL';
import { useNotify } from '../hooks/useNotify';
import { SupabaseService } from '../services/supabaseService';
import { formatCurrency, formatDate } from '../utils/formatting';
import type { EnhancedTransaction } from '../services/analytics/dailyPLService';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
`;

const InfoAlert = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const InfoText = styled.div`
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const StatsCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const TransactionCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
`;

const TransactionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const TransactionInfo = styled.div`
  flex: 1;
`;

const TransactionSymbol = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const TransactionDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  flex-wrap: wrap;
`;

const TransactionDetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
          &:disabled { background: #9ca3af; cursor: not-allowed; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
          &:disabled { background: #9ca3af; cursor: not-allowed; }
        `;
      default:
        return `
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
          &:hover { background: #f1f5f9; border-color: #cbd5e1; }
          &:disabled { background: #f8fafc; color: #9ca3af; cursor: not-allowed; }
        `;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
`;

const EmptyIcon = styled.div`
  margin-bottom: 1rem;
  color: #9ca3af;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

interface UnmatchedPositionsManagerProps {
  portfolioId?: string | null;
}

const UnmatchedPositionsManager: React.FC<UnmatchedPositionsManagerProps> = ({ 
  portfolioId: propPortfolioId 
}) => {
  const { activePortfolio } = usePortfolios();
  const portfolioId = propPortfolioId || activePortfolio?.id || null;
  const { orphanTransactions, loading, refreshData } = useDailyPL(portfolioId);
  const notify = useNotify();
  const [processing, setProcessing] = useState(false);
  const [closingTransactions, setClosingTransactions] = useState<Set<string>>(new Set());

  const handleClosePosition = async (transaction: EnhancedTransaction) => {
    if (!transaction.asset_id) {
      notify.error('Error', 'Asset information not available for this transaction');
      return;
    }

    setClosingTransactions(prev => new Set([...prev, transaction.id]));

    try {
      // Create an offsetting buy transaction to close the position
      // IMPORTANT: Date the buy transaction BEFORE the sell to ensure FIFO processing works correctly
      const sellDate = new Date(transaction.transaction_date);
      const buyDate = new Date(sellDate);
      buyDate.setDate(buyDate.getDate() - 1); // 1 day before the sell
      
      const offsetTransaction = {
        portfolio_id: transaction.portfolio_id,
        asset_id: transaction.asset_id,
        transaction_type: 'buy' as const,
        quantity: Math.abs(transaction.quantity),
        price: 0.01, // Minimal price for closing position
        total_amount: Math.abs(transaction.quantity) * 0.01,
        fees: 0,
        currency: transaction.currency || 'USD',
        transaction_date: buyDate.toISOString().split('T')[0], // One day before the sell
        notes: JSON.stringify({
          closing_orphan_position: true,
          original_transaction_id: transaction.id,
          original_transaction_date: transaction.transaction_date,
          reason: 'Administrative close of unmatched sell transaction - buy dated before sell for FIFO matching'
        }),
        exchange_rate: transaction.exchange_rate || 1
      };

      const result = await SupabaseService.transaction.createTransaction(
        offsetTransaction.portfolio_id,
        offsetTransaction.asset_id,
        offsetTransaction.transaction_type,
        offsetTransaction.quantity,
        offsetTransaction.price,
        offsetTransaction.transaction_date,
        {
          fees: offsetTransaction.fees,
          currency: offsetTransaction.currency,
          notes: offsetTransaction.notes
        }
      );
      
      if (result.success) {
        // CRITICAL: Clear the cache to force fresh data reload
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        // Import the analytics service dynamically to avoid circular imports
        const { dailyPLAnalyticsService } = await import('../services/analytics/dailyPLService');
        
        // Clear cache for current month to force refresh
        if (transaction.portfolio_id) {
          dailyPLAnalyticsService.clearCacheFor(transaction.portfolio_id, currentYear, currentMonth);
          console.log(`🗑️ Cleared cache for portfolio ${transaction.portfolio_id} to force fresh orphan transaction data`);
        }
        
        // Also clear the entire cache to handle aggregated portfolio data
        dailyPLAnalyticsService.clearCache();
        console.log(`🗑️ Cleared entire analytics cache to force fresh data reload`);
        
        notify.success('Position Closed', `Successfully closed unmatched position for ${transaction.asset.symbol}. Cache cleared to refresh data.`);
        
        // Small delay to ensure cache is cleared before refresh
        setTimeout(async () => {
          await refreshData();
        }, 100);
      } else {
        throw new Error(result.error || 'Failed to create closing transaction');
      }
    } catch (error) {
      console.error('Error closing position:', error);
      notify.error('Error', `Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClosingTransactions(prev => {
        const next = new Set(prev);
        next.delete(transaction.id);
        return next;
      });
    }
  };

  const handleCloseAllPositions = async () => {
    if (orphanTransactions.length === 0) return;

    const confirmed = window.confirm(
      `Close all ${orphanTransactions.length} unmatched positions? This will create offsetting buy transactions at $0.01 per share, dated before the sell transactions for proper FIFO matching.`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const transaction of orphanTransactions) {
        try {
          if (!transaction.asset_id) {
            console.warn(`Skipping transaction ${transaction.id} - no asset_id`);
            errorCount++;
            continue;
          }

          // Date the buy transaction BEFORE the sell for proper FIFO processing
          const sellDate = new Date(transaction.transaction_date);
          const buyDate = new Date(sellDate);
          buyDate.setDate(buyDate.getDate() - 1); // 1 day before the sell

          const offsetTransaction = {
            portfolio_id: transaction.portfolio_id,
            asset_id: transaction.asset_id,
            transaction_type: 'buy' as const,
            quantity: Math.abs(transaction.quantity),
            price: 0.01,
            total_amount: Math.abs(transaction.quantity) * 0.01,
            fees: 0,
            currency: transaction.currency || 'USD',
            transaction_date: buyDate.toISOString().split('T')[0], // One day before the sell
            notes: JSON.stringify({
              closing_orphan_position: true,
              original_transaction_id: transaction.id,
              original_transaction_date: transaction.transaction_date,
              reason: 'Batch administrative close of unmatched sell transactions - buy dated before sell for FIFO matching'
            }),
            exchange_rate: transaction.exchange_rate || 1
          };

          const result = await SupabaseService.transaction.createTransaction(
            offsetTransaction.portfolio_id,
            offsetTransaction.asset_id,
            offsetTransaction.transaction_type,
            offsetTransaction.quantity,
            offsetTransaction.price,
            offsetTransaction.transaction_date,
            {
              fees: offsetTransaction.fees,
              currency: offsetTransaction.currency,
              notes: offsetTransaction.notes
            }
          );
          
          if (result.success) {
            successCount++;
          } else {
            console.error(`Failed to close position for ${transaction.asset.symbol}:`, result.error);
            errorCount++;
          }

          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing transaction ${transaction.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        // CRITICAL: Clear the cache to force fresh data reload after batch operations
        // Import the analytics service dynamically to avoid circular imports
        const { dailyPLAnalyticsService } = await import('../services/analytics/dailyPLService');
        
        // Clear the entire cache to handle all portfolio data
        dailyPLAnalyticsService.clearCache();
        console.log(`🗑️ Cleared entire analytics cache after batch close operation`);
        
        notify.success('Batch Close Complete', `Successfully closed ${successCount} positions. Cache cleared to refresh data.`);
      }
      
      if (errorCount > 0) {
        notify.error('Some Errors Occurred', `${errorCount} positions could not be closed`);
      }

      // Small delay to ensure cache is cleared before refresh
      setTimeout(async () => {
        await refreshData();
      }, 200);
    } catch (error) {
      console.error('Error in batch close:', error);
      notify.error('Error', 'Failed to complete batch close operation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <RefreshCw size={48} className="animate-spin" />
          <div style={{ marginTop: '1rem' }}>Loading unmatched positions...</div>
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <TrendingDown size={32} />
          Unmatched Positions Manager
        </Title>
        <Subtitle>
          Identify and close sell transactions that couldn't be matched with corresponding buy transactions.
          These may represent short positions, incomplete transaction history, or data import issues.
        </Subtitle>
      </Header>

      <InfoAlert>
        <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
        <InfoText>
          <strong>Important:</strong> Closing unmatched positions creates offsetting buy transactions at $0.01 per share 
          to balance your portfolio. This is an administrative action that should be used when you're certain these 
          positions should be closed or when the original buy transactions are missing from your records.
        </InfoText>
      </InfoAlert>

      <StatsCard>
        <StatsGrid>
          <StatItem>
            <StatValue>{orphanTransactions.length}</StatValue>
            <StatLabel>Unmatched Positions</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>
              {formatCurrency(
                orphanTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
              )}
            </StatValue>
            <StatLabel>Total Value</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{new Set(orphanTransactions.map(t => t.asset.symbol)).size}</StatValue>
            <StatLabel>Unique Symbols</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{new Set(orphanTransactions.map(t => t.portfolio_id)).size}</StatValue>
            <StatLabel>Affected Portfolios</StatLabel>
          </StatItem>
        </StatsGrid>
      </StatsCard>

      {orphanTransactions.length > 0 && (
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="danger" 
            onClick={handleCloseAllPositions}
            disabled={processing}
          >
            {processing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            Close All Positions ({orphanTransactions.length})
          </Button>
        </div>
      )}

      {orphanTransactions.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <CheckCircle size={64} />
          </EmptyIcon>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No Unmatched Positions Found
          </div>
          <div>
            All sell transactions have been successfully matched with corresponding buy transactions.
          </div>
        </EmptyState>
      ) : (
        orphanTransactions.map(transaction => (
          <TransactionCard key={transaction.id}>
            <TransactionHeader>
              <TransactionInfo>
                <TransactionSymbol>{transaction.asset.symbol}</TransactionSymbol>
                <TransactionDetails>
                  <TransactionDetailItem>
                    <Calendar size={14} />
                    {formatDate(transaction.transaction_date)}
                  </TransactionDetailItem>
                  <TransactionDetailItem>
                    <DollarSign size={14} />
                    {Math.abs(transaction.quantity)} shares @ {formatCurrency(transaction.price)}
                  </TransactionDetailItem>
                  <TransactionDetailItem>
                    <TrendingDown size={14} />
                    {formatCurrency(transaction.total_amount || 0)} total
                  </TransactionDetailItem>
                </TransactionDetails>
              </TransactionInfo>
              
              <ActionButtons>
                <Button 
                  variant="primary"
                  onClick={() => handleClosePosition(transaction)}
                  disabled={closingTransactions.has(transaction.id)}
                >
                  {closingTransactions.has(transaction.id) ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Close Position
                </Button>
              </ActionButtons>
            </TransactionHeader>
          </TransactionCard>
        ))
      )}
    </Container>
  );
};

export default UnmatchedPositionsManager;