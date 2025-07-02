/**
 * Manual Reassignment Tool
 * For reassigning transactions that don't have email notes
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ArrowRight, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { 
  getTransactionsNeedingReassignment, 
  bulkReassignTransactions, 
  getAllPortfolios 
} from '../utils/manualPortfolioReassignment';

const Container = styled.div`
  margin-top: 2rem;
`;

const TransactionGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto auto auto auto auto;
  gap: 0.5rem 1rem;
  align-items: center;
  font-size: 0.875rem;
  margin: 1rem 0;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  max-height: 400px;
  overflow-y: auto;

  [data-theme="dark"] & {
    background: #374151;
  }
`;

const GridHeader = styled.div`
  font-weight: 600;
  color: #374151;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    color: #f3f4f6;
    border-bottom-color: #4b5563;
  }
`;

const TransactionRow = styled.div<{ $selected?: boolean }>`
  padding: 0.25rem;
  border-radius: 0.25rem;
  background: ${props => props.$selected ? '#dbeafe' : 'transparent'};
  cursor: pointer;

  [data-theme="dark"] & {
    background: ${props => props.$selected ? '#1e3a8a' : 'transparent'};
  }

  &:hover {
    background: ${props => props.$selected ? '#bfdbfe' : '#f1f5f9'};

    [data-theme="dark"] & {
      background: ${props => props.$selected ? '#1d4ed8' : '#4b5563'};
    }
  }
`;

const SelectionControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
  flex-wrap: wrap;
`;

const PortfolioSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }
`;

interface Transaction {
  id: string;
  asset_id: string;
  symbol?: string;
  transaction_type: string;
  quantity: number;
  price: number;
  transaction_date: string;
  created_at: string;
  portfolio_id: string;
  portfolio_name?: string;
}

interface Portfolio {
  id: string;
  name: string;
}

export default function ManualReassignmentTool() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsResult, portfoliosResult] = await Promise.all([
        getTransactionsNeedingReassignment(100),
        getAllPortfolios()
      ]);

      if (transactionsResult.success) {
        setTransactions(transactionsResult.transactions);
        setTotalCount(transactionsResult.totalCount);
      }

      if (portfoliosResult.success) {
        setPortfolios(portfoliosResult.portfolios);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const selectAll = () => {
    setSelectedTransactions(new Set(transactions.map(t => t.id)));
  };

  const selectNone = () => {
    setSelectedTransactions(new Set());
  };

  const selectBySymbol = (symbol: string) => {
    const symbolTransactions = transactions.filter(t => t.symbol === symbol);
    const newSelected = new Set(selectedTransactions);
    symbolTransactions.forEach(t => newSelected.add(t.id));
    setSelectedTransactions(newSelected);
  };

  const reassignSelected = async () => {
    if (selectedTransactions.size === 0 || !selectedPortfolio) return;

    setLoading(true);
    try {
      const result = await bulkReassignTransactions(
        Array.from(selectedTransactions),
        selectedPortfolio
      );

      if (result.success) {
        console.log(`✅ Successfully reassigned ${result.updatedCount} transactions`);
        setSelectedTransactions(new Set());
        await loadData(); // Reload data
      } else {
        console.error('❌ Reassignment errors:', result.errors);
      }
    } catch (error) {
      console.error('Error during reassignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueSymbols = [...new Set(transactions.map(t => t.symbol).filter(Boolean))].sort() as string[];

  if (loading && transactions.length === 0) {
    return <div>Loading transactions...</div>;
  }

  return (
    <Container>
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
          Manual Portfolio Reassignment
        </h3>
        
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          {totalCount} transactions without notes need manual reassignment from TFSA. 
          Showing first {transactions.length}.
        </p>

        <SelectionControls>
          <div>
            <Button onClick={selectAll} disabled={loading} style={{ marginRight: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              Select All
            </Button>
            <Button onClick={selectNone} disabled={loading} style={{ marginRight: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              Select None
            </Button>
          </div>

          <div>
            <span style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>Quick select by symbol:</span>
            {uniqueSymbols.slice(0, 5).map(symbol => (
              <Button
                key={symbol}
                onClick={() => selectBySymbol(symbol)}
                disabled={loading}
                style={{ 
                  marginRight: '0.5rem', 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.5rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  borderColor: '#e5e7eb'
                }}
              >
                {symbol}
              </Button>
            ))}
          </div>
        </SelectionControls>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <PortfolioSelect
            value={selectedPortfolio}
            onChange={(e) => setSelectedPortfolio(e.target.value)}
            disabled={loading}
          >
            <option value="">Select target portfolio...</option>
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </PortfolioSelect>

          <Button
            onClick={reassignSelected}
            disabled={loading || selectedTransactions.size === 0 || !selectedPortfolio}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={16} />}
            Reassign {selectedTransactions.size} Selected
          </Button>
        </div>

        <TransactionGrid>
          <GridHeader></GridHeader>
          <GridHeader>Symbol</GridHeader>
          <GridHeader>Type</GridHeader>
          <GridHeader>Quantity</GridHeader>
          <GridHeader>Price</GridHeader>
          <GridHeader>Date</GridHeader>
          <GridHeader>Created</GridHeader>
          <GridHeader>ID</GridHeader>

          {transactions.map(transaction => {
            const isSelected = selectedTransactions.has(transaction.id);
            return [
              <TransactionRow
                key={`${transaction.id}-select`}
                $selected={isSelected}
                onClick={() => toggleTransaction(transaction.id)}
              >
                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-symbol`} $selected={isSelected}>
                {transaction.symbol}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-type`} $selected={isSelected}>
                {transaction.transaction_type}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-quantity`} $selected={isSelected}>
                {transaction.quantity}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-price`} $selected={isSelected}>
                ${transaction.price}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-date`} $selected={isSelected}>
                {transaction.transaction_date}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-created`} $selected={isSelected}>
                {new Date(transaction.created_at).toLocaleDateString()}
              </TransactionRow>,
              <TransactionRow key={`${transaction.id}-id`} $selected={isSelected}>
                {transaction.id.slice(0, 8)}...
              </TransactionRow>
            ];
          })}
        </TransactionGrid>
      </Card>
    </Container>
  );
}