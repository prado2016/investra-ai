import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  X, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Hash,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { TransactionService } from '../services/supabaseService';
import { useNotify } from '../hooks/useNotify';
import { usePortfolios } from '../contexts/PortfolioContext';
import TransactionEditModal from './TransactionEditModal';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatting';
import type { Position } from '../types/portfolio';
import type { TransactionWithAsset } from './TransactionList';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 0;
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-secondary);
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h2`
  margin: 0 0 var(--space-2) 0;
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const PositionSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-3);
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const SummaryLabel = styled.span`
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
`;

const SummaryValue = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: ${({ $positive, $negative }) => 
    $positive ? 'var(--color-success-600)' : 
    $negative ? 'var(--color-error-600)' : 
    'var(--text-primary)'};
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
`;

const ClosePositionButton = styled.button`
  background: var(--color-error-600);
  color: white;
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &:hover {
    background: var(--color-error-700);
  }

  &:disabled {
    background: var(--color-gray-400);
    cursor: not-allowed;
  }
`;

const TransactionsList = styled.div`
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
`;

const TransactionHeader = styled.div`
  display: grid;
  grid-template-columns: 120px 80px 100px 100px 100px 120px auto;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
`;

const TransactionRow = styled.div`
  display: grid;
  grid-template-columns: 120px 80px 100px 100px 100px 120px auto;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  align-items: center;
  transition: background-color var(--transition-fast);

  &:hover {
    background: var(--bg-secondary);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TransactionType = styled.span<{ $type: string }>`
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  
  ${({ $type }) => {
    switch ($type) {
      case 'buy':
        return `
          background: var(--color-success-100);
          color: var(--color-success-700);
        `;
      case 'sell':
        return `
          background: var(--color-error-100);
          color: var(--color-error-700);
        `;
      case 'dividend':
        return `
          background: var(--color-info-100);
          color: var(--color-info-700);
        `;
      case 'option_expired':
        return `
          background: var(--color-warning-100);
          color: var(--color-warning-700);
        `;
      default:
        return `
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        `;
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);

  ${({ variant }) => {
    if (variant === 'edit') {
      return `
        background: var(--color-primary-100);
        color: var(--color-primary-700);
        
        &:hover {
          background: var(--color-primary-200);
        }
      `;
    } else if (variant === 'delete') {
      return `
        background: var(--color-error-100);
        color: var(--color-error-700);
        
        &:hover {
          background: var(--color-error-200);
        }
      `;
    }
    return '';
  }}
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-8);
  color: var(--text-secondary);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--space-8);
  color: var(--text-secondary);
  text-align: center;
