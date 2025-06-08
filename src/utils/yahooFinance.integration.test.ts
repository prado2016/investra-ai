import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuote, useQuotes, useSearch } from '../hooks/useYahooFinance';
import { yahooFinanceService } from '../services/yahooFinanceService';
import { render } from '../test/test-utils';
import { mockData } from '../test/mocks/data';

// Mock the yahoo finance service
vi.mock('../services/yahooFinanceService', () => ({
  yahooFinanceService: {
    getQuote: vi.fn(),
    getQuotes: vi.fn(),
    searchSymbols: vi.fn(),
    clearCache: vi.fn()
  }
}));

describe('Yahoo Finance Service + Hooks Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useQuote + YahooFinanceService Integration', () => {
    it('should fetch quote data through service and update hook state', async () => {
      // Mock successful API response
      const mockQuoteResponse = {
        success: true,
        data: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          change: 2.15,
          changePercent: 1.45,
          previousClose: 148.10,
          open: 149.50,
          dayHigh: 151.20,
          dayLow: 148.80,
          volume: 52487300,
          marketCap: 2456789000000,
          currency: 'USD',
          lastUpdated: new Date()
        },
        timestamp: new Date(),
        cached: false
      };
      vi.mocked(yahooFinanceService.getQuote).mockResolvedValue(mockQuoteResponse);

      const { result } = renderHook(() => useQuote('AAPL'), {
        wrapper: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children)
      });

      // Wait for the quote to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.symbol).toBe('AAPL');
      expect(result.current.data?.price).toBe(150.25);
      expect(result.current.error).toBeNull();
      expect(yahooFinanceService.getQuote).toHaveBeenCalledWith('AAPL', true);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch quote data'
        },
        timestamp: new Date()
      };

      vi.mocked(yahooFinanceService.getQuote).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useQuote('INVALID'), {
        wrapper: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children)
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('Failed to fetch quote data');
    });
  });

  describe('useQuotes + YahooFinanceService Integration', () => {
    it('should fetch multiple quotes correctly', async () => {
      const mockQuotesResponse = {
        success: true,
        data: [
          { symbol: 'AAPL', price: 150.25, name: 'Apple Inc.' },
          { symbol: 'GOOGL', price: 2750.80, name: 'Alphabet Inc.' }
        ],
        timestamp: new Date(),
        cached: false
      };

      vi.mocked(yahooFinanceService.getQuotes).mockResolvedValue(mockQuotesResponse);

      const { result } = renderHook(() => useQuotes(['AAPL', 'GOOGL']), {
        wrapper: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children)
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0].symbol).toBe('AAPL');
      expect(result.current.data[1].symbol).toBe('GOOGL');
    });
  });
});
