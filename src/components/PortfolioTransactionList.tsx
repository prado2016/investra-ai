/**
 * Portfolio-Aware Transaction List Component
 * Task 8.3: Implement portfolio-aware transaction lists
 * Enhanced transaction list that supports multi-portfolio filtering and display
 */

import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Gift, 
  Edit3, 
  Trash2, 
  Briefcase,
  BarChart3,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { usePortfolios } from '../contexts/PortfolioContext';
import PortfolioSelector from './PortfolioSelector';
import CompanyLogo from './CompanyLogo';
import { formatCurrency, formatDate } from '../utils/formatting';
import type { Asset, Portfolio } from '../lib/database/types';
import type { UnifiedTransactionEntry } from '../types/unifiedEntry';

// Extended transaction type that includes asset and portfolio information
export interface PortfolioTransactionWithAsset extends UnifiedTransactionEntry {
  asset: Asset;
  portfolio?: Portfolio;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 160px;
  flex: 1;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #111827;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;
  }
`;

const FilterInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #111827;
  transition: all 0.2s ease;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;

    &::placeholder {
      color: #6b7280;
    }
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;

    &:hover {
      background: #6b7280;
    }
  }
`;

const TransactionTable = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 120px 120px 120px 80px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #9ca3af;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 100px 100px 60px;
    gap: 0.5rem;
    padding: 0.75rem 1rem;

    & > *:nth-child(4),
    & > *:nth-child(5) {
      display: none;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr 60px;
    
    & > *:nth-child(3),
    & > *:nth-child(4),
    & > *:nth-child(5) {
      display: none;
    }
  }
`;

const TransactionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 120px 120px 120px 80px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }

  [data-theme="dark"] & {
    border-color: #4b5563;

    &:hover {
      background: #4b5563;
    }
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 100px 100px 60px;
    gap: 0.5rem;
    padding: 0.75rem 1rem;

    & > *:nth-child(4),
    & > *:nth-child(5) {
      display: none;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr 60px;
    
    & > *:nth-child(3),
    & > *:nth-child(4),
    & > *:nth-child(5) {
      display: none;
    }
  }
`;

const AssetInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
`;

const AssetDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const AssetSymbol = styled.div`
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: #111827;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const AssetName = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const PortfolioBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  [data-theme="dark"] & {
    background: #1e3a8a;
    color: #93c5fd;
  }
`;

const TransactionType = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: ${props => {
    switch (props.$type) {
      case 'buy': return '#059669';
      case 'sell': return '#dc2626';
      case 'dividend': return '#7c3aed';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$type) {
        case 'buy': return '#10b981';
        case 'sell': return '#f87171';
        case 'dividend': return '#a78bfa';
        default: return '#9ca3af';
      }
    }};
  }
`;

const AmountCell = styled.div<{ $positive?: boolean }>`
  text-align: right;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: ${props => props.$positive ? '#059669' : '#111827'};

  [data-theme="dark"] & {
    color: ${props => props.$positive ? '#10b981' : '#f3f4f6'};
  }
`;

