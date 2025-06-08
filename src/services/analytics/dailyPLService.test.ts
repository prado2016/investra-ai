  import { describe, test, expect, beforeEach } from 'vitest';
import { DailyPLAnalyticsService } from './dailyPLService';
import type { Asset } from '../../lib/database/types';

describe('DailyPLAnalyticsService', () => {
  let service: DailyPLAnalyticsService;

  beforeEach(() => {
    service = new DailyPLAnalyticsService();
  });

  const createMockAsset = (symbol: string): Asset => ({
    id: `asset-${symbol}`,
    symbol,
    name: symbol,
    asset_type: 'stock',
    exchange: 'NYSE',
    currency: 'USD',
    sector: null,
    industry: null,
    market_cap: null,
    shares_outstanding: null,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  const createMockTransaction = (
    id: string,
    assetId: string,
    symbol: string,
    type: 'buy' | 'sell' | 'dividend',
    quantity: number,
    price: number,
    date: string
  ) => ({
    id,
    portfolio_id: 'portfolio-1',
    position_id: null,
    asset_id: assetId,
    transaction_type: type,
    quantity,
    price,
    total_amount: quantity * price,
    fees: 0,
    transaction_date: date,
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: null,
    external_id: null,
    broker_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    asset: createMockAsset(symbol)
  });

  const createMockPosition = (
    id: string,
    assetId: string,
    quantity: number,
    avgCost: number
  ) => ({
    id,
    portfolio_id: 'portfolio-1',
    asset_id: assetId,
    quantity,
    average_cost_basis: avgCost,
    total_cost_basis: quantity * avgCost,
    realized_pl: 0,
    open_date: new Date().toISOString(),
    cost_basis_method: 'FIFO' as const,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    asset: createMockAsset('AAPL')
  });

  describe('calculateDayPL', () => {
    test('should calculate P/L for a day with buy transactions', async () => {
      const mockTransactions = [
        createMockTransaction('1', 'asset-1', 'AAPL', 'buy', 100, 150, '2024-01-15')
      ];
      
      const mockPositions = [
        createMockPosition('pos-1', 'asset-1', 100, 150)
      ];

      // Mock the service methods  
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });
      SupabaseService.position.getPositions.mockResolvedValue({
        success: true,
        data: mockPositions
      });

      const result = await service.getDayPLDetails(
        'portfolio-1',
        new Date('2024-01-15')
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.transactionCount).toBe(1);
      expect(result.data?.tradeVolume).toBe(15000); // 100 * 150
      expect(result.data?.hasTransactions).toBe(true);
    });

    test('should calculate P/L for a day with sell transactions', async () => {
      const mockTransactions = [
        createMockTransaction('1', 'asset-1', 'AAPL', 'sell', 50, 160, '2024-01-15')
      ];
      
      const mockPositions = [
        createMockPosition('pos-1', 'asset-1', 100, 150)
      ];

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });
      SupabaseService.position.getPositions.mockResolvedValue({
        success: true,
        data: mockPositions
      });

      const result = await service.getDayPLDetails(
        'portfolio-1',
        new Date('2024-01-15')
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.transactionCount).toBe(1);
      expect(result.data?.tradeVolume).toBe(8000); // 50 * 160
      expect(result.data?.realizedPL).toBeGreaterThan(0); // Should have realized gain
    });

    test('should handle days with no transactions', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: true,
        data: []
      });
      SupabaseService.position.getPositions.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.getDayPLDetails(
        'portfolio-1',
        new Date('2024-01-15')
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.hasTransactions).toBe(false);
      expect(result.data?.colorCategory).toBe('no-transactions');
      expect(result.data?.transactionCount).toBe(0);
    });
  });

  describe('getMonthlyPLData', () => {
    test('should calculate monthly P/L summary', async () => {
      const mockTransactions = [
        createMockTransaction('1', 'asset-1', 'AAPL', 'buy', 100, 150, '2024-01-15'),
        createMockTransaction('2', 'asset-1', 'AAPL', 'sell', 50, 160, '2024-01-20'),
        createMockTransaction('3', 'asset-1', 'AAPL', 'dividend', 0, 2, '2024-01-25')
      ];
      
      const mockPositions = [
        createMockPosition('pos-1', 'asset-1', 50, 150)
      ];

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });
      SupabaseService.position.getPositions.mockResolvedValue({
        success: true,
        data: mockPositions
      });

      const result = await service.getMonthlyPLData(
        'portfolio-1',
        2024,
        0 // January
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.year).toBe(2024);
      expect(result.data?.month).toBe(0);
      expect(result.data?.monthName).toBe('January');
      expect(result.data?.daysWithTransactions).toBe(3);
      expect(result.data?.totalTransactions).toBe(3);
      expect(result.data?.dailyData).toHaveLength(31); // January has 31 days
    });

    test('should handle Supabase errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await service.getMonthlyPLData(
        'portfolio-1',
        2024,
        0
      );

      expect(result.error).toBe('Database connection failed');
      expect(result.data).toBeNull();
    });
  });

  describe('getCurrentMonthPL', () => {
    test('should get current month P/L data', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: true,
        data: []
      });
      SupabaseService.position.getPositions.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.getCurrentMonthPL('portfolio-1');

      const currentDate = new Date();
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.year).toBe(currentDate.getFullYear());
      expect(result.data?.month).toBe(currentDate.getMonth());
    });
  });

  describe('getMultiMonthTrend', () => {
    test('should calculate multi-month trend data', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseService } = require('../services/supabaseService');
      SupabaseService.transaction.getTransactions.mockResolvedValue({
        success: true,
        data: []
      });
      SupabaseService.position.getPositions.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.getMultiMonthTrend(
        'portfolio-1',
        2024, 0, // January 2024
        2024, 2  // March 2024
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(3); // Jan, Feb, Mar
    });
  });

  describe('getServiceInfo', () => {
    test('should return service information', () => {
      const info = service.getServiceInfo();
      
      expect(info.version).toBe('2.0.0');
      expect(info.integration).toBe('Supabase');
      expect(info.supportedFeatures).toContain('Daily P/L calculation from Supabase data');
      expect(info.supportedFeatures).toContain('Monthly P/L aggregation');
    });
  });
});
