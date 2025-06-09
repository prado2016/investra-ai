import { describe, it, expect } from 'vitest';
import {
  validateStock,
  validateTransaction,
  validatePosition
} from '../utils/validation';
import type { Stock, Transaction, Position } from '../types/assets';

describe('Validation Utilities', () => {
  describe('validateStock', () => {
    it('should validate a valid stock', () => {
      const validStock: Partial<Stock> = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.25,
        dividendYield: 2.5,
        peRatio: 25.3,
        beta: 1.2
      };
      
      const result = validateStock(validStock);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject stock without required fields', () => {
      const invalidStock: Partial<Stock> = {
        name: 'Apple Inc.'
      };
      
      const result = validateStock(invalidStock);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Stock symbol is required');
      expect(result.errors).toContain('Current price must be a positive number');
    });

    it('should warn about extreme values', () => {
      const extremeStock: Partial<Stock> = {
        symbol: 'TEST',
        name: 'Test Stock',
        currentPrice: 100,
        dividendYield: 75, // Extreme dividend yield
        beta: 10 // Extreme beta
      };
      
      const result = validateStock(extremeStock);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Dividend yield seems unusually high or negative');
      expect(result.warnings).toContain('Beta value seems extreme');
    });
  });

  describe('validateTransaction', () => {
    it('should validate a valid transaction', () => {
      const validTransaction: Partial<Transaction> = {
        assetSymbol: 'AAPL',
        type: 'buy',
        quantity: 100,
        price: 150.25,
        totalAmount: 15025,
        fees: 9.99,
        date: new Date('2024-01-15')
      };
      
      const result = validateTransaction(validTransaction);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject transaction without required fields', () => {
      const invalidTransaction: Partial<Transaction> = {
        type: 'buy'
      };
      
      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Asset symbol is required');
      expect(result.errors).toContain('Quantity must be a positive number');
      expect(result.errors).toContain('Price must be a positive number');
    });

    it('should warn about future dates', () => {
      const futureTransaction: Partial<Transaction> = {
        assetSymbol: 'AAPL',
        type: 'buy',
        quantity: 100,
        price: 150.25,
        date: new Date('2030-01-01')
      };
      
      const result = validateTransaction(futureTransaction);
      expect(result.warnings).toContain('Transaction date is in the future');
    });
  });

  describe('validatePosition', () => {
    it('should validate a valid position', () => {
      const validPosition: Partial<Position> = {
        assetSymbol: 'AAPL',
        quantity: 100,
        averageCostBasis: 150.25,
        totalCostBasis: 15025
      };
      
      const result = validatePosition(validPosition);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject position without required fields', () => {
      const invalidPosition: Partial<Position> = {};
      
      const result = validatePosition(invalidPosition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Asset symbol is required');
      expect(result.errors).toContain('Quantity is required');
    });
  });
});
