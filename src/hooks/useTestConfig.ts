/**
 * Test configuration and mock data provider for E2E tests
 * Provides mock transaction data when authentication is bypassed
 */

import { useEffect, useState } from 'react';
import type { Transaction, Portfolio } from '../types/portfolio';
import type { TransactionWithAsset } from '../components/TransactionList';

// Check if we're in test mode
export const isTestMode = () => {
  return (
    import.meta.env.VITE_TEST_MODE === 'true' ||
    import.meta.env.VITE_APP_ENVIRONMENT === 'test' ||
    localStorage.getItem('__E2E_TEST_MODE__') === 'true' ||
    (window as unknown as Record<string, boolean>).__E2E_TEST_MODE__ === true
  );
};

// Check if authentication should be bypassed
export const isAuthBypassed = () => {
  return (
    import.meta.env.VITE_AUTH_BYPASS === 'true' ||
    localStorage.getItem('__AUTH_BYPASS__') === 'true' ||
    isTestMode()
  );
};

// Mock portfolio data for testing
export const getMockPortfolio = (): Portfolio => ({
  id: 'test-portfolio-1',
  name: 'Test Portfolio',
  description: 'Portfolio for E2E testing',
  totalValue: 150000,
  dailyChange: 2500,
  dailyChangePercent: 1.69,
  currency: 'USD',
  isActive: true,
  ownerId: 'test-user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
  assetAllocation: [],
  riskProfile: 'moderate'
});

// Mock transaction data for testing
export const getMockTransactions = (): TransactionWithAsset[] => [
  {
    id: 'test-txn-1',
    portfolio_id: 'test-portfolio-1',
    position_id: null,
    asset_id: 'test-asset-aapl',
    transaction_type: 'buy',
    quantity: 100,
    price: 150.50,
    total_amount: 15050,
    fees: 9.99,
    transaction_date: '2024-06-01',
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Test purchase of Apple stock',
    external_id: null,
    broker_name: 'Test Broker',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    asset: {
      id: 'test-asset-aapl',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      asset_type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      market_cap: 3000000000000,
      shares_outstanding: 15000000000,
      last_updated: '2024-06-01T10:00:00Z',
      created_at: '2024-06-01T10:00:00Z'
    }
  },
  {
    id: 'test-txn-2',
    portfolio_id: 'test-portfolio-1',
    position_id: null,
    asset_id: 'test-asset-googl',
    transaction_type: 'buy',
    quantity: 50,
    price: 2750.00,
    total_amount: 137500,
    fees: 9.99,
    transaction_date: '2024-06-02',
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Test purchase of Google stock',
    external_id: null,
    broker_name: 'Test Broker',
    created_at: '2024-06-02T10:00:00Z',
    updated_at: '2024-06-02T10:00:00Z',
    asset: {
      id: 'test-asset-googl',
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      asset_type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Internet Content & Information',
      market_cap: 2000000000000,
      shares_outstanding: 13000000000,
      last_updated: '2024-06-02T10:00:00Z',
      created_at: '2024-06-02T10:00:00Z'
    }
  },
  {
    id: 'test-txn-3',
    portfolio_id: 'test-portfolio-1',
    position_id: null,
    asset_id: 'test-asset-vti',
    transaction_type: 'buy',
    quantity: 200,
    price: 240.00,
    total_amount: 48000,
    fees: 0,
    transaction_date: '2024-06-03',
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Test purchase of VTI ETF',
    external_id: null,
    broker_name: 'Test Broker',
    created_at: '2024-06-03T10:00:00Z',
    updated_at: '2024-06-03T10:00:00Z',
    asset: {
      id: 'test-asset-vti',
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      asset_type: 'etf',
      exchange: 'NYSE ARCA',
      currency: 'USD',
      sector: 'Mixed',
      industry: 'Exchange Traded Funds',
      market_cap: 500000000000,
      shares_outstanding: 2000000000,
      last_updated: '2024-06-03T10:00:00Z',
      created_at: '2024-06-03T10:00:00Z'
    }
  }
];

// Hook to provide test configuration
export const useTestConfig = () => {
  const [isInTestMode, setIsInTestMode] = useState(false);
  const [authBypassed, setAuthBypassed] = useState(false);

  useEffect(() => {
    setIsInTestMode(isTestMode());
    setAuthBypassed(isAuthBypassed());

    // Log test mode status
    if (isTestMode()) {
      console.log('🧪 Test mode enabled - using mock data');
    }
  }, []);

  return {
    isTestMode: isInTestMode,
    isAuthBypassed: authBypassed,
    mockPortfolio: getMockPortfolio(),
    mockTransactions: getMockTransactions()
  };
};

// Helper to get test environment info
export const getTestEnvironmentInfo = () => ({
  environment: import.meta.env.VITE_APP_ENVIRONMENT,
  testMode: import.meta.env.VITE_TEST_MODE,
  mockDataMode: import.meta.env.VITE_MOCK_DATA_MODE,
  authBypass: import.meta.env.VITE_AUTH_BYPASS,
  debugMode: import.meta.env.VITE_DEBUG_MODE,
  logLevel: import.meta.env.VITE_LOG_LEVEL,
  isCI: !!process.env.CI || !!import.meta.env.CI
});