`;

interface PositionDetailsModalProps {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export const PositionDetailsModal: React.FC<PositionDetailsModalProps> = ({
  position,
  isOpen,
  onClose,
  onRefresh
}) => {
  const [transactions, setTransactions] = useState<TransactionWithAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithAsset | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const notify = useNotify();
  const { activePortfolio } = usePortfolios();

  // Fetch transactions for this position
  const fetchTransactions = async () => {
    if (!activePortfolio?.id) {
      notify.error('No active portfolio found');
      return;
    }
    
    setLoading(true);
    try {
      // Get all transactions for the portfolio, then filter by asset
      const response = await TransactionService.getTransactions(activePortfolio.id);
      
      if (response.success) {
        // Filter transactions for this specific asset
        const positionTransactions = response.data.filter(
          tx => tx.asset.symbol === position.assetSymbol
        );
        setTransactions(positionTransactions);
      } else {
        notify.error('Failed to fetch transactions: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      notify.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && position) {
      fetchTransactions();
    }
  }, [isOpen, position]);

  const handleEditTransaction = (transaction: TransactionWithAsset) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
    setShowEditModal(false);
  };

  const handleSaveEditTransaction = async (updatedData: {
    transaction_type: string;
    quantity: number;
    price: number;
    transaction_date: string;
  }) => {
    if (!editingTransaction) return;

    try {
      const totalAmount = updatedData.quantity * updatedData.price;
      
      const response = await TransactionService.updateTransaction(
        editingTransaction.id,
        {
          transaction_type: updatedData.transaction_type as any,
          quantity: updatedData.quantity,
          price: updatedData.price,
          total_amount: totalAmount,
          transaction_date: updatedData.transaction_date
        }
      );
      
      if (response.success) {
        notify.success('Transaction updated successfully');
        await fetchTransactions(); // Refresh transactions
        await onRefresh(); // Refresh positions table
        handleCloseEditModal();
      } else {
        throw new Error(response.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
      notify.error('Failed to update transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await TransactionService.deleteTransaction(transactionId);
      
      if (response.success) {
        notify.success('Transaction deleted successfully');
        await fetchTransactions(); // Refresh transactions
        await onRefresh(); // Refresh positions table
      } else {
        notify.error('Failed to delete transaction: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      notify.error('Failed to delete transaction');
    }
  };

  const handleClosePosition = async () => {
    if (!window.confirm(`Are you sure you want to close your ${position.assetSymbol} position? This will create a sell order for ${position.quantity} shares at the current market price.`)) {
      return;
    }

    // TODO: Implement close position functionality
    // This would create a sell transaction for the entire position quantity
    notify.info('Close position functionality will be implemented soon');
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderContent>
            <ModalTitle>
              <DollarSign size={24} />
              {position.assetSymbol} Position Details
            </ModalTitle>
            
            <PositionSummary>
              <SummaryItem>
                <SummaryLabel>Quantity</SummaryLabel>
                <SummaryValue>
                  <Hash size={16} />
                  {position.quantity.toLocaleString()}
                </SummaryValue>
              </SummaryItem>
              
              <SummaryItem>
                <SummaryLabel>Avg Cost</SummaryLabel>
                <SummaryValue>
                  {formatCurrency(position.averageCostBasis)}
                </SummaryValue>
              </SummaryItem>
              
              <SummaryItem>
                <SummaryLabel>Market Value</SummaryLabel>
                <SummaryValue>
                  {formatCurrency(position.currentMarketValue)}
                </SummaryValue>
              </SummaryItem>
              
              <SummaryItem>
                <SummaryLabel>Unrealized P&L</SummaryLabel>
                <SummaryValue 
                  $positive={position.unrealizedPL > 0} 
                  $negative={position.unrealizedPL < 0}
                >
                  {position.unrealizedPL > 0 ? <TrendingUp size={16} /> : position.unrealizedPL < 0 ? <TrendingDown size={16} /> : null}
                  {formatCurrency(position.unrealizedPL)} ({formatPercentage(position.unrealizedPLPercent)})
                </SummaryValue>
              </SummaryItem>

              <SummaryItem>
                <SummaryLabel>Open Date</SummaryLabel>
                <SummaryValue>
                  <Calendar size={16} />
                  {formatDate(position.openDate)}
                </SummaryValue>
              </SummaryItem>
            </PositionSummary>
          </HeaderContent>
          
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <SectionHeader>
            <SectionTitle>Transaction History</SectionTitle>
            <ClosePositionButton 
              onClick={handleClosePosition}
              disabled={position.quantity <= 0}
            >
              <AlertTriangle size={16} />
              Close Position
            </ClosePositionButton>
          </SectionHeader>

          {loading ? (
            <LoadingState>Loading transactions...</LoadingState>
          ) : transactions.length === 0 ? (
            <EmptyState>
              <CheckCircle size={48} />
              <h3>No Transactions Found</h3>
              <p>No transactions found for this position.</p>
            </EmptyState>
          ) : (
            <TransactionsList>
              <TransactionHeader>
                <div>Type</div>
                <div>Quantity</div>
                <div>Price</div>
                <div>Total</div>
                <div>Fees</div>
                <div>Date</div>
                <div>Actions</div>
              </TransactionHeader>
              
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id}>
                  <TransactionType $type={transaction.transaction_type}>
                    {transaction.transaction_type === 'buy' && <TrendingDown size={14} />}
                    {transaction.transaction_type === 'sell' && <TrendingUp size={14} />}
                    {transaction.transaction_type === 'dividend' && <DollarSign size={14} />}
                    {transaction.transaction_type === 'option_expired' && <AlertTriangle size={14} />}
                    {transaction.transaction_type}
                  </TransactionType>
                  
                  <div>{transaction.quantity?.toLocaleString() || 0}</div>
                  
                  <div>{formatCurrency(transaction.price || 0)}</div>
                  
                  <div>{formatCurrency(transaction.total_amount || 0)}</div>
                  
                  <div>{transaction.fees ? formatCurrency(transaction.fees) : '-'}</div>
                  
                  <div>
                    {transaction.transaction_date ? formatDate(new Date(transaction.transaction_date)) : '-'}
                  </div>
                  
                  <ActionButtons>
                    <ActionButton 
                      variant="edit" 
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      <Edit3 size={14} />
                      Edit
                    </ActionButton>
                    <ActionButton 
                      variant="delete" 
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </ActionButton>
                  </ActionButtons>
                </TransactionRow>
              ))}
            </TransactionsList>
          )}
        </ModalBody>

        {/* Edit Transaction Modal */}
        {editingTransaction && (
          <TransactionEditModal
            transaction={editingTransaction}
            isOpen={showEditModal}
            onClose={handleCloseEditModal}
            onSave={handleSaveEditTransaction}
          />
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default PositionDetailsModal;
