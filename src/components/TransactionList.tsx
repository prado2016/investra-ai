import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import type { Transaction, Asset } from '../lib/database/types';
import { formatCurrency, formatDate } from '../utils/formatting';
import CompanyLogo from './CompanyLogo';

// Extended transaction type that includes asset information
export interface TransactionWithAsset extends Transaction {
  asset: Asset;
}

const SymbolContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SymbolText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SymbolName = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
  font-family: var(--font-family-mono);
  letter-spacing: 0.5px;
  
  [data-theme="dark"] & {
    color: var(--text-primary);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
  
  [data-theme="dark"] & {
    background: var(--bg-card);
    border-color: var(--border-primary);
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-width: 140px;
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--color-teal-600);
    box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.1);
  }
  
  [data-theme="dark"] & {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--border-primary);
    
    &:focus {
      border-color: var(--color-teal-400);
      box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.2);
    }
  }
`;

const TransactionTable = styled.div`
  background: var(--bg-card);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  
  [data-theme="dark"] & {
    background: var(--bg-card);
    border-color: var(--border-primary);
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr auto;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-primary);
  
  [data-theme="dark"] & {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    border-bottom-color: var(--border-primary);
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr auto;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-primary);
  transition: background-color 0.2s;
  background: var(--bg-card);
  color: var(--text-primary);
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  [data-theme="dark"] & {
    background: var(--bg-card);
    color: var(--text-primary);
    border-bottom-color: var(--border-primary);
    
    &:hover {
      background-color: var(--bg-secondary);
    }
  }
`;

const TransactionBadge = styled.span<{ type: string }>`
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.type) {
      case 'buy':
        return `
          background-color: var(--color-success-50);
          color: var(--color-success-700);
          border: 1px solid var(--color-success-200);
          
          [data-theme="dark"] & {
            background-color: rgba(16, 185, 129, 0.2);
            color: var(--color-success-400);
            border-color: rgba(16, 185, 129, 0.3);
          }
        `;
      case 'sell':
        return `
          background-color: var(--color-warning-50);
          color: var(--color-warning-700);
          border: 1px solid var(--color-warning-200);
          
          [data-theme="dark"] & {
            background-color: rgba(247, 147, 26, 0.2);
            color: var(--color-warning-400);
            border-color: rgba(247, 147, 26, 0.3);
          }
        `;
      case 'dividend':
        return `
          background-color: var(--color-primary-50);
          color: var(--color-primary-700);
          border: 1px solid var(--color-primary-200);
          
          [data-theme="dark"] & {
            background-color: rgba(59, 130, 246, 0.2);
            color: var(--color-primary-400);
            border-color: rgba(59, 130, 246, 0.3);
          }
        `;
      default:
        return `
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
        `;
    }
  }}
