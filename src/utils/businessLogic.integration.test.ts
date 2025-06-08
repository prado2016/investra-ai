import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePLForPeriod, calculatePositionPL } from '../utils/plCalculations';
import { storageService } from '../services/storageService';
import type { Transaction, Position } from '../types/portfolio';

describe('Business Logic Integration Tests', () => {
  beforeEach(() => {
    storageService.clearAllData();
  });

  describe('P&L Calculations + Data Storage Integration', () => {
    it('should calculate portfolio P&L with real transaction data', () => {
      const transactions: Transaction[] = [
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
          notes: 'Initial purchase'
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
          notes: 'Partial sale'
        }
      ];
      const positions: Position[] = [
        {
          id: '1',
          assetSymbol: 'AAPL',
          assetType: 'stock',
          quantity: 50,
          averageCostBasis: 150,
          totalCostBasis: 7500,
          currentMarketValue: 8250,
          unrealizedPL: 750,
          unrealizedPLPercent: 10,
          currency: 'USD',
          lastUpdated: new Date()
        }
      ];

      const result = calculatePLForPeriod(transactions, positions);

      expect(result.realizedPL).toBeCloseTo(485, 0); // Approx realized P&L
      expect(result.unrealizedPL).toBe(750);
      expect(result.totalPL).toBeCloseTo(1235, 0);
      expect(result.totalFees).toBe(19.98);
      expect(result.tradingVolume).toBe(23000);
    });

    it('should integrate position calculations with storage data', () => {
      const position: Position = {
        id: '1',
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
      };

      const transactions: Transaction[] = [
        {
          id: '1',
          assetSymbol: 'GOOGL',
          assetType: 'stock',
          type: 'buy',
          quantity: 10,
          price: 2800,
          totalAmount: 28000,
          fees: 15.00,
          currency: 'USD',
          date: new Date('2024-01-10'),
          notes: 'GOOGL purchase'
        }
      ];

      const currentPrice = 2900; // $2900 per share
      const result = calculatePositionPL(position, transactions, currentPrice);

      expect(result.symbol).toBe('GOOGL');
      expect(result.quantity).toBe(10);
      expect(result.currentPrice).toBe(2900);
      expect(result.unrealizedPL).toBe(1000); // (2900 - 2800) * 10
      expect(result.unrealizedPLPercent).toBeCloseTo(3.57, 1);
    });
  });
});
