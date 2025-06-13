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
        async (client) => await client
          .from('portfolios')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        'getPortfolios'
      );

      const { data, error, count } = result as { data: Portfolio[] | null; error: Error | null; count?: number };

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

      // Detect asset type using the categorization utility
      const { detectAssetType } = await import('../utils/assetCategorization');
      const detectedType = detectAssetType(symbol.toUpperCase()) || 'stock';

      if (existingAsset) {
        // Always check if existing asset has wrong type and update if needed
        if (existingAsset.asset_type !== detectedType) {
          console.log(`Updating asset ${symbol} from ${existingAsset.asset_type} to ${detectedType}`);
          const { data: updatedAsset, error: updateError } = await supabase
            .from('assets')
            .update({
              asset_type: detectedType,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingAsset.id)
            .select()
            .single()

          if (updateError) {
            console.warn(`Failed to update asset type for ${symbol}:`, updateError.message);
            // Return existing asset even if update failed
            return { data: existingAsset, error: null, success: true }
          }

          return { data: updatedAsset, error: null, success: true }
        }

        return { data: existingAsset, error: null, success: true }
      }

      // Create new asset if it doesn't exist
      let assetName = symbol.toUpperCase();
      
      // For options, try to use a more meaningful name based on the underlying
      if (detectedType === 'option') {
        const { parseOptionSymbol } = await import('../utils/assetCategorization');
        const parsed = parseOptionSymbol(symbol.toUpperCase());
        if (parsed) {
          const expiryStr = parsed.expiration.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          assetName = `${parsed.underlying} ${expiryStr} $${parsed.strike} ${parsed.type.toUpperCase()}`;
        }
      }

      const { data, error } = await supabase
        .from('assets')
        .insert({
          symbol: symbol.toUpperCase(),
          name: assetName,
          asset_type: detectedType,
          currency: 'USD' // Default currency
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
   * Update asset type for existing asset
   */
  static async updateAssetType(assetId: string, newAssetType: string): Promise<ServiceResponse<Asset>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      // Mock service doesn't need this feature for now
      return { data: null, error: 'Not implemented in mock service', success: false };
    }

    try {
      const { data, error } = await supabase
        .from('assets')
        .update({
          asset_type: newAssetType as any,
          last_updated: new Date().toISOString()
        })
        .eq('id', assetId)
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
   * Fix asset types for all existing assets based on symbol patterns
   */
  static async fixAssetTypes(): Promise<ServiceResponse<{ updated: number }>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return { data: { updated: 0 }, error: 'Not implemented in mock service', success: false };
    }

    try {
      // Get all assets
      const { data: assets, error: fetchError } = await supabase
        .from('assets')
        .select('*')

      if (fetchError) {
        return { data: null, error: fetchError.message, success: false }
      }

      if (!assets || assets.length === 0) {
        return { data: { updated: 0 }, error: null, success: true }
      }

      // Import asset detection utility
      const { detectAssetType } = await import('../utils/assetCategorization');
      
      let updatedCount = 0;
      
      // Process each asset
      for (const asset of assets) {
        const detectedType = detectAssetType(asset.symbol);
        
        // Update if detected type is different from current type
        if (detectedType && detectedType !== asset.asset_type) {
          const { error: updateError } = await supabase
            .from('assets')
            .update({
              asset_type: detectedType,
              last_updated: new Date().toISOString()
            })
            .eq('id', asset.id)

          if (!updateError) {
            updatedCount++;
            console.log(`Updated asset ${asset.symbol} from ${asset.asset_type} to ${detectedType}`);
          }
        }
      }

      return { data: { updated: updatedCount }, error: null, success: true }
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
        async (client) => await client
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

      const { data, error } = result as { data: (Position & { asset: Asset })[] | null; error: Error | null };

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
   * Get or create position for an asset in a portfolio
   */
  static async getOrCreatePosition(
    portfolioId: string,
    assetId: string
  ): Promise<ServiceResponse<Position & { asset: Asset }>> {
    try {
      // First try to get existing position
      const { data: existingPosition, error: fetchError } = await supabase
        .from('positions')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('asset_id', assetId)
        .eq('is_active', true)
        .single();

      if (existingPosition && !fetchError) {
        return { data: existingPosition, error: null, success: true };
      }

      // Create new position if it doesn't exist
      const { data: newPosition, error: createError } = await supabase
        .from('positions')
        .insert({
          portfolio_id: portfolioId,
          asset_id: assetId,
          quantity: 0,
          average_cost_basis: 0,
          total_cost_basis: 0,
          realized_pl: 0,
          open_date: new Date().toISOString().split('T')[0],
          cost_basis_method: 'FIFO',
          is_active: true
        })
        .select(`
          *,
          asset:assets(*)
        `)
        .single();

      if (createError) {
        return { data: null, error: createError.message, success: false };
      }

      return { data: newPosition, error: null, success: true };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      };
    }
  }

  /**
   * Update position based on transaction
   */
  static async updatePositionFromTransaction(
    portfolioId: string,
    assetId: string,
    transactionType: TransactionType,
    quantity: number,
    price: number,
    fees: number = 0
  ): Promise<ServiceResponse<Position & { asset: Asset }>> {
    try {
      // Get or create the position
      const positionResult = await this.getOrCreatePosition(portfolioId, assetId);
      
      if (!positionResult.success || !positionResult.data) {
        return { data: null, error: positionResult.error || 'Failed to get position', success: false };
      }

      const position = positionResult.data;
      const totalAmount = quantity * price + fees;

      let newQuantity = position.quantity;
      let newAverageCostBasis = position.average_cost_basis;
      let newTotalCostBasis = position.total_cost_basis;
      let newRealizedPL = position.realized_pl;

      if (transactionType === 'buy') {
        // Calculate weighted average cost basis for buy transactions
        const currentValue = newQuantity * newAverageCostBasis;
        const newValue = currentValue + totalAmount;
        newQuantity += quantity;
        
        if (newQuantity > 0) {
          newAverageCostBasis = newValue / newQuantity;
          newTotalCostBasis = newValue;
        }
      } else if (transactionType === 'sell') {
        // For sell transactions, calculate realized P&L
        if (newQuantity >= quantity) {
          const costOfSoldShares = quantity * newAverageCostBasis;
          const saleProceeds = quantity * price - fees;
          newRealizedPL += saleProceeds - costOfSoldShares;
          
          newQuantity -= quantity;
          newTotalCostBasis -= costOfSoldShares;
          
          // Average cost basis remains the same for partial sells
        } else {
          return { data: null, error: 'Cannot sell more shares than owned', success: false };
        }
      }

      // Update the position
      const { data: updatedPosition, error: updateError } = await supabase
        .from('positions')
        .update({
          quantity: newQuantity,
          average_cost_basis: newAverageCostBasis,
          total_cost_basis: newTotalCostBasis,
          realized_pl: newRealizedPL,
          is_active: newQuantity > 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', position.id)
        .select(`
          *,
          asset:assets(*)
        `)
        .single();

      if (updateError) {
        return { data: null, error: updateError.message, success: false };
      }

      return { data: updatedPosition, error: null, success: true };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      };
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
        async (client) => await client
          .from('transactions')
          .select(`
            *,
            asset:assets(*)
          `)
          .eq('portfolio_id', portfolioId)
          .order('transaction_date', { ascending: false }),
        'getTransactions'
      );

      const { data, error } = result as { data: (Transaction & { asset: Asset })[] | null; error: Error | null };

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

      // Update position after successful transaction creation
      const positionUpdateResult = await PositionService.updatePositionFromTransaction(
        portfolioId,
        assetId,
        transactionType,
        quantity,
        price,
        0 // fees - not provided in this method signature
      );

      if (!positionUpdateResult.success) {
        console.warn('Position update failed after transaction creation:', positionUpdateResult.error);
        // Don't fail the transaction creation if position update fails
        // The position can be updated later via reconciliation
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
