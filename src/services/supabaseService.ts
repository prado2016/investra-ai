/**
 * Supabase Service Layer for Stock Tracker App
 * Provides CRUD operations for all data models with Supabase integration
 * Implements error handling, data validation, and optimistic updates
 */

import { supabase } from '../lib/supabase'
import { enhancedSupabase } from '../lib/enhancedSupabase'
import { portfolioRateLimiter, transactionRateLimiter } from '../utils/rateLimiter'
import { emergencyStop } from '../utils/emergencyStop'
import { 
  shouldUseMockServices, 
  MockServices 
} from './mockSupabaseService'
import type { 
  Profile, 
  Portfolio, 
  Asset, 
  Position, 
  Transaction,
  TransactionType
} from '../lib/database/types'

// Service response types for consistent error handling
export interface ServiceResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface ServiceListResponse<T> {
  data: T[]
  error: string | null
  success: boolean
  count?: number
}

/**
 * Profile Service - User profile management
 */
export class ProfileService {
  /**
   * Get current user's profile
   */
  static async getCurrentProfile(): Promise<ServiceResponse<Profile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Update current user's profile
   */
  static async updateProfile(updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>): Promise<ServiceResponse<Profile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

/**
 * Portfolio Service - Portfolio management
 */
export class PortfolioService {
  /**
   * Get all portfolios for current user
   */
  static async getPortfolios(): Promise<ServiceListResponse<Portfolio>> {
    try {
      // Check emergency stop first
      if (emergencyStop.isBlocked()) {
        const status = emergencyStop.getStatus();
        return { 
          data: [], 
          error: `Emergency stop active: ${status.reason}`, 
          success: false 
        };
      }

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: [], error: 'User not authenticated', success: false }
      }

      // Apply rate limiting
      const rateLimitKey = `portfolios-${user.id}`;
      if (!portfolioRateLimiter.isAllowed(rateLimitKey)) {
        const waitTime = portfolioRateLimiter.getTimeUntilReset(rateLimitKey);
        return { 
          data: [], 
          error: `Rate limited - please wait ${Math.ceil(waitTime / 1000)}s before retrying`, 
          success: false 
        };
      }

      // Check if circuit breaker is open and fail fast
      const healthStatus = enhancedSupabase.getHealthStatus();
      if (healthStatus.circuitBreakerOpen) {
        console.warn('🚫 Circuit breaker is open, returning empty portfolios');
        console.warn('Health status:', healthStatus);
        return { data: [], error: 'Circuit breaker is open - try resetting', success: false };
      }

      // Use enhanced client with retry logic
      const result = await enhancedSupabase.queryWithRetry(
        (client) => client
          .from('portfolios')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        'getPortfolios'
      );

      const { data, error, count } = result;

      if (error) {
        return { data: [], error: error.message, success: false }
      }

      // Record successful call
      portfolioRateLimiter.recordCall(rateLimitKey);
      return { data: data || [], error: null, success: true, count: count || 0 }
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Create new portfolio
   */
  static async createPortfolio(
    name: string, 
    description: string = '', 
    currency: string = 'USD'
  ): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          name,
          description,
          currency,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

/**
 * Asset Service - Asset data management
 */
export class AssetService {
  /**
   * Get or create asset by symbol
   */
  static async getOrCreateAsset(symbol: string): Promise<ServiceResponse<Asset>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.AssetService.getOrCreateAsset(symbol);
    }

