/**
 * Hook Integration Tests
 * Tests the integration between custom hooks and services
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useQuote, useSearch } from '../../hooks/useYahooFinance';
import { usePositions, useTransactions } from '../../hooks/useStorage';
import { setupContextMocks, renderHookWithProviders } from '../utils/test-wrapper';

// Use the hook's own types to avoid interface conflicts
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';

type Transaction = {
  id: string;
  portfolioId?: string;
  assetId: string;
  assetSymbol: string;
  assetType: 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'merger';
  quantity: number;
  price: number;
  totalAmount: number;
  fees?: number;
  currency: Currency;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

type Position = {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetType: 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
  quantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentMarketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  currency: Currency;
  openDate: Date;
  lastTransactionDate: Date;
  costBasisMethod: 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';
  lots: any[];
  createdAt: Date;
  updatedAt: Date;
};

// Mock data for testing
const mockQuoteData = {
  AAPL: {
    symbol: 'AAPL',
    shortName: 'Apple Inc.',
    longName: 'Apple Inc.',
    regularMarketPrice: 150,
    regularMarketChange: 2.5,
    regularMarketChangePercent: 1.69,
    regularMarketPreviousClose: 147.5,
    regularMarketOpen: 148.0,
    regularMarketDayLow: 147.8,
    regularMarketDayHigh: 151.2,
    regularMarketVolume: 45000000,
    averageDailyVolume3Month: 50000000,
    averageDailyVolume10Day: 48000000,
    marketCap: 2500000000000,
    price: 150,
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  GOOGL: {
    symbol: 'GOOGL',
    shortName: 'Alphabet Inc.',
    longName: 'Alphabet Inc. Class A',
    regularMarketPrice: 2800,
    regularMarketChange: 15.0,
    regularMarketChangePercent: 0.54,
    regularMarketPreviousClose: 2785.0,
    regularMarketOpen: 2790.0,
    regularMarketDayLow: 2785.0,
    regularMarketDayHigh: 2820.0,
    regularMarketVolume: 1200000,
    averageDailyVolume3Month: 1500000,
    averageDailyVolume10Day: 1300000,
    marketCap: 1800000000000,
    price: 2800,
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Internet Content & Information'
  },
  TSLA: {
    symbol: 'TSLA',
    shortName: 'Tesla, Inc.',
    longName: 'Tesla, Inc.',
    regularMarketPrice: 800,
    regularMarketChange: -10.0,
    regularMarketChangePercent: -1.23,
    regularMarketPreviousClose: 810.0,
    regularMarketOpen: 805.0,
    regularMarketDayLow: 795.0,
    regularMarketDayHigh: 815.0,
    regularMarketVolume: 25000000,
    averageDailyVolume3Month: 30000000,
    averageDailyVolume10Day: 28000000,
    marketCap: 800000000000,
    price: 800,
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers'
  }
};

const mockSearchResults = [
  {
    symbol: 'AAPL',
    shortname: 'Apple Inc.',
    longname: 'Apple Inc.',
    exchDisp: 'NASDAQ',
    type: 'stock',
    typeDisp: 'Equity'
  },
  {
    symbol: 'GOOGL',
    shortname: 'Alphabet Inc.',
    longname: 'Alphabet Inc. Class A',
    exchDisp: 'NASDAQ',
    type: 'stock',
    typeDisp: 'Equity'
  }
];

// Create MSW server for API mocking
const server = setupServer(
  http.get('*/v8/finance/spark', () => {
    return HttpResponse.json(mockQuoteData.AAPL);
  }),
  http.get('*/v8/finance/chart/:symbol', ({ params }) => {
    const symbol = params.symbol as string;
    return HttpResponse.json(mockQuoteData[symbol as keyof typeof mockQuoteData] || mockQuoteData.AAPL);
  }),
  http.get('*/v1/finance/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const filteredResults = mockSearchResults.filter(result =>
      result.symbol.toLowerCase().includes(query.toLowerCase()) ||
      result.shortname?.toLowerCase().includes(query.toLowerCase())
    );
    
    return HttpResponse.json({
      explains: [],
      count: filteredResults.length,
      quotes: filteredResults,
      news: [],
      nav: [],
      lists: [],
      researchReports: [],
      screenerFieldResults: [],
      totalTime: 23,
      timeTakenForQuotes: 500,
      timeTakenForNews: 0,
      timeTakenForAlgowatchlist: 0,
      timeTakenForPredefinedScreener: 0,
      timeTakenForCrunchbase: 0,
      timeTakenForNav: 0,
      timeTakenForResearchReports: 0
    });
  })
);

