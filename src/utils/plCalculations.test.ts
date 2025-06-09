import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRealizedPL,
  calculateUnrealizedPL,
  calculateDividendIncome,
  calculateTotalFees,
  calculateTradingVolume,
  calculateNetCashFlow,
  formatPLWithColor
} from '../utils/plCalculations';
import type { Transaction, Position } from '../types/portfolio';

describe('P&L Calculations', () => {
  let mockTransactions: Transaction[];
  let mockPositions: Position[];

  beforeEach(() => {
    // Mock transaction data for testing
    mockTransactions = [
      {
        id: '1',
        assetSymbol: 'AAPL',
        assetType: 'stock',
        type: 'buy',
        quantity: 100,
        price: 150,
        totalAmount: 15000,
        fees: 9.99,
        currency: 'USD',
        date: new Date('2024-01-15'),
        notes: 'Test buy'
      },
      {
        id: '2',
        assetSymbol: 'AAPL',
        assetType: 'stock',
        type: 'sell',
        quantity: 50,
        price: 160,
        totalAmount: 8000,
        fees: 9.99,
        currency: 'USD',
        date: new Date('2024-02-15'),
        notes: 'Test sell'
      }
    ];

    // Mock position data for testing
    mockPositions = [
      {
        id: '1',
        assetSymbol: 'AAPL',
        assetType: 'stock',
        quantity: 50,
        averageCostBasis: 150,
        totalCostBasis: 7500,
        currentMarketValue: 8000,
        unrealizedPL: 500,
        unrealizedPLPercent: 6.67,
        currency: 'USD',
        lastUpdated: new Date()
      },
      {
        id: '2',
        assetSymbol: 'GOOGL',
        assetType: 'stock',
        quantity: 10,
        averageCostBasis: 2800,
        totalCostBasis: 28000,
        currentMarketValue: 29000,
        unrealizedPL: 1000,
        unrealizedPLPercent: 3.57,
        currency: 'USD',
        lastUpdated: new Date()
      }
    ];
  });

  describe('calculateRealizedPL', () => {
    it('should calculate realized P&L correctly', () => {
      const result = calculateRealizedPL(mockTransactions);
      // Buy: 100 @ $150 + $9.99 fees = $15,009.99 cost basis
      // Sell: 50 @ $160 - $9.99 fees = $7,990.01 proceeds
      // Cost basis for 50 shares = $7,504.995 (half of total + half of fees)
      // Realized P&L = $7,990.01 - $7,504.995 = $485.015
      expect(result).toBeCloseTo(485.02, 1);
    });

    it('should handle no transactions', () => {
      expect(calculateRealizedPL([])).toBe(0);
    });

    it('should handle only buy transactions', () => {
      const buyOnly = mockTransactions.filter(t => t.type === 'buy');
      expect(calculateRealizedPL(buyOnly)).toBe(0);
    });
  });

  describe('calculateUnrealizedPL', () => {
    it('should calculate unrealized P&L correctly', () => {
      const result = calculateUnrealizedPL(mockPositions);
      expect(result).toBe(1500); // 500 + 1000
    });

    it('should handle empty positions', () => {
      expect(calculateUnrealizedPL([])).toBe(0);
    });

    it('should handle positions with no unrealized P&L', () => {
      const positionsNoUPL = mockPositions.map(p => ({ ...p, unrealizedPL: undefined }));
      expect(calculateUnrealizedPL(positionsNoUPL)).toBe(0);
    });
  });

  describe('calculateDividendIncome', () => {
    it('should calculate dividend income correctly', () => {
      const dividendTransactions = [
        ...mockTransactions,
        {
          id: '3',
          assetSymbol: 'AAPL',
          assetType: 'stock',
          type: 'dividend',
          quantity: 1,
          price: 25,
          totalAmount: 25,
          fees: 0,
          currency: 'USD',
          date: new Date('2024-03-15'),
          notes: 'Dividend payment'
        }
      ];
      expect(calculateDividendIncome(dividendTransactions)).toBe(25);
    });

    it('should return 0 for no dividend transactions', () => {
      expect(calculateDividendIncome(mockTransactions)).toBe(0);
    });
  });

  describe('calculateTotalFees', () => {
    it('should calculate total fees correctly', () => {
      const result = calculateTotalFees(mockTransactions);
      expect(result).toBe(19.98); // 9.99 + 9.99
    });

    it('should handle transactions without fees', () => {
      const noFeesTransactions = mockTransactions.map(t => ({ ...t, fees: 0 }));
      expect(calculateTotalFees(noFeesTransactions)).toBe(0);
    });
  });

  describe('calculateTradingVolume', () => {
    it('should calculate trading volume correctly', () => {
      const result = calculateTradingVolume(mockTransactions);
      expect(result).toBe(23000); // 15000 + 8000
    });

    it('should exclude dividend transactions', () => {
      const mixedTransactions = [
        ...mockTransactions,
        {
          id: '3',
          assetSymbol: 'AAPL',
          assetType: 'stock',
          type: 'dividend',
          quantity: 1,
          price: 100,
          totalAmount: 100,
          fees: 0,
          currency: 'USD',
          date: new Date('2024-03-15'),
          notes: 'Dividend'
        }
      ];
      expect(calculateTradingVolume(mixedTransactions)).toBe(23000);
    });
  });

  describe('calculateNetCashFlow', () => {
    it('should calculate net cash flow correctly', () => {
      const result = calculateNetCashFlow(mockTransactions);
      expect(result).toBe(-7000); // 8000 (cash in) - 15000 (cash out)
    });

    it('should handle only purchases', () => {
      const buyOnly = mockTransactions.filter(t => t.type === 'buy');
      expect(calculateNetCashFlow(buyOnly)).toBe(-15000);
    });
  });

  describe('formatPLWithColor', () => {
    it('should format positive P&L correctly', () => {
      const result = formatPLWithColor(1500.50);
      expect(result.value).toBe('$1,500.50');
      expect(result.isPositive).toBe(true);
      expect(result.isNegative).toBe(false);
    });

    it('should format negative P&L correctly', () => {
      const result = formatPLWithColor(-1500.50);
      expect(result.value).toBe('$1,500.50');
      expect(result.isPositive).toBe(false);
      expect(result.isNegative).toBe(true);
    });

    it('should format zero P&L correctly', () => {
      const result = formatPLWithColor(0);
      expect(result.value).toBe('$0.00');
      expect(result.isPositive).toBe(false);
      expect(result.isNegative).toBe(false);
    });
  });
});
