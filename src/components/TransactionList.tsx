import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ArrowDownCircle, ArrowUpCircle, Gift, Edit3, Trash2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'; // Added icons
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
  gap: var(--space-1, 0.25rem); /* Use CSS var */
`;

const SymbolName = styled.div`
  font-weight: var(--font-weight-semibold); /* Use CSS var */
  font-size: var(--text-sm); /* Use CSS var */
  color: var(--text-primary);
  font-family: var(--font-family-mono);
  letter-spacing: 0.5px;
  
  [data-theme="dark"] & {
    color: var(--text-primary); /* This should already pick up dark theme text-primary */
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 1rem); /* Use CSS var */
`;

const FilterBar = styled.div`
  display: flex;
  display: flex;
  gap: var(--space-4, 1rem); /* Use CSS var */
  flex-wrap: wrap;
  margin-bottom: var(--space-6, 1.5rem); /* Use CSS var, adjusted from 2rem */
  padding: var(--space-5, 1.25rem); /* Use CSS var, adjusted from 1.5rem */
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
  
  [data-theme="dark"] & {
    background: var(--bg-card); /* Correctly inherits */
    border-color: var(--border-primary); /* Correctly inherits */
  }

  @media (max-width: 480px) {
    padding: var(--space-4, 1rem);
    gap: var(--space-3, 0.75rem);
  }
`;

const FilterSelect = styled.select`
  padding: var(--space-3, 0.75rem); /* Use CSS var */
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm); /* Use CSS var */
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-width: 160px; /* Slightly wider */
  flex-grow: 1; /* Allow selects to grow */
  transition: all var(--transition-fast);
  
  @media (max-width: 480px) {
    min-width: 100%; /* Full width on small screens */
  }

  &:focus {
    outline: none;
    border-color: var(--border-focus); /* Use new focus color */
    box-shadow: 0 0 0 3px hsla(var(--color-primary-700)/0.15); /* Use new focus shadow */
  }
  
  [data-theme="dark"] & {
    background-color: var(--form-bg, var(--bg-tertiary)); /* Align with other form inputs in dark mode */
    color: var(--form-text, var(--text-primary));
    border-color: var(--form-border, var(--border-primary));
    
    &:focus {
      border-color: var(--color-primary-400); /* Lighter teal for dark focus */
      box-shadow: 0 0 0 3px hsla(var(--color-primary-400)/0.25); /* Lighter teal shadow */
    }
  }
`;

const TransactionTable = styled.div`
  background: var(--bg-card);
  border-radius: var(--radius-lg); /* Use CSS var */
  overflow: hidden;
  border: 1px solid var(--border-primary);
  
  [data-theme="dark"] & {
    background: var(--bg-card); /* Correctly inherits */
    border-color: var(--border-primary); /* Correctly inherits */
  }
`;

const TableHeader = styled.div`
  display: grid;
  /* Adjusted grid columns for better spacing and to accommodate icons later */
  display: grid;
  /* Adjusted grid columns for better spacing and to accommodate icons later */
  grid-template-columns: 2.5fr 1.2fr 1fr 1fr 1fr 1.5fr 1.2fr;
  gap: var(--space-4, 1rem); /* Use CSS var */
  padding: var(--space-3, 0.75rem) var(--space-4, 1rem); /* Use CSS vars */
  background-color: var(--bg-tertiary);
  font-weight: var(--font-weight-semibold); /* Use CSS var */
  font-size: var(--text-sm); /* Use CSS var */
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-primary);
  
  [data-theme="dark"] & {
    background-color: var(--bg-tertiary); /* Correctly inherits */
    color: var(--text-secondary); /* Correctly inherits */
    border-bottom-color: var(--border-primary); /* Correctly inherits */
  }

  @media (max-width: 768px) {
    display: none; /* Hide table header on mobile */
  }
