/**
 * Mock Supabase service for E2E testing
 * Provides mock data and simulates API responses when authentication is bypassed
 */

import type { Portfolio } from '../lib/database/types';
import type { Transaction, Asset, TransactionType } from '../lib/database/types';
import { getMockPortfolio, getMockTransactions, isTestMode } from '../hooks/useTestConfig';

// Mock service responses
interface MockServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

interface MockServiceListResponse<T> {
  data: T[];
  error: string | null;
  success: boolean;
}

class MockTransactionService {
  private static mockTransactions = getMockTransactions();
  private static mockAssets = getMockTransactions().map(t => t.asset);

  static async getTransactions(portfolioId?: string): Promise<MockServiceListResponse<Transaction & { asset: Asset }>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Mock service fetching transactions for portfolio:', portfolioId || 'all');
    
    let transactions = getMockTransactions() as any;
    
    // Filter by portfolio if specified
    if (portfolioId && portfolioId !== 'all') {
      transactions = transactions.filter((transaction: any) => 
        transaction.portfolioId === portfolioId
      );
    }
    
    return {
      data: transactions,
      error: null,
      success: true
    };
  }

  static async createTransaction(
    _portfolioId: string,
    _assetId: string,
    transactionType: TransactionType,
    quantity: number,
    price: number,
    transactionDate: string
  ): Promise<MockServiceResponse<Transaction>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const newTransaction: Transaction & { asset: Asset } = {
      id: `test-txn-${Date.now()}`,
      portfolio_id: _portfolioId,
      position_id: null,
      asset_id: _assetId,
      transaction_type: transactionType,
      quantity,
      price,
      total_amount: quantity * price,
      fees: 9.99,
      transaction_date: transactionDate.split('T')[0],
      settlement_date: null,
      exchange_rate: 1,
      currency: 'USD',
      notes: 'Mock transaction created in test mode',
      external_id: null,
      broker_name: 'Test Broker',
      strategy_type: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      asset: (this.mockAssets[0] as any) || ({} as any) // Use first mock asset as default
    };

    (this.mockTransactions as any).unshift(newTransaction as any);

    return {
      data: newTransaction as Transaction,
      error: null,
      success: true
    };
  }

  static async updateTransaction(
    transactionId: string,
    updates: {
      transaction_type?: TransactionType;
      quantity?: number;
      price?: number;
      total_amount?: number;
      fees?: number;
      transaction_date?: string;
      notes?: string;
    }
  ): Promise<MockServiceResponse<Transaction>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const transactionIndex = this.mockTransactions.findIndex(t => t.id === transactionId);
    if (transactionIndex >= 0) {
      (this.mockTransactions as any)[transactionIndex] = {
        ...(this.mockTransactions as any)[transactionIndex],
        ...updates,
        updated_at: new Date().toISOString()
      } as any;

      return {
        data: this.mockTransactions[transactionIndex] as unknown as Transaction,
        error: null,
        success: true
      };
    }

    return {
      data: null,
      error: 'Transaction not found',
      success: false
    };
  }

  static async deleteTransaction(transactionId: string): Promise<MockServiceResponse<boolean>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const transactionIndex = this.mockTransactions.findIndex(t => t.id === transactionId);
    if (transactionIndex >= 0) {
      this.mockTransactions.splice(transactionIndex, 1);
    }

    return {
      data: true,
      error: null,
      success: true
    };
  }

  static async clearAllUserData(): Promise<MockServiceResponse<boolean>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Reset to initial mock data
    this.mockTransactions = getMockTransactions();

    return {
      data: true,
      error: null,
      success: true
    };
  }
}

class MockAssetService {
  static async getOrCreateAsset(symbol: string): Promise<MockServiceResponse<Asset>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Detect asset type using the categorization utility
    const { detectAssetType } = await import('../utils/assetCategorization');
    const detectedType = detectAssetType(symbol.toUpperCase()) || 'stock';

