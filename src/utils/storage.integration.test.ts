import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePositions, useTransactions } from '../hooks/useStorage';
import { storageService } from '../services/storageService';
import { render } from '../test/test-utils';
import type { Position, Transaction } from '../types/portfolio';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Replace global localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Storage Service + Hooks Integration', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    storageService.clearAllData();
  });
  describe('usePositions + StorageService Integration', () => {
    const mockPosition: Position = {
      id: '1',
      assetSymbol: 'AAPL',
      assetType: 'stock',
      quantity: 100,
      averageCostBasis: 150.25,
      totalCostBasis: 15025,
      currentMarketValue: 16000,
      unrealizedPL: 975,
      unrealizedPLPercent: 6.49,
      currency: 'USD',
      lastUpdated: new Date('2024-01-15')
    };

    it('should load positions from storage service', async () => {
      // Pre-populate storage with a position
      storageService.savePosition(mockPosition);
      
      const { result } = renderHook(() => usePositions(), {
        wrapper: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
      });

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.positions).toHaveLength(1);
      expect(result.current.positions[0].assetSymbol).toBe('AAPL');
    });

    it('should save position through hook and update storage', async () => {
      const { result } = renderHook(() => usePositions(), {
        wrapper: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
      });

      await act(async () => {
        await result.current.savePosition(mockPosition);
      });

      // Verify position was saved to storage service
      const savedPositions = storageService.getPositions();
      expect(savedPositions).toHaveLength(1);
      expect(savedPositions[0].assetSymbol).toBe('AAPL');
      
      // Verify hook state was updated
      expect(result.current.positions).toHaveLength(1);
    });

    it('should delete position through hook and update storage', async () => {
      // Pre-populate with position
      storageService.savePosition(mockPosition);
      
      const { result } = renderHook(() => usePositions(), {
        wrapper: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
      });

      await act(async () => {
        await result.current.deletePosition('1');
      });

      // Verify position was deleted from storage
      const positions = storageService.getPositions();
      expect(positions).toHaveLength(0);
      
      // Verify hook state was updated
      expect(result.current.positions).toHaveLength(0);
    });
  });

  describe('useTransactions + StorageService Integration', () => {
    const mockTransaction: Transaction = {
      id: '1',
      assetSymbol: 'AAPL',
      assetType: 'stock',
      type: 'buy',
      quantity: 100,
      price: 150.25,
      totalAmount: 15025,
      fees: 9.99,
      currency: 'USD',
      date: new Date('2024-01-15'),
      notes: 'Test transaction'
    };

    it('should save and load transactions correctly', async () => {
      const { result } = renderHook(() => useTransactions(), {
        wrapper: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
      });

      await act(async () => {
        await result.current.saveTransaction(mockTransaction);
      });

      // Verify transaction was saved to storage
      const transactions = storageService.getTransactions();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].assetSymbol).toBe('AAPL');
      
      // Verify hook state
      expect(result.current.transactions).toHaveLength(1);
    });
  });
});