`;

const TableRow = styled.div`
  display: grid;
  /* Adjusted grid columns to match TableHeader */
  display: grid;
  /* Adjusted grid columns to match TableHeader */
  grid-template-columns: 2.5fr 1.2fr 1fr 1fr 1fr 1.5fr 1.2fr;
  gap: var(--space-4, 1rem); /* Use CSS var */
  padding: var(--space-4, 1rem); /* Use CSS var */
  align-items: center; /* Vertically align items in row */
  border-bottom: 1px solid var(--border-primary);
  transition: background-color var(--transition-fast); /* Use CSS var */
  background: var(--bg-card);
  color: var(--text-primary);
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  [data-theme="dark"] & {
    background: var(--bg-card); /* Correctly inherits */
    color: var(--text-primary); /* Correctly inherits */
    border-bottom-color: var(--border-primary); /* Correctly inherits */
    
    &:hover {
      background-color: var(--bg-secondary); /* Correctly inherits */
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr; /* Stack columns on mobile */
    gap: var(--space-3, 0.75rem);
    padding: var(--space-3, 0.75rem);

    & > div { /* Style individual cells for mobile */
      display: flex;
      justify-content: space-between;
      padding: var(--space-2, 0.5rem) 0;
      border-bottom: 1px dashed var(--border-secondary); /* Separator for cell items */

      &:last-child {
        border-bottom: none; /* No border for the action buttons container */
        justify-content: flex-start; /* Align buttons to the start */
        gap: var(--space-3);
      }

      /* Add labels using ::before pseudo-element */
      &:nth-child(1)::before { content: "Symbol: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
      &:nth-child(2)::before { content: "Type: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
      &:nth-child(3)::before { content: "Quantity: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
      &:nth-child(4)::before { content: "Price: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
      &:nth-child(5)::before { content: "Total: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
      &:nth-child(6)::before { content: "Date: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
    }

    /* Ensure SymbolContainer and its contents stack nicely on mobile */
    ${SymbolContainer} {
      flex-direction: row; /* Keep logo and text side-by-side */
      align-items: center;
      width: 100%; /* Take full width in its flex context */
    }
    ${SymbolText} {
      align-items: flex-start; /* Align text to the start if it wraps */
    }
     /* Adjust action buttons for mobile */
    & > div:nth-child(7) { /* Targeting the actions div */
      padding-top: var(--space-3);
    }
  }
`;

const TransactionBadge = styled.span<{ type: string }>`
  display: inline-block;
  display: inline-flex; /* To allow icon and text alignment */
  align-items: center;
  gap: var(--space-2, 0.5rem);
  padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem); /* Adjusted padding */
  border-radius: var(--radius-md);
  font-size: var(--text-xs); /* Use CSS var */
  font-weight: var(--font-weight-semibold); /* Use CSS var */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid transparent; /* Base border */
  
  ${props => {
    switch (props.type) {
      case 'buy':
        return `
          background-color: var(--color-success-100);
          color: var(--color-success-700);
          border-color: var(--color-success-300);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-success-500)/0.2);
            color: var(--color-success-300); /* Lighter green for dark */
            border-color: hsla(var(--color-success-500)/0.3);
          }
        `;
      case 'sell':
        return `
          background-color: var(--color-danger-100); /* Using danger for sell */
          color: var(--color-danger-700);
          border-color: var(--color-danger-300);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-danger-500)/0.2);
            color: var(--color-danger-300); /* Lighter red for dark */
            border-color: hsla(var(--color-danger-500)/0.3);
          }
        `;
      case 'dividend':
        return `
          background-color: var(--color-accent-100); /* Using accent for dividend */
          color: var(--color-accent-700);
          border-color: var(--color-accent-300);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-accent-500)/0.2);
            color: var(--color-accent-300); /* Lighter accent for dark */
            border-color: hsla(var(--color-accent-500)/0.3);
          }
        `;
      default: // Other types like 'split'
        return `
          background-color: var(--color-gray-100);
          color: var(--color-gray-700);
          border-color: var(--color-gray-300);

          [data-theme="dark"] & {
            background-color: hsla(var(--color-gray-500)/0.2);
            color: var(--color-gray-300);
            border-color: hsla(var(--color-gray-500)/0.3);
          }
        `;
    }
  }}
`;

const AssetTypeBadge = styled.span<{ type: string }>`
  display: inline-block;
  display: inline-block;
  padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem); /* Use CSS vars */
  border-radius: var(--radius-sm);
  font-size: 0.7em; /* Relative to parent, makes it smaller */
  font-weight: var(--font-weight-medium); /* Use CSS var */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: var(--space-1, 0.25rem); /* Add some space from symbol name */
  /* Default subtle appearance */
  background-color: var(--color-gray-100);
  color: var(--color-gray-700);

  [data-theme="dark"] & {
    background-color: var(--color-gray-700); /* Darker gray for dark theme */
    color: var(--color-gray-200);
  }

  /* Specific overrides if needed, but a generic style might be better for simplicity */
  /* For example, for stock:
  ${props => props.type === 'stock' && `
    background-color: var(--color-secondary-100);
    color: var(--color-secondary-700);
    [data-theme="dark"] & {
      background-color: var(--color-secondary-700);
      color: var(--color-secondary-200);
    }
  `}
  */
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem); /* Use CSS vars */
  border: 1px solid;
  border-radius: var(--radius-md);
  font-size: var(--text-xs); /* Use CSS var */
  font-weight: var(--font-weight-medium); /* Use CSS var */
  cursor: pointer;
  margin-right: var(--space-2, 0.5rem); /* Use CSS var */
  transition: all var(--transition-fast);
  
  ${props => props.variant === 'edit' ? `
    background-color: var(--color-secondary-100); /* Lighter secondary for edit */
    color: var(--color-secondary-700);
    border-color: var(--color-secondary-300);
    
    &:hover {
      background-color: var(--color-secondary-200);
      border-color: var(--color-secondary-500);
      color: var(--color-secondary-800);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
    
    [data-theme="dark"] & {
      background-color: var(--color-secondary-700);
      color: var(--color-secondary-100);
      border-color: var(--color-secondary-500);
      
      &:hover {
        background-color: var(--color-secondary-600);
        border-color: var(--color-secondary-300);
        color: var(--color-secondary-50);
      }
    }
  ` : ` /* Delete variant */
    background-color: var(--color-danger-100);
    color: var(--color-danger-700);
    border-color: var(--color-danger-300);
    
    &:hover {
      background-color: var(--color-danger-200);
      border-color: var(--color-danger-500);
      color: var(--color-danger-800);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
    
    [data-theme="dark"] & {
      background-color: hsla(var(--color-danger-500)/0.2);
      color: var(--color-danger-300);
      border-color: hsla(var(--color-danger-500)/0.3);
      
      &:hover {
        background-color: hsla(var(--color-danger-500)/0.3);
        border-color: var(--color-danger-300);
        color: var(--color-danger-200);
      }
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-8, 2rem) var(--space-4, 1rem); /* Use CSS vars, adjusted from 3rem */
  color: var(--text-muted); /* Use CSS var */
`;

const LoadingState = styled.div`
  text-align: center;
  padding: var(--space-8, 2rem); /* Use CSS var */
  color: var(--text-muted); /* Use CSS var */
`;

const ErrorState = styled.div`
  background-color: var(--color-danger-100); /* Use CSS var */
  color: var(--color-danger-700); /* Use CSS var */
  padding: var(--space-4, 1rem); /* Use CSS var */
  border-radius: var(--radius-md); /* Use CSS var */
  margin-bottom: var(--space-4, 1rem); /* Use CSS var */
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
          <option value="etf">ETFs</option>
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
                  {transaction.transaction_type === 'buy' && <ArrowDownCircle size="0.9em" />}
                  {transaction.transaction_type === 'sell' && <ArrowUpCircle size="0.9em" />}
                  {transaction.transaction_type === 'dividend' && <Gift size="0.9em" />}
                  {transaction.transaction_type === 'split' && <Info size="0.9em" />}
                  {/* Add other icons as needed */}
                  {!['buy', 'sell', 'dividend', 'split'].includes(transaction.transaction_type) && <Info size="0.9em" />}
                  <span style={{ marginLeft: '0.25em' }}>{transaction.transaction_type || 'buy'}</span>
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
                  <Edit3 size="0.875em" style={{ marginRight: '0.25em' }}/> Edit
                </ActionButton>
                <ActionButton 
                  variant="delete" 
                  onClick={() => onDelete(transaction.id)}
                >
                  <Trash2 size="0.875em" style={{ marginRight: '0.25em' }}/> Delete
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