    // Return a mock asset based on symbol
    const mockAsset: Asset = {
      id: `test-asset-${symbol.toLowerCase()}`,
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} Test Company`,
      asset_type: detectedType,
      exchange: 'TEST',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Test Industry',
      market_cap: 1000000000,
      shares_outstanding: 1000000,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    return {
      data: mockAsset,
      error: null,
      success: true
    };
  }
}

class MockPortfolioService {
  static async getPortfolios(): Promise<MockServiceListResponse<Portfolio>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create multiple portfolios to match transaction portfolio IDs
    const mockPortfolios: Portfolio[] = [
      {
        id: 'test-portfolio-tfsa',
        name: 'TFSA',
        description: 'Tax-Free Savings Account',
        currency: 'USD',
        user_id: 'test-user-1',
        is_default: true,
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-portfolio-rsp',
        name: 'RSP',
        description: 'Registered Retirement Savings Plan',
        currency: 'CAD',
        user_id: 'test-user-1',
        is_default: false,
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-portfolio-margin',
        name: 'Margin',
        description: 'Margin Trading Account',
        currency: 'USD',
        user_id: 'test-user-1',
        is_default: false,
        is_active: true,
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    return {
      data: mockPortfolios,
      error: null,
      success: true
    };
  }
}

// Mock Fund Movement Service
const MockFundMovementService = {
  createFundMovement: async (
    portfolioId: string,
    type: 'conversion' | 'withdraw' | 'deposit' | 'transfer',
    amount: number,
    currency: string,
    status: 'pending' | 'completed' | 'failed' | 'cancelled',
    date: string,
    options: {
      fees?: number;
      notes?: string;
      originalAmount?: number;
      originalCurrency?: string;
      convertedAmount?: number;
      convertedCurrency?: string;
      exchangeRate?: number;
      exchangeFees?: number;
      account?: string;
      fromAccount?: string;
      toAccount?: string;
    } = {}
  ) => {
    console.log('🧪 Mock: Creating fund movement', { portfolioId, type, amount, currency, status, date, options });
    
    const mockFundMovement = {
      id: `fund_${Date.now()}`,
      portfolio_id: portfolioId,
      type,
      amount,
      currency,
      status,
      movement_date: date,
      fees: options.fees || 0,
      notes: options.notes || '',
      original_amount: options.originalAmount,
      original_currency: options.originalCurrency,
      converted_amount: options.convertedAmount,
      converted_currency: options.convertedCurrency,
      exchange_rate: options.exchangeRate,
      exchange_fees: options.exchangeFees,
      account: options.account,
      from_account: options.fromAccount,
      to_account: options.toAccount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return { data: mockFundMovement, error: null, success: true };
  },

  getFundMovements: async (portfolioId: string) => {
    console.log('🧪 Mock: Getting fund movements for portfolio', portfolioId);
    
    const mockFundMovements = [
      {
        id: 'fund_1',
        portfolio_id: portfolioId,
        type: 'conversion',
        amount: 9234.51,
        currency: 'USD',
        status: 'completed',
        movement_date: '2025-04-16',
        original_amount: 13000.00,
        original_currency: 'CAD',
        converted_amount: 9234.51,
        converted_currency: 'USD',
        exchange_rate: 0.710347,
        exchange_fees: 1,
        account: 'TFSA',
        created_at: '2025-04-16T10:00:00Z',
        updated_at: '2025-04-16T10:00:00Z'
      },
      {
        id: 'fund_2',
        portfolio_id: portfolioId,
        type: 'withdraw',
        amount: 1000.00,
        currency: 'CAD',
        status: 'completed',
        movement_date: '2025-01-28',
        from_account: 'TFSA',
        to_account: 'RBC Signature No Limit Banking - Chequing 511',
        created_at: '2025-01-28T14:00:00Z',
        updated_at: '2025-01-28T14:00:00Z'
      }
    ];
    
    return { data: mockFundMovements, error: null, success: true, total: mockFundMovements.length };
  },

  updateFundMovement: async (id: string, updates: {
    type?: 'conversion' | 'withdraw' | 'deposit' | 'transfer';
    amount?: number;
    currency?: string;
    status?: 'pending' | 'completed' | 'failed' | 'cancelled';
    movement_date?: string;
    fees?: number;
    notes?: string;
    original_amount?: number;
    original_currency?: string;
    converted_amount?: number;
    converted_currency?: string;
    exchange_rate?: number;
    exchange_fees?: number;
    account?: string;
    from_account?: string;
    to_account?: string;
  }): Promise<{ data: Record<string, unknown> | null; error: string | null; success: boolean }> => {
    console.log('🧪 Mock: Updating fund movement', id, updates);
    
    const mockUpdatedFundMovement = {
      id,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return { data: mockUpdatedFundMovement, error: null, success: true };
  },

  deleteFundMovement: async (id: string) => {
    console.log('🧪 Mock: Deleting fund movement', id);
    return { data: true, error: null, success: true };
  }
};

// Export mock services that can be used when in test mode
export const MockServices = {
  TransactionService: MockTransactionService,
  AssetService: MockAssetService,
  PortfolioService: MockPortfolioService,
  FundMovementService: MockFundMovementService,
};

// Helper function to determine if we should use mock services
export const shouldUseMockServices = () => {
  return isTestMode() || import.meta.env.VITE_MOCK_DATA_MODE === 'true';
};

// Factory function to get the appropriate service (real or mock)
export const getTransactionService = () => {
  if (shouldUseMockServices()) {
    console.log('🧪 Using mock TransactionService for testing');
    return MockServices.TransactionService;
  }
  
  // Return real service - this would be imported from the actual service
  return null; // Will be replaced by real service import when not in test mode
};

export const getAssetService = () => {
  if (shouldUseMockServices()) {
    console.log('🧪 Using mock AssetService for testing');
    return MockServices.AssetService;
  }
  
  return null; // Will be replaced by real service import when not in test mode
};

export const getPortfolioService = () => {
  if (shouldUseMockServices()) {
    console.log('🧪 Using mock PortfolioService for testing');
    return MockServices.PortfolioService;
  }
  
  return null; // Will be replaced by real service import when not in test mode
};
