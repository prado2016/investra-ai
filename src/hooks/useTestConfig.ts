/**
 * Test configuration and mock data provider for E2E tests
 * Provides mock transaction data when authentication is bypassed
 */

import { useEffect, useRef } from 'react';
import type { Portfolio } from '../lib/database/types';
import type { UnifiedTransactionEntry } from '../types/unifiedEntry';

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
    // Only bypass auth if explicitly configured or in actual test mode
    import.meta.env.VITE_AUTH_BYPASS === 'true' ||
    (localStorage.getItem('__AUTH_BYPASS__') === 'true' && isTestMode())
  );
};

// Mock portfolio data for testing
export const getMockPortfolio = (): Portfolio => ({
  id: 'test-portfolio-1',
  name: 'Test Portfolio',
  description: 'Portfolio for E2E testing',
  currency: 'USD',
  user_id: 'test-user-1',
  is_default: true,
  is_active: true,
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date().toISOString()
});

// Mock transaction data for testing
export const getMockTransactions = (): UnifiedTransactionEntry[] => [
  // TFSA Portfolio transactions
  {
    id: 'test-txn-1',
    type: 'transaction',
    portfolioId: 'test-portfolio-tfsa',
    date: new Date('2024-06-01'),
    amount: 15050,
    currency: 'USD',
    notes: 'TFSA purchase of Apple stock',
    createdAt: new Date('2024-06-01T10:00:00Z'),
    updatedAt: new Date('2024-06-01T10:00:00Z'),
    transactionType: 'buy',
    assetId: 'test-asset-aapl',
    assetSymbol: 'AAPL',
    assetType: 'stock',
    quantity: 100,
    price: 150.50,
    fees: 9.99,
    brokerName: 'Test Broker',
    externalId: undefined,
    settlementDate: undefined,
    strategyType: undefined,
    asset: {
      id: 'test-asset-aapl',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      marketCap: 3000000000000,
    }
  },
  {
    id: 'test-txn-2',
    type: 'transaction',
    portfolioId: 'test-portfolio-tfsa',
    date: new Date('2024-06-02'),
    amount: 137500,
    currency: 'USD',
    notes: 'TFSA purchase of Google stock',
    createdAt: new Date('2024-06-02T10:00:00Z'),
    updatedAt: new Date('2024-06-02T10:00:00Z'),
    transactionType: 'buy',
    assetId: 'test-asset-googl',
    assetSymbol: 'GOOGL',
    assetType: 'stock',
    quantity: 50,
    price: 2750.00,
    fees: 9.99,
    brokerName: 'Test Broker',
    externalId: undefined,
    settlementDate: undefined,
    strategyType: undefined,
    asset: {
      id: 'test-asset-googl',
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      assetType: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Internet Content & Information',
      marketCap: 2000000000000,
    }
  },
  // RSP Portfolio transactions
  {
    id: 'test-txn-3',
    type: 'transaction',
    portfolioId: 'test-portfolio-rsp',
    date: new Date('2024-06-03'),
    amount: 48000,
    currency: 'USD',
    notes: 'RSP purchase of VTI ETF',
    createdAt: new Date('2024-06-03T10:00:00Z'),
    updatedAt: new Date('2024-06-03T10:00:00Z'),
    transactionType: 'buy',
    assetId: 'test-asset-vti',
    assetSymbol: 'VTI',
    assetType: 'etf',
    quantity: 200,
    price: 240.00,
    fees: 0,
    brokerName: 'Test Broker',
    externalId: undefined,
    settlementDate: undefined,
    strategyType: undefined,
    asset: {
      id: 'test-asset-vti',
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      assetType: 'etf',
      category: 'equity',
      exchange: 'NYSE ARCA',
      currency: 'USD',
      marketCap: 500000000000,
    }
  },
  {
    id: 'test-txn-4',
    type: 'transaction',
    portfolioId: 'test-portfolio-rsp',
    date: new Date('2024-06-04'),
    amount: 25000,
    currency: 'CAD',
    notes: 'RSP purchase of Canadian bank stock',
    createdAt: new Date('2024-06-04T10:00:00Z'),
    updatedAt: new Date('2024-06-04T10:00:00Z'),
    transactionType: 'buy',
    assetId: 'test-asset-td',
    assetSymbol: 'TD.TO',
    assetType: 'stock',
    quantity: 100,
    price: 250.00,
    fees: 9.99,
    brokerName: 'Test Broker',
    externalId: undefined,
    settlementDate: undefined,
    strategyType: undefined,
    asset: {
      id: 'test-asset-td',
      symbol: 'TD.TO',
      name: 'The Toronto-Dominion Bank',
      assetType: 'stock',
      exchange: 'TSX',
      currency: 'CAD',
      sector: 'Financial',
      industry: 'Banking',
      marketCap: 150000000000,
    }
  },
  // Margin Portfolio transactions
  {
    id: 'test-txn-5',
    type: 'transaction',
    portfolioId: 'test-portfolio-margin',
    date: new Date('2024-06-05'),
    amount: 75000,
    currency: 'USD',
    notes: 'Margin purchase of Tesla stock',
    createdAt: new Date('2024-06-05T10:00:00Z'),
    updatedAt: new Date('2024-06-05T10:00:00Z'),
    transactionType: 'buy',
    assetId: 'test-asset-tsla',
    assetSymbol: 'TSLA',
    assetType: 'stock',
    quantity: 250,
    price: 300.00,
    fees: 9.99,
    brokerName: 'Test Broker',
    externalId: undefined,
    settlementDate: undefined,
    strategyType: undefined,
    asset: {
      id: 'test-asset-tsla',
      symbol: 'TSLA',
      name: 'Tesla, Inc.',
      assetType: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Consumer Cyclical',
      industry: 'Auto Manufacturers',
      marketCap: 800000000000,
    }
  },
  {
    id: 'test-txn-6',
    type: 'transaction',
    portfolioId: 'test-portfolio-margin',
    date: new Date('2024-06-06'),
    amount: 30000,
    currency: 'USD',
    notes: 'Margin purchase of NVIDIA stock',
    createdAt: new Date('2024-06-06T10:00:00Z'),
    updatedAt: new Date('2024-06-06T10:00:00Z'),
    transactionType: 'buy',
    assetId: 'test-asset-nvda',
    assetSymbol: 'NVDA',
    assetType: 'stock',
    quantity: 50,
    price: 600.00,
    fees: 9.99,
    brokerName: 'Test Broker',
    externalId: undefined,
    settlementDate: undefined,
    strategyType: undefined,
    asset: {
      id: 'test-asset-nvda',
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      assetType: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Semiconductors',
      marketCap: 1500000000000,
    }
  }
];

// Hook to provide test configuration
export const useTestConfig = () => {
  const testModeRef = useRef(isTestMode());
  const authBypassRef = useRef(isAuthBypassed());

  // Log test mode status only once
  useEffect(() => {
    if (testModeRef.current) {
      console.log('🧪 Test mode enabled - using mock data');
    }
  }, []);

  return {
    isTestMode: testModeRef.current,
    isAuthBypassed: authBypassRef.current,
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