// Create a wrapper component with all necessary providers

// Mock network status
const mockNetworkStatus = {
  isOnline: true,
  isOffline: false,
  connectionType: 'wifi' as const
};

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: vi.fn(() => mockNetworkStatus)
}));

describe('Hook Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    setupContextMocks();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.isOffline = false;
  });

  afterEach(() => {
    localStorage.clear();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('useQuote + usePositions Integration', () => {
    it('should fetch quote data and integrate with positions', async () => {
      // Arrange
      const { result: quoteResult } = renderHookWithProviders(() => useQuote('AAPL'));
      const { result: positionsResult } = renderHookWithProviders(() => usePositions());

      // Wait for quote to load
      await waitFor(() => {
        expect(quoteResult.current.loading).toBe(false);
        expect(quoteResult.current.data).toBeDefined();
      });

      // Assert quote data
      expect(quoteResult.current.data?.symbol).toBe('AAPL');
      expect(quoteResult.current.error).toBeNull();

      // Act - Create position using quote data
      const quoteData = quoteResult.current.data!;
      const newPosition: Position = {
        id: 'integration-position-1',
        assetId: 'asset-aapl',
        assetSymbol: quoteData.symbol,
        assetType: 'stock',
        quantity: 10,
        averageCostBasis: quoteData.price,
        totalCostBasis: quoteData.price * 10,
        currentMarketValue: quoteData.price * 10,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        realizedPL: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        currency: 'USD',
        openDate: new Date(),
        lastTransactionDate: new Date(),
        costBasisMethod: 'FIFO',
        lots: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await act(async () => {
        await positionsResult.current.savePosition(newPosition);
      });

      // Assert - Position should be saved
      await waitFor(() => {
        expect(positionsResult.current.positions.find((p: Position) => p.id === 'integration-position-1')).toBeDefined();
      });
    });

    it('should handle portfolio calculations with live data', async () => {
      // Arrange - Multiple quotes
      const { result: quoteResult } = renderHookWithProviders(() => useQuote('AAPL'));
      const { result: positionsResult } = renderHookWithProviders(() => usePositions());

      // Wait for quote to load
      await waitFor(() => {
        expect(quoteResult.current.loading).toBe(false);
        expect(quoteResult.current.data).toBeDefined();
      });

      // Act - Create multiple positions
      const quoteData = quoteResult.current.data!;
      const positions: Position[] = [1, 2, 3].map(index => ({
        id: `portfolio-position-${index}`,
        assetId: `asset-${index}`,
        assetSymbol: quoteData.symbol,
        assetType: 'stock' as const,
        quantity: 5 * index,
        averageCostBasis: quoteData.price,
        totalCostBasis: quoteData.price * 5 * index,
        currentMarketValue: quoteData.price * 5 * index,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        realizedPL: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        currency: 'USD',
        openDate: new Date(),
        lastTransactionDate: new Date(),
        costBasisMethod: 'FIFO',
        lots: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      for (const position of positions) {
        await act(async () => {
          await positionsResult.current.savePosition(position);
        });
      }

      // Assert - Portfolio should be calculated correctly
      await waitFor(() => {
        const savedPositions = positionsResult.current.positions;
        expect(savedPositions.length).toBeGreaterThanOrEqual(3);

        // Calculate total value
        const totalValue = savedPositions
          .filter((p: Position) => p.id.startsWith('portfolio-position'))
          .reduce((sum: number, position: Position) => sum + position.totalCostBasis, 0);

        expect(totalValue).toBeGreaterThan(0);
      });
    });
  });

  describe('useQuote + useTransactions Integration', () => {
    it('should create transactions based on quote data', async () => {
      // Arrange
      const { result: quoteResult } = renderHookWithProviders(() => useQuote('AAPL'));
      const { result: transactionsResult } = renderHookWithProviders(() => useTransactions());

      // Wait for quote to load
      await waitFor(() => {
        expect(quoteResult.current.loading).toBe(false);
        expect(quoteResult.current.data).toBeDefined();
      });

      // Act - Create transaction using quote data
      const quoteData = quoteResult.current.data!;
      const newTransaction: Transaction = {
        id: 'integration-test-1',
        portfolioId: 'test-portfolio-1',
        assetId: 'asset-aapl',
        assetSymbol: quoteData.symbol,
        assetType: 'stock',
        type: 'buy',
        quantity: 10,
        price: quoteData.price,
        totalAmount: quoteData.price * 10,
        fees: 0,
        currency: 'USD',
        date: new Date(),
        notes: 'Integration test transaction',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await act(async () => {
        await transactionsResult.current.saveTransaction(newTransaction);
      });

      // Assert - Transaction should be saved
      await waitFor(() => {
        expect(transactionsResult.current.transactions.find((t: Transaction) => t.id === 'integration-test-1')).toBeDefined();
      });
    });
  });

  describe('Network Integration with Data Flow', () => {
    it('should handle offline-to-online data synchronization', async () => {
      // Arrange - Start offline
      mockNetworkStatus.isOnline = false;
      mockNetworkStatus.isOffline = true;

      const { result: quoteHook } = renderHookWithProviders(() => useQuote('AAPL'));
      const { result: transactionsResult } = renderHookWithProviders(() => useTransactions());

      // Wait for initial state
      await waitFor(() => {
        expect(quoteHook.current.loading).toBe(false);
      });

      // Assert - Should show offline behavior
      expect(quoteHook.current.error).toBeTruthy();

      // Act - Add some offline data
      const offlineTransaction: Transaction = {
        id: 'offline-transaction-1',
        portfolioId: 'test-portfolio-1',
        assetId: 'asset-aapl',
        assetSymbol: 'AAPL',
        assetType: 'stock',
        type: 'buy',
        quantity: 5,
        price: 150,
        totalAmount: 750,
        fees: 0,
        currency: 'USD',
        date: new Date(),
        notes: 'Offline transaction',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await act(async () => {
        await transactionsResult.current.saveTransaction(offlineTransaction);
      });

      // Assert - Offline data should be saved
      await waitFor(() => {
        expect(transactionsResult.current.transactions.find((t: Transaction) => t.id === 'offline-transaction-1')).toBeDefined();
      });

      // Act - Go back online
      mockNetworkStatus.isOnline = true;
      mockNetworkStatus.isOffline = false;

      // Re-render hooks to reflect network change
      const { result: onlineQuoteHook } = renderHookWithProviders(() => useQuote('AAPL'));

      // Wait for online data
      await waitFor(() => {
        expect(onlineQuoteHook.current.loading).toBe(false);
        expect(onlineQuoteHook.current.data).toBeDefined();
      });

      // Assert - Should now have live data
      expect(onlineQuoteHook.current.error).toBeNull();
      expect(onlineQuoteHook.current.data?.symbol).toBe('AAPL');

      // Verify offline data is still there
      expect(transactionsResult.current.transactions.find((t: Transaction) => t.id === 'offline-transaction-1')).toBeDefined();
    });

    it('should handle API rate limiting with retry mechanism', async () => {
      // Arrange - Mock rate limited responses then success
      let callCount = 0;
      server.use(
        http.get('*', () => {
          callCount++;
          if (callCount <= 2) {
            return new HttpResponse(null, { status: 429 });
          }
          return HttpResponse.json(mockQuoteData.AAPL);
        })
      );

      // Act - Hook should retry automatically
      const { result } = renderHookWithProviders(() => useQuote('AAPL'));

      // Wait for eventual success after retries
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeDefined();
      }, { timeout: 10000 });

      // Assert - Should eventually succeed
      expect(result.current.data?.symbol).toBe('AAPL');
      expect(result.current.error).toBeNull();
      expect(callCount).toBeGreaterThan(2); // Should have retried
    });
  });

  describe('Multi-Hook Data Consistency', () => {
    it('should maintain data consistency across multiple hook instances', async () => {
      // Arrange - Multiple instances of the same hooks
      const { result: quote1 } = renderHookWithProviders(() => useQuote('AAPL'));
      const { result: quote2 } = renderHookWithProviders(() => useQuote('AAPL'));
      const { result: transactions1 } = renderHookWithProviders(() => useTransactions());
      const { result: transactions2 } = renderHookWithProviders(() => useTransactions());

      // Wait for quotes to load
      await waitFor(() => {
        expect(quote1.current.loading).toBe(false);
        expect(quote2.current.loading).toBe(false);
        expect(quote1.current.data).toBeDefined();
        expect(quote2.current.data).toBeDefined();
      });

      // Assert - Both should have same data (cached)
      expect(quote1.current.data?.symbol).toBe(quote2.current.data?.symbol);
      expect(quote1.current.data?.price).toBe(quote2.current.data?.price);

      // Act - Add transaction through first hook
      const transaction: Transaction = {
        id: 'consistency-test-1',
        portfolioId: 'test-portfolio-1',
        assetId: 'asset-aapl',
        assetSymbol: 'AAPL',
        assetType: 'stock',
        type: 'buy',
        quantity: 10,
        price: quote1.current.data!.price,
        totalAmount: quote1.current.data!.price * 10,
        fees: 0,
        currency: 'USD',
        date: new Date(),
        notes: 'Consistency test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await act(async () => {
        await transactions1.current.saveTransaction(transaction);
      });

      // Assert - Both hooks should see the same data
      await waitFor(() => {
        const txns1 = transactions1.current.transactions;
        const txns2 = transactions2.current.transactions;
        
        expect(txns1.length).toBe(txns2.length);
        expect(txns1.find((t: Transaction) => t.id === 'consistency-test-1')).toBeDefined();
        expect(txns2.find((t: Transaction) => t.id === 'consistency-test-1')).toBeDefined();
      });
    });
  });

  describe('useSearch Integration', () => {
    it('should search for symbols and create positions', async () => {
      // Arrange
      const { result: searchResult } = renderHookWithProviders(() => useSearch('Apple'));
      const { result: positionsResult } = renderHookWithProviders(() => usePositions());

      // Wait for search results
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.data).toBeDefined();
        expect(searchResult.current.data.length).toBeGreaterThan(0);
      });

      // Assert search results
      expect(searchResult.current.data[0].symbol).toBe('AAPL');

      // Act - Create position from search result
      const searchData = searchResult.current.data[0];
      const newPosition: Position = {
        id: 'search-position-1',
        assetId: `asset-${searchData.symbol.toLowerCase()}`,
        assetSymbol: searchData.symbol,
        assetType: searchData.type as 'stock' | 'crypto' | 'etf',
        quantity: 100,
        averageCostBasis: 150,
        totalCostBasis: 15000,
        currentMarketValue: 15000,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        realizedPL: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        currency: 'USD',
        openDate: new Date(),
        lastTransactionDate: new Date(),
        costBasisMethod: 'FIFO',
        lots: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await act(async () => {
        await positionsResult.current.savePosition(newPosition);
      });

      // Assert - Position should be created
      await waitFor(() => {
        expect(positionsResult.current.positions.find((p: Position) => p.id === 'search-position-1')).toBeDefined();
      });
    });
  });
});
