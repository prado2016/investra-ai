/**
 * Simple Hook Integration Tests - Testing context provider fixes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { usePositions } from '../../hooks/useStorage';
import { NotificationProvider } from '../../contexts/NotificationProvider';

// Create a wrapper component with all necessary providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}

// Mock the Yahoo Finance service to avoid real API calls
vi.mock('../../services/yahooFinanceService', () => ({
  YahooFinanceService: vi.fn().mockImplementation(() => ({
    getQuote: vi.fn().mockResolvedValue({
      success: true,
      data: {
        symbol: 'AAPL',
        shortName: 'Apple Inc.',
        regularMarketPrice: 150,
        price: 150,
        currency: 'USD'
      }
    }),
    getHistoricalData: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    searchSymbols: vi.fn().mockResolvedValue({
      success: true,
      data: []
    })
  }))
}));

describe('Simple Hook Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Context Provider Integration', () => {
    it('should render usePositions hook with NotificationProvider', async () => {
      // This test verifies that the NotificationProvider context issue is fixed
      const { result } = renderHook(() => usePositions(), { wrapper: TestWrapper });

      // Should not throw "useNotifications must be used within a NotificationProvider" error
      expect(result.current).toBeDefined();
      expect(result.current.positions).toBeDefined();
      expect(Array.isArray(result.current.positions)).toBe(true);
      expect(typeof result.current.savePosition).toBe('function');
      expect(typeof result.current.deletePosition).toBe('function');
    });

    it('should handle storage operations without errors', async () => {
      const { result } = renderHook(() => usePositions(), { wrapper: TestWrapper });

      // Should be able to access positions without throwing errors
      expect(() => {
        const positions = result.current.positions;
        expect(positions).toBeDefined();
      }).not.toThrow();

      expect(result.current.loading).toBeDefined();
      expect(typeof result.current.loading).toBe('boolean');
    });
  });
});
