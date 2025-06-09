/**
 * Integration Test Setup
 * Provides mocks and test utilities for integration testing
 */

import { vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock data for integration tests
export const mockYahooFinanceData = {
  quote: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.00,
    change: 2.50,
    changePercent: 1.69,
    previousClose: 147.50,
    open: 148.00,
    dayHigh: 151.00,
    dayLow: 147.50,
    volume: 50000000,
    marketCap: 2456789000000,
    peRatio: 25.4,
    dividendYield: 0.48,
    eps: 5.91,
    beta: 1.2,
    currency: 'USD',
    exchange: 'NASDAQ Global Select',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    lastUpdated: new Date()
  },
  search: [
    { 
      symbol: 'AAPL', 
      name: 'Apple Inc.', 
      type: 'stock',
      exchange: 'NASDAQ' 
    },
    { 
      symbol: 'GOOGL', 
      name: 'Alphabet Inc.', 
      type: 'stock',
      exchange: 'NASDAQ' 
    }
  ]
};

export const mockStorageData = [
  {
    id: '1',
    assetId: 'asset-aapl',
    assetSymbol: 'AAPL',
    assetType: 'stock',
    quantity: 10,
    averageCostBasis: 145.00,
    totalCostBasis: 1450.00,
    currentMarketValue: 1500.00,
    unrealizedPL: 50.00,
    unrealizedPLPercent: 3.45,
    realizedPL: 0,
    totalReturn: 50.00,
    totalReturnPercent: 3.45,
    currency: 'USD',
    openDate: new Date(),
    lastTransactionDate: new Date(),
    costBasisMethod: 'FIFO',
    lots: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockTransactionData = [
  {
    id: 'transaction-1',
    assetId: 'asset-aapl',
    assetSymbol: 'AAPL',
    assetType: 'stock',
    type: 'buy',
    quantity: 10,
    price: 145.00,
    totalAmount: 1450.00,
    currency: 'USD',
    date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Setup mocks before each integration test
export const setupIntegrationMocks = () => {
  // Mock Yahoo Finance API
  vi.mock('yahoo-finance2', () => ({
    default: {
      quote: vi.fn().mockResolvedValue(mockYahooFinanceData.quote),
      search: vi.fn().mockResolvedValue(mockYahooFinanceData.search),
      historical: vi.fn().mockResolvedValue([]),
    }
  }));

  // Mock the Yahoo Finance service
  vi.mock('../../services/yahooFinanceService', () => ({
    yahooFinanceService: {
      getQuote: vi.fn().mockResolvedValue({
        success: true,
        data: mockYahooFinanceData.quote,
        error: undefined,
        timestamp: new Date(),
        cached: false
      }),
      searchSymbols: vi.fn().mockResolvedValue({
        success: true,
        data: mockYahooFinanceData.search,
        error: undefined,
        timestamp: new Date(),
        cached: false
      })
    }
  }));

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn((key: string) => {
      switch (key) {
        case 'positions':
          return JSON.stringify(mockStorageData);
        case 'transactions':
          return JSON.stringify(mockTransactionData);
        default:
          return null;
      }
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
};

// Test wrapper with all required providers
export const IntegrationTestWrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'integration-wrapper' }, children);
};

// Reset function to call between tests
export const resetIntegrationMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  // Clear localStorage mock
  window.localStorage.clear();
};