const DateCell = styled.div`
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ActionsCell = styled.div`
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  &.edit {
    color: #3b82f6;
    &:hover {
      background: #eff6ff;
    }
  }

  &.delete {
    color: #dc2626;
    &:hover {
      background: #fef2f2;
    }
  }

  [data-theme="dark"] & {
    &.edit:hover {
      background: #1e3a8a;
    }
    &.delete:hover {
      background: #7f1d1d;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ErrorState = styled.div`
  background: #fef2f2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;

  [data-theme="dark"] & {
    background: #7f1d1d;
    color: #fca5a5;
  }
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

interface PortfolioTransactionListProps {
  transactions: PortfolioTransactionWithAsset[];
  loading: boolean;
  error?: string | null;
  onEdit: (transaction: PortfolioTransactionWithAsset) => void;
  onDelete: (id: string) => void;
  showPortfolioFilter?: boolean;
  showSummaryStats?: boolean;
  title?: string;
  className?: string;
}

const PortfolioTransactionList: React.FC<PortfolioTransactionListProps> = ({
  transactions,
  loading,
  error,
  onEdit,
  onDelete,
  showPortfolioFilter = true,
  showSummaryStats = true,
  title = "Transactions",
  className
}) => {
  const { portfolios, activePortfolio } = usePortfolios();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterPortfolio, setFilterPortfolio] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Reset portfolio filter when active portfolio changes
  useEffect(() => {
    if (filterPortfolio === 'active') {
      // Filter will automatically update based on activePortfolio
    }
  }, [activePortfolio?.id, filterPortfolio]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Portfolio filter
      const portfolioMatch = (() => {
        if (filterPortfolio === 'all') return true;
        if (filterPortfolio === 'active') {
          return transaction.portfolioId === activePortfolio?.id;
        }
        return transaction.portfolioId === filterPortfolio;
      })();

      // Other filters
      const typeMatch = filterType === 'all' || transaction.transactionType === filterType;
      const assetMatch = filterAsset === 'all' || transaction.asset?.assetType === filterAsset;
      const symbolMatch = !filterSymbol || 
        transaction.asset?.symbol?.toLowerCase().includes(filterSymbol.toLowerCase());
      
      return portfolioMatch && typeMatch && assetMatch && symbolMatch;
    });
  }, [transactions, filterType, filterAsset, filterSymbol, filterPortfolio, activePortfolio?.id]);

  const summaryStats = useMemo(() => {
    const stats = {
      totalTransactions: filteredTransactions.length,
      totalValue: 0,
      totalBuys: 0,
      totalSells: 0,
      totalDividends: 0
    };

    filteredTransactions.forEach(transaction => {
      stats.totalValue += transaction.amount;
      
      switch (transaction.transactionType) {
        case 'buy':
          stats.totalBuys += transaction.amount;
          break;
        case 'sell':
          stats.totalSells += transaction.amount;
          break;
        case 'dividend':
          stats.totalDividends += transaction.amount;
          break;
      }
    });

    return stats;
  }, [filteredTransactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <ArrowDownCircle size={16} />;
      case 'sell':
        return <ArrowUpCircle size={16} />;
      case 'dividend':
        return <Gift size={16} />;
      default:
        return <ArrowDownCircle size={16} />;
    }
  };

  const getPortfolioName = (portfolioId: string): string => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    return portfolio?.name || 'Unknown Portfolio';
  };

  if (loading) {
    return (
      <Container className={className}>
        <LoadingState>Loading transactions...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className={className}>
        <ErrorState>Error: {error}</ErrorState>
      </Container>
    );
  }

  return (
    <Container className={className}>
      <Header>
        <HeaderLeft>
          <Title>
            <BarChart3 size={24} />
            {title}
            <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}>
              ({filteredTransactions.length})
            </span>
          </Title>
          {showPortfolioFilter && (
            <PortfolioSelector
              compact={true}
              showCreateButton={false}
            />
          )}
        </HeaderLeft>
        <HeaderRight>
          <ActionButton
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <EyeOff size={16} /> : <Eye size={16} />}
            Filters
          </ActionButton>
          <ActionButton onClick={() => {}}>
            <Download size={16} />
            Export
          </ActionButton>
        </HeaderRight>
      </Header>

      {showSummaryStats && (
        <SummaryStats>
          <StatCard>
            <StatLabel>Total Transactions</StatLabel>
            <StatValue>{summaryStats.totalTransactions}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Total Buys</StatLabel>
            <StatValue>{formatCurrency(summaryStats.totalBuys)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Total Sells</StatLabel>
            <StatValue>{formatCurrency(summaryStats.totalSells)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Total Dividends</StatLabel>
            <StatValue>{formatCurrency(summaryStats.totalDividends)}</StatValue>
          </StatCard>
        </SummaryStats>
      )}

      {showFilters && (
        <FilterBar>
          <FilterGroup>
            <FilterLabel>Transaction Type</FilterLabel>
            <FilterSelect
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="dividend">Dividend</option>
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Asset Type</FilterLabel>
            <FilterSelect
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
            >
              <option value="all">All Assets</option>
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="option">Option</option>
              <option value="crypto">Crypto</option>
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Portfolio</FilterLabel>
            <FilterSelect
              value={filterPortfolio}
              onChange={(e) => setFilterPortfolio(e.target.value)}
            >
              <option value="active">Active Portfolio</option>
              <option value="all">All Portfolios</option>
              {portfolios.map(portfolio => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Search Symbol</FilterLabel>
            <FilterInput
              type="text"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              placeholder="Search by symbol..."
            />
          </FilterGroup>
        </FilterBar>
      )}

      <TransactionTable>
        <TableHeader>
          <div>Asset</div>
          <div>Type</div>
          <div>Quantity</div>
          <div>Price</div>
          <div>Date</div>
          <div>Actions</div>
        </TableHeader>

        {filteredTransactions.length === 0 ? (
          <EmptyState>
            No transactions found for the selected filters.
          </EmptyState>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionRow key={transaction.id}>
              <AssetInfo>
                <CompanyLogo
                  symbol={transaction.asset?.symbol || ''}
                  size="sm"
                />
                <AssetDetails>
                  <AssetSymbol>{transaction.asset?.symbol || 'N/A'}</AssetSymbol>
                  <AssetName>
                    {transaction.asset?.name || 'Unknown Asset'}
                  </AssetName>
                  {showPortfolioFilter && filterPortfolio === 'all' && (
                    <PortfolioBadge>
                      <Briefcase size={10} />
                      {getPortfolioName(transaction.portfolioId)}
                    </PortfolioBadge>
                  )}
                </AssetDetails>
              </AssetInfo>
              
              <TransactionType $type={transaction.transactionType}>
                {getTransactionIcon(transaction.transactionType)}
                {transaction.transactionType.charAt(0).toUpperCase() + 
                 transaction.transactionType.slice(1)}
              </TransactionType>
              
              <AmountCell>
                {transaction.quantity}
              </AmountCell>
              
              <AmountCell>
                {formatCurrency(transaction.price)}
              </AmountCell>
              
              <DateCell>
                {formatDate(transaction.date)}
              </DateCell>
              
              <ActionsCell>
                <ActionBtn
                  className="edit"
                  onClick={() => onEdit(transaction)}
                  title="Edit transaction"
                >
                  <Edit3 size={14} />
                </ActionBtn>
                <ActionBtn
                  className="delete"
                  onClick={() => onDelete(transaction.id)}
                  title="Delete transaction"
                >
                  <Trash2 size={14} />
                </ActionBtn>
              </ActionsCell>
            </TransactionRow>
          ))
        )}
      </TransactionTable>
    </Container>
  );
};

export default PortfolioTransactionList;