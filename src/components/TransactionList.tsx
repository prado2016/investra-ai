import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ArrowDownCircle, ArrowUpCircle, Gift, Edit3, Trash2, Info, Clock, ArrowLeftRight, Shuffle, TrendingDown, Target } from 'lucide-react';
import { formatCurrency, formatDate, formatTransactionAmount } from '../utils/formatting';
import { parseOptionSymbol } from '../utils/assetCategorization';
import CompanyLogo from './CompanyLogo';
import type { UnifiedEntry, UnifiedTransactionEntry, UnifiedFundMovementEntry } from '../types/unifiedEntry';
import type { Portfolio } from '../lib/database/types';

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

const OptionFullSymbol = styled.div`
  font-size: var(--text-xs); /* Smaller than main symbol */
  color: var(--text-secondary); /* Muted color */
  font-family: var(--font-family-mono);
  letter-spacing: 0.25px;
  
  [data-theme="dark"] & {
    color: var(--text-secondary);
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

const FilterInput = styled.input`
  padding: var(--space-3, 0.75rem); /* Use CSS var */
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm); /* Use CSS var */
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-width: 180px; /* Slightly wider than selects for text input */
  flex-grow: 1; /* Allow input to grow */
  transition: all var(--transition-fast);
  
  &::placeholder {
    color: var(--text-muted);
  }
  
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
    
    &::placeholder {
      color: var(--text-muted);
    }
    
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
  /* Adjusted grid columns: Symbol, Type, Quantity, Price, Total, Portfolio, Date, Actions */
  grid-template-columns: 2.2fr 1fr 0.9fr 1fr 1fr 1fr 1.3fr 1.5fr;
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
  /* Adjusted grid columns to match TableHeader: Symbol, Type, Quantity, Price, Total, Portfolio, Date, Actions */
  grid-template-columns: 2.2fr 1fr 0.9fr 1fr 1fr 1fr 1.3fr 1.5fr;
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
      &:nth-child(6)::before { content: "Portfolio: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
      &:nth-child(7)::before { content: "Date: "; font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
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
      case 'option_expired':
        return `
          background-color: var(--color-warning-100); /* Using warning for expired */
          color: var(--color-warning-700);
          border-color: var(--color-warning-300);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-warning-500)/0.2);
            color: var(--color-warning-300); /* Lighter warning for dark */
            border-color: hsla(var(--color-warning-500)/0.3);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem); /* Use CSS vars */
  border: 1px solid;
  border-radius: var(--radius-md);
  font-size: var(--text-xs); /* Use CSS var */
  font-weight: var(--font-weight-medium); /* Use CSS var */
  cursor: pointer;
  margin-right: var(--space-2, 0.5rem); /* Use CSS var */
  transition: all var(--transition-fast);
  min-width: 70px; /* Standardized minimum width */
  height: 32px; /* Standardized height */
  gap: var(--space-1, 0.25rem); /* Consistent spacing between icon and text */
  
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
  entries: UnifiedEntry[];
  portfolios: Portfolio[];
  loading: boolean;
  error?: string | null;
  onEdit: (entry: UnifiedEntry) => void;
  onDelete: (id: string, type: 'transaction' | 'fund_movement') => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  entries,
  portfolios,
  loading,
  error,
  onEdit,
  onDelete
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');

  // Helper function to get portfolio name by ID
  const getPortfolioName = (portfolioId: string): string => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    return portfolio ? portfolio.name : 'Unknown Portfolio';
  };
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (entry.type === 'transaction') {
        const transaction = entry as UnifiedTransactionEntry;
        const typeMatch = filterType === 'all' || transaction.transactionType === filterType;
        const assetMatch = filterAsset === 'all' || transaction.assetType === filterAsset;
        const symbolMatch = !filterSymbol || 
          transaction.assetSymbol?.toLowerCase().includes(filterSymbol.toLowerCase());
        
        // Date range filtering
        let dateMatch = true;
        if (filterDateRange !== 'all') {
          const transactionDate = entry.date;
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          switch (filterDateRange) {
            case 'today': {
              dateMatch = transactionDate >= todayStart;
              break;
            }
            case '7days': {
              const sevenDaysAgo = new Date(todayStart);
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              dateMatch = transactionDate >= sevenDaysAgo;
              break;
            }
          case '30days': {
            const thirtyDaysAgo = new Date(todayStart);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateMatch = transactionDate >= thirtyDaysAgo;
            break;
          }
          case '90days': {
            const ninetyDaysAgo = new Date(todayStart);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            dateMatch = transactionDate >= ninetyDaysAgo;
            break;
          }
          case 'thisYear': {
            const yearStart = new Date(today.getFullYear(), 0, 1);
            dateMatch = transactionDate >= yearStart;
            break;
          }
          case 'custom': {
            if (customStartDate && customEndDate) {
              const startDate = new Date(customStartDate);
              const endDate = new Date(customEndDate);
              endDate.setHours(23, 59, 59, 999); // Include the entire end date
              dateMatch = transactionDate >= startDate && transactionDate <= endDate;
            } else if (customStartDate) {
              const startDate = new Date(customStartDate);
              dateMatch = transactionDate >= startDate;
            } else if (customEndDate) {
              const endDate = new Date(customEndDate);
              endDate.setHours(23, 59, 59, 999);
              dateMatch = transactionDate <= endDate;
            }
            break;
          }
          default:
            dateMatch = true;
        }
      
        return typeMatch && assetMatch && symbolMatch && dateMatch;
      }
      
        return typeMatch && assetMatch && symbolMatch && dateMatch;
      }
      return true; // Include fund movements for now
    });
  }, [entries, filterType, filterAsset, filterSymbol, filterDateRange, customStartDate, customEndDate]);

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => 
      b.date.getTime() - a.date.getTime()
    );
  }, [filteredEntries]);

  // Show all entries with proper scrolling
  const recentEntries = useMemo(() => {
    return sortedEntries; // Show all entries, scrolling handled by container
  }, [sortedEntries]);

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
          <option value="option_expired">Option Expired</option>
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
        
        <FilterInput
          type="text"
          placeholder="Filter by Symbol..."
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
        />
        
        <FilterSelect
          value={filterDateRange}
          onChange={(e) => setFilterDateRange(e.target.value)}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="thisYear">This Year</option>
          <option value="custom">Custom Range</option>
        </FilterSelect>
        
        {filterDateRange === 'custom' && (
          <>
            <FilterInput
              type="date"
              placeholder="Start Date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
            <FilterInput
              type="date"
              placeholder="End Date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </>
        )}
      </FilterBar>

      {recentEntries.length === 0 ? (
        <EmptyState>
          {entries.length === 0 
            ? "No entries yet. Click 'Add Transaction' to get started."
            : "No entries match the current filters."
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
            <div>Portfolio</div>
            <div>Date</div>
            <div>Actions</div>
          </TableHeader>
          
          <div>
            {recentEntries
              .filter(entry => entry && entry.id) // Filter out invalid entries
              .map((entry) => {
                if (entry.type === 'transaction') {
                  const transaction = entry as UnifiedTransactionEntry;
                  return (
            <TableRow key={entry.id}>
              <SymbolContainer>
                <CompanyLogo
                  symbol={(() => {
                    // For options, use the underlying symbol for the logo
                    if (transaction.assetType === 'option') {
                      const parsedSymbol = parseOptionSymbol(transaction.assetSymbol);
                      if (parsedSymbol) {
                        return parsedSymbol.underlying.toUpperCase();
                      }
                    }
                    return transaction.assetSymbol || 'N/A';
                  })()}
                  size="md"
                />
                <SymbolText>
                  <SymbolName>
                    {(() => {
                      if (transaction.assetType === 'option') {
                        const parsedSymbol = parseOptionSymbol(transaction.assetSymbol);
                        if (parsedSymbol) {
                          // Show the underlying symbol as the main name
                          return parsedSymbol.underlying.toUpperCase();
                        }
                      }
                      return transaction.assetSymbol || 'N/A';
                    })()}
                  </SymbolName>
                  {transaction.assetType === 'option' && (
                    <OptionFullSymbol>
                      {(() => {
                        const parsedSymbol = parseOptionSymbol(transaction.assetSymbol);
                        if (parsedSymbol) {
                          // Format: "May 16 $0 CALL"
                          const month = parsedSymbol.expiration.toLocaleDateString('en-US', { month: 'short' });
                          const day = parsedSymbol.expiration.getDate();
                          const strike = parsedSymbol.strike === 0 ? '0' : parsedSymbol.strike.toString();
                          const type = parsedSymbol.type.toUpperCase();
                          return `${month} ${day} $${strike} ${type}`;
                        }
                        return transaction.assetSymbol.toLowerCase();
                      })()}
                    </OptionFullSymbol>
                  )}
                  {transaction.assetType !== 'option' && (
                    <div
                      className="transaction-company-name"
                      title={transaction.asset?.name || 'Unknown Company'}
                    >
                      {transaction.asset?.name || 'Unknown Company'}
                    </div>
                  )}
                  <AssetTypeBadge type={transaction.assetType || 'stock'}>
                    {transaction.assetType || 'stock'}
                  </AssetTypeBadge>
                </SymbolText>
              </SymbolContainer>
            
              <div>
                <TransactionBadge type={transaction.transactionType || 'buy'}>
                  {transaction.transactionType === 'buy' && <ArrowDownCircle size="0.9em" />}
                  {transaction.transactionType === 'sell' && <ArrowUpCircle size="0.9em" />}
                  {transaction.transactionType === 'dividend' && <Gift size="0.9em" />}
                  {transaction.transactionType === 'split' && <Shuffle size="0.9em" />}
                  {transaction.transactionType === 'merger' && <ArrowLeftRight size="0.9em" />}
                  {transaction.transactionType === 'option_expired' && <Clock size="0.9em" />}
                  {transaction.transactionType === 'short_option_expired' && <TrendingDown size="0.9em" />}
                  {transaction.transactionType === 'short_option_assigned' && <Target size="0.9em" />}
                  {!['buy', 'sell', 'dividend', 'split', 'merger', 'option_expired', 'short_option_expired', 'short_option_assigned'].includes(transaction.transactionType) && <Info size="0.9em" />}
                  <span style={{ marginLeft: '0.25em' }}>
                    {transaction.transactionType === 'option_expired' ? 'Option Expired' : 
                     transaction.transactionType === 'short_option_expired' ? 'Short Expired' :
                     transaction.transactionType === 'short_option_assigned' ? 'Short Assigned' :
                     transaction.transactionType || 'buy'}
                  </span>
                </TransactionBadge>
              </div>
              
              <div className="financial-data">
                {(transaction.quantity || 0).toLocaleString()}
              </div>
              
              <div className="financial-data">
                {formatCurrency(transaction.price || 0, transaction.currency || 'USD')}
              </div>
              
              <div className="financial-data">
                {formatTransactionAmount(
                  transaction.amount || 0, 
                  transaction.currency || 'USD',
                  transaction.assetType,
                  transaction.quantity,
                  transaction.fees
                )}
              </div>
              
              <div>
                {getPortfolioName(transaction.portfolioId)}
              </div>
              
              <div>
                {formatDate(transaction.date)}
              </div>
              
              <div>
                <ActionButton 
                  variant="edit" 
                  onClick={() => onEdit(entry)}
                >
                  <Edit3 size="0.875em" /> Edit
                </ActionButton>
                <ActionButton 
                  variant="delete" 
                  onClick={() => onDelete(entry.id, 'transaction')}
                >
                  <Trash2 size="0.875em" /> Delete
                </ActionButton>
              </div>
            </TableRow>
                  );
                } else {
                  // Handle fund movements
                  const fundMovement = entry as UnifiedFundMovementEntry;
                  return (
                    <TableRow key={entry.id}>
                      <div>Fund Movement</div>
                      <div>
                        <TransactionBadge type={fundMovement.fundMovementType as string}>
                          <ArrowLeftRight size="0.9em" />
                          <span style={{ marginLeft: '0.25em' }}>{fundMovement.fundMovementType}</span>
                        </TransactionBadge>
                      </div>
                      <div>-</div>
                      <div>-</div>
                      <div className="financial-data">
                        {formatCurrency(fundMovement.amount, fundMovement.currency)}
                      </div>
                      <div>
                        {getPortfolioName(fundMovement.portfolioId)}
                      </div>
                      <div>{formatDate(fundMovement.date)}</div>
                      <div>
                        <ActionButton 
                          variant="edit" 
                          onClick={() => onEdit(entry)}
                        >
                          <Edit3 size="0.875em" /> Edit
                        </ActionButton>
                        <ActionButton 
                          variant="delete" 
                          onClick={() => onDelete(entry.id, 'fund_movement')}
                        >
                          <Trash2 size="0.875em" /> Delete
                        </ActionButton>
                      </div>
                    </TableRow>
                  );
                }
              })}
          </div>
        </TransactionTable>
      )}
    </Container>
  );
};

export default TransactionList;
