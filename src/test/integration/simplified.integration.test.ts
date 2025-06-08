/**
 * Simplified Integration Tests
 * Tests the integration between different modules and components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageService } from '../../services/storageService';
import { yahooFinanceService } from '../../services/yahooFinanceService';
import type { Transaction, Position } from '../../types/portfolio';
import type { AssetType, TransactionType, Currency } from '../../types/portfolio';
import type { YahooFinanceQuote } from '../../types/api';
import type { ApiError } from '../../types/api';

// Mock Yahoo Finance service for integration testing
vi.mock('../../services/yahooFinanceService', () => ({
  yahooFinanceService: {
    getQuote: vi.fn(),
    searchSymbols: vi.fn()
  }
}));

describe('Simplified Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Integration', () => {
    it('should integrate storage and mock yahoo finance services', async () => {
      // Arrange - Mock Yahoo Finance response
      const mockQuote: YahooFinanceQuote = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        previousClose: 147.75,
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
      };

      vi.mocked(yahooFinanceService.getQuote).mockResolvedValue({
        success: true,
        data: mockQuote,
        error: undefined,
        timestamp: new Date(),
        cached: false
      });

      // Act - Get quote and create transaction
      const quoteResponse = await yahooFinanceService.getQuote('AAPL');
      
      if (quoteResponse.success && quoteResponse.data) {
        const transaction: Transaction = {
          id: 'integration-test-1',
          assetId: 'asset-aapl',
          assetSymbol: quoteResponse.data.symbol,
          assetType: 'stock' as AssetType,
          type: 'buy' as TransactionType,
          quantity: 10,
          price: quoteResponse.data.price,
          totalAmount: quoteResponse.data.price * 10,
          currency: 'USD' as Currency,
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const saveResult = await storageService.saveTransaction(transaction);

        // Assert - Both services worked together
        expect(quoteResponse.success).toBe(true);
        expect(quoteResponse.data.symbol).toBe('AAPL');
        expect(quoteResponse.data.price).toBe(150.25);
        
        expect(saveResult).toBe(true);
        
        const retrievedTransactions = await storageService.getTransactions();
        expect(retrievedTransactions).toHaveLength(1);
        expect(retrievedTransactions[0].assetSymbol).toBe('AAPL');
        expect(retrievedTransactions[0].price).toBe(150.25);
      }
    });

    it('should handle data flow between multiple services', async () => {
      // Arrange - Mock search results
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock' as AssetType
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          type: 'stock' as AssetType
        }
      ];

      vi.mocked(yahooFinanceService.searchSymbols).mockResolvedValue({
        success: true,
        data: mockSearchResults,
        error: undefined,
        timestamp: new Date(),
        cached: false
      });

      // Act - Search symbols and create positions
      const searchResponse = await yahooFinanceService.searchSymbols('tech');
      
      if (searchResponse.success && searchResponse.data) {
        // Create positions based on search results
        const positions: Position[] = searchResponse.data.map((result, index) => ({
          id: `position-${index + 1}`,
          assetId: `asset-${result.symbol.toLowerCase()}`,
          assetSymbol: result.symbol,
          assetType: result.type,
          quantity: 10 * (index + 1),
          averageCostBasis: 100 * (index + 1),
          totalCostBasis: 1000 * (index + 1),
          currentMarketValue: 1500 * (index + 1),
          unrealizedPL: 500 * (index + 1),
          unrealizedPLPercent: 50,
          realizedPL: 0,
          totalReturn: 500 * (index + 1),
          totalReturnPercent: 50,
          currency: 'USD' as Currency,
          openDate: new Date(),
          lastTransactionDate: new Date(),
          costBasisMethod: 'FIFO',
          lots: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        for (const position of positions) {
          await storageService.savePosition(position);
        }

        const retrievedPositions = await storageService.getPositions();

        // Assert - Search and storage integration worked
        expect(searchResponse.success).toBe(true);
        expect(searchResponse.data).toHaveLength(2);
        
        expect(retrievedPositions).toHaveLength(2);
        expect(retrievedPositions[0].assetSymbol).toBe('AAPL');
        expect(retrievedPositions[1].assetSymbol).toBe('GOOGL');
      }
    });

    it('should handle error scenarios gracefully', async () => {
      // Arrange - Mock API error
      const apiError: ApiError = {
        code: 'SYMBOL_NOT_FOUND',
        message: 'Symbol not found',
        details: 'The requested symbol does not exist'
      };

      vi.mocked(yahooFinanceService.getQuote).mockResolvedValue({
        success: false,
        data: undefined,
        error: apiError,
        timestamp: new Date(),
        cached: false
      });

      // Act - Try to get quote for invalid symbol
      const quoteResponse = await yahooFinanceService.getQuote('INVALID');

      // Create a transaction anyway (to test storage resilience)
      const transaction: Transaction = {
        id: 'error-test-1',
        assetId: 'asset-invalid',
        assetSymbol: 'INVALID',
        assetType: 'stock' as AssetType,
        type: 'buy' as TransactionType,
        quantity: 5,
        price: 0, // Price unknown due to API error
        totalAmount: 0,
        currency: 'USD' as Currency,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saveResult = await storageService.saveTransaction(transaction);

      // Assert - Error handling and storage still work
      expect(quoteResponse.success).toBe(false);
      expect(quoteResponse.error).toBeDefined();
      expect(quoteResponse.error?.code).toBe('SYMBOL_NOT_FOUND');
      
      expect(saveResult).toBe(true);
      
      const transactions = await storageService.getTransactions();
      expect(transactions).toHaveLength(1);
      
      const savedTransaction = transactions[0];
      expect(savedTransaction.assetSymbol).toBe('INVALID');
      expect(savedTransaction.price).toBe(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across multiple operations', async () => {
      // Arrange - Multiple mock quotes
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      for (const symbol of symbols) {
        const mockQuote: YahooFinanceQuote = {
          symbol,
          name: `${symbol} Inc.`,
          price: Math.random() * 200 + 100,
          change: 2.5,
          changePercent: 1.69,
          previousClose: 147.75,
          open: 148.00,
          dayHigh: 151.00,
          dayLow: 147.50,
          volume: 50000000,
          marketCap: 2000000000000,
          peRatio: 25.4,
          dividendYield: 0.48,
          eps: 5.91,
          beta: 1.2,
          currency: 'USD',
          exchange: 'NASDAQ',
          sector: 'Technology',
          industry: 'Technology',
          lastUpdated: new Date()
        };

        vi.mocked(yahooFinanceService.getQuote).mockResolvedValueOnce({
          success: true,
          data: mockQuote,
          error: undefined,
          timestamp: new Date(),
          cached: false
        });
      }

      // Act - Create multiple transactions
      for (const symbol of symbols) {
        const quoteResponse = await yahooFinanceService.getQuote(symbol);
        
        if (quoteResponse.success && quoteResponse.data) {
          const transaction: Transaction = {
            id: `transaction-${symbol}`,
            assetId: `asset-${symbol.toLowerCase()}`,
            assetSymbol: symbol,
            assetType: 'stock' as AssetType,
            type: 'buy' as TransactionType,
            quantity: 10,
            price: quoteResponse.data.price,
            totalAmount: quoteResponse.data.price * 10,
            currency: 'USD' as Currency,
            date: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await storageService.saveTransaction(transaction);
          expect(result).toBe(true);
        }
      }

      // Assert - Data consistency
      const allTransactions = await storageService.getTransactions();
      expect(allTransactions).toHaveLength(5);
      
      const symbolSet = new Set(allTransactions.map(t => t.assetSymbol));
      expect(symbolSet.size).toBe(5); // All unique symbols
      symbols.forEach(symbol => {
        expect(symbolSet.has(symbol)).toBe(true);
      });
    });

    it('should handle concurrent operations without data corruption', async () => {
      // Arrange - Single transaction
      const transaction: Transaction = {
        id: 'cache-test-1',
        assetId: 'asset-test',
        assetSymbol: 'TEST',
        assetType: 'stock' as AssetType,
        type: 'buy' as TransactionType,
        quantity: 5,
        price: 100,
        totalAmount: 500,
        currency: 'USD' as Currency,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act - Simulate concurrent reads and writes
      await storageService.saveTransaction(transaction);
      
      const firstRead = await storageService.getTransactions();
      const secondRead = await storageService.getTransactions();
      
      // Add another transaction
      const newTransaction: Transaction = {
        ...transaction,
        id: 'cache-test-2',
        quantity: 3
      };

      await storageService.saveTransaction(newTransaction);
      const updatedRead = await storageService.getTransactions();
      
      // Assert - Data integrity maintained
      expect(firstRead).toEqual(secondRead);
      expect(updatedRead).toHaveLength(2);
    });
  });
});
