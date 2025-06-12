/**
 * Mock Supabase service for E2E testing
 * Provides mock data and simulates API responses when authentication is bypassed
 */

import type { Portfolio } from '../lib/database/types';
import type { TransactionWithAsset } from '../components/TransactionList';
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

  static async getTransactions(portfolioId?: string): Promise<MockServiceListResponse<TransactionWithAsset>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, we would filter by portfolioId
    // For mock purposes, we return all transactions
    console.log('Mock service fetching transactions for portfolio:', portfolioId || 'all');
    
    return {
      data: [...this.mockTransactions],
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

    const newTransaction: TransactionWithAsset = {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      asset: this.mockAssets[0] // Use first mock asset as default
    };

    this.mockTransactions.unshift(newTransaction);

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
      this.mockTransactions[transactionIndex] = {
        ...this.mockTransactions[transactionIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };

      return {
        data: this.mockTransactions[transactionIndex] as Transaction,
        error: null,
        success: true
      };
    }

    return {
      data: null as any,
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

    // Return a mock asset based on symbol
    const mockAsset: Asset = {
      id: `test-asset-${symbol.toLowerCase()}`,
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} Test Company`,
      asset_type: 'stock',
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

    // Use the database Portfolio type directly since that's what SupabaseService returns
    const mockPortfolio = getMockPortfolio();
    
    return {
      data: [mockPortfolio],
      error: null,
      success: true
    };
  }
}

// Export mock services that can be used when in test mode
export const MockServices = {
  TransactionService: MockTransactionService,
  AssetService: MockAssetService,
  PortfolioService: MockPortfolioService,
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