    try {
      // First try to get existing asset
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle()

      if (existingAsset) {
        return { data: existingAsset, error: null, success: true }
      }

      // Create new asset if it doesn't exist
      const { data, error } = await supabase
        .from('assets')
        .insert({
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          asset_type: 'stock'
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

/**
 * Position Service - Position management
 */
export class PositionService {
  /**
   * Get all positions for a portfolio
   */
  static async getPositions(portfolioId: string): Promise<ServiceListResponse<Position & { asset: Asset }>> {
    try {
      // Use enhanced client with retry logic
      const result = await enhancedSupabase.queryWithRetry(
        (client) => client
          .from('positions')
          .select(`
            *,
            asset:assets(*)
          `)
          .eq('portfolio_id', portfolioId)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        'getPositions'
      );

      const { data, error } = result;

      if (error) {
        return { data: [], error: error.message, success: false }
      }

      return { data: data || [], error: null, success: true }
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

/**
 * Transaction Service - Transaction management
 */
export class TransactionService {
  /**
   * Get all transactions for a portfolio
   */
  static async getTransactions(portfolioId: string): Promise<ServiceListResponse<Transaction & { asset: Asset }>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.TransactionService.getTransactions(portfolioId);
    }

    // Check emergency stop first
    if (emergencyStop.isBlocked()) {
      const status = emergencyStop.getStatus();
      return { 
        data: [], 
        error: `Emergency stop active: ${status.reason}`, 
        success: false 
      };
    }

    try {
      // Apply rate limiting
      const rateLimitKey = `transactions-${portfolioId}`;
      if (!transactionRateLimiter.isAllowed(rateLimitKey)) {
        const waitTime = transactionRateLimiter.getTimeUntilReset(rateLimitKey);
        return { 
          data: [], 
          error: `Rate limited - please wait ${Math.ceil(waitTime / 1000)}s before retrying`, 
          success: false 
        };
      }

      // Check if circuit breaker is open and fail fast
      const healthStatus = enhancedSupabase.getHealthStatus();
      if (healthStatus.circuitBreakerOpen) {
        console.warn('🚫 Circuit breaker is open, returning empty transactions');
        return { data: [], error: 'Circuit breaker is open - try resetting', success: false };
      }

      // Use enhanced client with retry logic
      const result = await enhancedSupabase.queryWithRetry(
        (client) => client
          .from('transactions')
          .select(`
            *,
            asset:assets(*)
          `)
          .eq('portfolio_id', portfolioId)
          .order('transaction_date', { ascending: false }),
        'getTransactions'
      );

      const { data, error } = result;

      if (error) {
        return { data: [], error: error.message, success: false }
      }

      return { data: data || [], error: null, success: true }
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Create transaction
   */
  static async createTransaction(
    portfolioId: string,
    assetId: string,
    transactionType: TransactionType,
    quantity: number,
    price: number,
    transactionDate: string
  ): Promise<ServiceResponse<Transaction>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.TransactionService.createTransaction(
        portfolioId, assetId, transactionType, quantity, price, transactionDate
      );
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          portfolio_id: portfolioId,
          asset_id: assetId,
          transaction_type: transactionType,
          quantity,
          price,
          total_amount: quantity * price,
          transaction_date: transactionDate
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(transactionId: string): Promise<ServiceResponse<boolean>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.TransactionService.deleteTransaction(transactionId);
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data: true, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Update transaction
   */
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
  ): Promise<ServiceResponse<Transaction>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.TransactionService.updateTransaction(transactionId, updates);
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Clear all user data (transactions, positions, portfolios)
   */
  static async clearAllUserData(): Promise<ServiceResponse<boolean>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.TransactionService.clearAllUserData();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // First get all portfolio IDs for the user
      const { data: userPortfolios, error: portfolioFetchError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)

      if (portfolioFetchError) {
        return { data: null, error: `Failed to fetch portfolios: ${portfolioFetchError.message}`, success: false }
      }

      const portfolioIds = userPortfolios?.map(p => p.id) || []

      if (portfolioIds.length === 0) {
        // No portfolios to delete, but this is still considered success
        return { data: true, error: null, success: true }
      }

      // Delete in order due to foreign key constraints
      // 1. Delete transactions first
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .in('portfolio_id', portfolioIds)

      if (transactionsError) {
        return { data: null, error: `Failed to delete transactions: ${transactionsError.message}`, success: false }
      }

      // 2. Delete positions
      const { error: positionsError } = await supabase
        .from('positions')
        .delete()
        .in('portfolio_id', portfolioIds)

      if (positionsError) {
        return { data: null, error: `Failed to delete positions: ${positionsError.message}`, success: false }
      }

      // 3. Delete portfolios
      const { error: portfoliosError } = await supabase
        .from('portfolios')
        .delete()
        .eq('user_id', user.id)

      if (portfoliosError) {
        return { data: null, error: `Failed to delete portfolios: ${portfoliosError.message}`, success: false }
      }

      return { data: true, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

/**
 * Utility Service - Helper functions for complex operations
 */
export class UtilityService {
  /**
   * Process a buy transaction
   */
  static async processBuyTransaction(
    portfolioId: string,
    symbol: string,
    quantity: number,
    price: number,
    transactionDate: string
  ): Promise<ServiceResponse<{ transaction: Transaction; asset: Asset }>> {
    try {
      // Get or create asset
      const assetResult = await AssetService.getOrCreateAsset(symbol)
      if (!assetResult.success || !assetResult.data) {
        return { data: null, error: assetResult.error || 'Failed to get asset', success: false }
      }

      // Create transaction
      const transactionResult = await TransactionService.createTransaction(
        portfolioId,
        assetResult.data.id,
        'buy',
        quantity,
        price,
        transactionDate
      )

      if (!transactionResult.success || !transactionResult.data) {
        return { data: null, error: transactionResult.error || 'Failed to create transaction', success: false }
      }

      return {
        data: {
          transaction: transactionResult.data,
          asset: assetResult.data
        },
        error: null,
        success: true
      }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

// Create a unified service interface
export class SupabaseService {
  static profile = ProfileService
  static portfolio = PortfolioService
  static asset = AssetService
  static position = PositionService
  static transaction = TransactionService
  static utility = UtilityService
}

export default SupabaseService
