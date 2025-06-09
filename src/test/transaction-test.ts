// Simple test to verify TransactionList component changes
import { TransactionWithAsset } from '../components/TransactionList';

// Mock data to test the component
const mockTransactionWithAsset: TransactionWithAsset = {
  id: '1',
  portfolio_id: 'portfolio-1',
  position_id: null,
  asset_id: 'asset-1',
  transaction_type: 'buy',
  quantity: 100,
  price: 150.50,
  total_amount: 15050,
  fees: 0,
  transaction_date: '2024-01-15',
  settlement_date: null,
  exchange_rate: 1,
  currency: 'USD',
  notes: null,
  external_id: null,
  broker_name: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  asset: {
    id: 'asset-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    asset_type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    market_cap: 3000000000000,
    shares_outstanding: 15000000000,
    last_updated: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z'
  }
};

console.log('Mock transaction data structure:', mockTransactionWithAsset);
console.log('Company name:', mockTransactionWithAsset.asset.name);
console.log('Symbol:', mockTransactionWithAsset.asset.symbol);

export { mockTransactionWithAsset };