`;

const AssetTypeBadge = styled.span<{ type: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.type) {
      case 'stock':
        return `
          background-color: var(--color-primary-50);
          color: var(--color-primary-700);
          
          [data-theme="dark"] & {
            background-color: rgba(59, 130, 246, 0.2);
            color: var(--color-primary-400);
          }
        `;
      case 'option':
        return `
          background-color: var(--color-warning-50);
          color: var(--color-warning-700);
          
          [data-theme="dark"] & {
            background-color: rgba(245, 158, 11, 0.2);
            color: var(--color-warning-400);
          }
        `;
      case 'forex':
        return `
          background-color: var(--color-success-50);
          color: var(--color-success-700);
          
          [data-theme="dark"] & {
            background-color: rgba(16, 185, 129, 0.2);
            color: var(--color-success-400);
          }
        `;
      case 'crypto':
        return `
          background-color: var(--color-danger-50);
          color: var(--color-danger-700);
          
          [data-theme="dark"] & {
            background-color: rgba(239, 68, 68, 0.2);
            color: var(--color-danger-400);
          }
        `;
      case 'reit':
        return `
          background-color: var(--color-teal-50);
          color: var(--color-teal-700);
          
          [data-theme="dark"] & {
            background-color: rgba(20, 184, 166, 0.2);
            color: var(--color-teal-400);
          }
        `;
      default:
        return `
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
        `;
    }
  }}
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  padding: 0.375rem 0.75rem;
  border: 1px solid;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  margin-right: 0.5rem;
  transition: all var(--transition-fast);
  
  ${props => props.variant === 'edit' ? `
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-primary);
    
    &:hover {
      background-color: var(--bg-secondary);
      border-color: var(--color-teal-600);
      color: var(--color-teal-600);
      transform: translateY(-1px);
    }
    
    [data-theme="dark"] & {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-primary);
      
      &:hover {
        background-color: var(--bg-secondary);
        border-color: var(--color-teal-400);
        color: var(--color-teal-400);
      }
    }
  ` : `
    background-color: var(--color-danger-50);
    color: var(--color-danger-600);
    border-color: var(--color-danger-200);
    
    &:hover {
      background-color: var(--color-danger-100);
      border-color: var(--color-danger-600);
      transform: translateY(-1px);
    }
    
    [data-theme="dark"] & {
      background-color: rgba(239, 68, 68, 0.2);
      color: var(--color-danger-400);
      border-color: rgba(239, 68, 68, 0.3);
      
      &:hover {
        background-color: rgba(239, 68, 68, 0.3);
        border-color: var(--color-danger-400);
      }
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
`;

const ErrorState = styled.div`
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

interface TransactionListProps {
  transactions: TransactionWithAsset[];
  loading: boolean;
  error?: string | null;
  onEdit: (transaction: TransactionWithAsset) => void;
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading,
  error,
  onEdit,
  onDelete
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const typeMatch = filterType === 'all' || transaction.transaction_type === filterType;
      const assetMatch = filterAsset === 'all' || transaction.asset?.asset_type === filterAsset;
      return typeMatch && assetMatch;
    });
  }, [transactions, filterType, filterAsset]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [filteredTransactions]);

  if (loading) {
    return <LoadingState>Loading transactions...</LoadingState>;
  }

  if (error) {
    return <ErrorState>Error loading transactions: {error}</ErrorState>;
  }

  return (
    <Container>
      <FilterBar>
        <FilterSelect
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
          <option value="dividend">Dividend</option>
          <option value="split">Split</option>
        </FilterSelect>
        
        <FilterSelect
          value={filterAsset}
          onChange={(e) => setFilterAsset(e.target.value)}
        >
          <option value="all">All Assets</option>
          <option value="stock">Stocks</option>
          <option value="option">Options</option>
          <option value="forex">Forex</option>
          <option value="crypto">Crypto</option>
          <option value="reit">REITs</option>
        </FilterSelect>
      </FilterBar>

      {sortedTransactions.length === 0 ? (
        <EmptyState>
          {transactions.length === 0 
            ? "No transactions yet. Click 'Add Transaction' to get started."
            : "No transactions match the current filters."
          }
        </EmptyState>
      ) : (
        <TransactionTable>
          <TableHeader>
            <div>Symbol</div>
            <div>Type</div>
            <div>Quantity</div>
            <div>Price</div>
            <div>Total</div>
            <div>Date</div>
            <div>Actions</div>
          </TableHeader>
          
          {sortedTransactions
            .filter(transaction => transaction && transaction.id) // Filter out invalid transactions
            .map((transaction) => (
            <TableRow key={transaction.id}>
              <SymbolContainer>
                <CompanyLogo
                  symbol={transaction.asset?.symbol || 'N/A'}
                  size="md"
                />
                <SymbolText>
                  <SymbolName>{transaction.asset?.symbol || 'N/A'}</SymbolName>
                  <div 
                    className="transaction-company-name"
                    title={transaction.asset?.name || 'Unknown Company'}
                  >
                    {transaction.asset?.name || 'Unknown Company'}
                  </div>
                  <AssetTypeBadge type={transaction.asset?.asset_type || 'stock'}>
                    {transaction.asset?.asset_type || 'stock'}
                  </AssetTypeBadge>
                </SymbolText>
              </SymbolContainer>
            
              <div>
                <TransactionBadge type={transaction.transaction_type || 'buy'}>
                  {transaction.transaction_type || 'buy'}
                </TransactionBadge>
              </div>
              
              <div className="financial-data">
                {(transaction.quantity || 0).toLocaleString()}
              </div>
              
              <div className="financial-data">
                {formatCurrency(transaction.price || 0, transaction.currency || 'USD')}
              </div>
              
              <div className="financial-data">
                {formatCurrency(transaction.total_amount || 0, transaction.currency || 'USD')}
              </div>
              
              <div>
                {formatDate(transaction.transaction_date)}
              </div>
              
              <div>
                <ActionButton 
                  variant="edit" 
                  onClick={() => onEdit(transaction)}
                >
                  Edit
                </ActionButton>
                <ActionButton 
                  variant="delete" 
                  onClick={() => onDelete(transaction.id)}
                >
                  Delete
                </ActionButton>
              </div>
            </TableRow>
          ))}
        </TransactionTable>
      )}
    </Container>
  );
};

export default TransactionList;
