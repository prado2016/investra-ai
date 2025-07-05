/**
 * Supabase Service Layer for Stock Tracker App
 * Provides CRUD operations for all data models with Supabase integration
 * Implements error handling, data validation, and optimistic updates
 */

import { supabase } from '../lib/supabase'
import { format, subDays, startOfDay } from 'date-fns';
import { enhancedSupabase } from '../lib/enhancedSupabase'
import { portfolioRateLimiter, transactionRateLimiter } from '../utils/rateLimiter'
import { emergencyStop } from '../utils/emergencyStop'
import { calculateTransactionFees } from '../utils/feeCalculations'
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
  TransactionType,
  OptionStrategyType,
  Database
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
  total?: number
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

  /**
   * Update portfolio details
   */
  static async updatePortfolio(
    portfolioId: string,
    updates: {
      name?: string
      description?: string
      currency?: string
      is_default?: boolean
    }
  ): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // If setting as default, first unset all other defaults
      if (updates.is_default === true) {
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', user.id)
      }

      const { data, error } = await supabase
        .from('portfolios')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId)
        .eq('user_id', user.id) // Ensure user owns this portfolio
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
   * Set portfolio as default
   */
  static async setDefaultPortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // First unset all defaults
      await supabase
        .from('portfolios')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Set the specified portfolio as default
      const { data, error } = await supabase
        .from('portfolios')
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId)
        .eq('user_id', user.id)
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
   * Archive/deactivate portfolio (soft delete)
   */
  static async archivePortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('portfolios')
        .update({ 
          is_active: false,
          is_default: false, // Can't be default if archived
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId)
        .eq('user_id', user.id)
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
   * Restore archived portfolio
   */
  static async restorePortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('portfolios')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId)
        .eq('user_id', user.id)
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
   * Get portfolio by ID
   */
  static async getPortfolioById(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .eq('user_id', user.id) // Ensure user owns this portfolio
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
   * Get all portfolios including archived ones
   */
  static async getAllPortfolios(): Promise<ServiceListResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: [], error: 'User not authenticated', success: false }
      }

      const { data, error, count } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        return { data: [], error: error.message, success: false }
      }

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
   * Duplicate portfolio (copy settings and structure, not transactions)
   */
  static async duplicatePortfolio(
    portfolioId: string, 
    newName: string,
    newDescription?: string
  ): Promise<ServiceResponse<Portfolio>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // Get the original portfolio
      const originalResult = await this.getPortfolioById(portfolioId)
      if (!originalResult.success || !originalResult.data) {
        return { data: null, error: 'Original portfolio not found', success: false }
      }

      const original = originalResult.data
      
      // Create new portfolio with same settings
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          name: newName,
          description: newDescription || `Copy of ${original.description}`,
          currency: original.currency,
          is_active: true,
          is_default: false // Copies are never default
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
          const { data: updatedAssets, error: updateError } = await supabase
            .from('assets')
            .update({
              asset_type: detectedType,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingAsset.id)
            .select()

          if (updateError) {
            console.warn(`Failed to update asset type for ${symbol}:`, updateError.message);
            // Return existing asset even if update failed
            return { data: existingAsset, error: null, success: true }
          }

          // Get the first updated asset (should only be one)
          const updatedAsset = updatedAssets?.[0]

          if (!updatedAsset) {
            console.warn(`No asset returned after update for ${symbol}, using existing asset`);
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
          asset_type: newAssetType as Database['public']['Tables']['assets']['Row']['asset_type'],
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
      // First try to get existing position (active or inactive)
      const { data: existingPositions, error: fetchError } = await supabase
        .from('positions')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('asset_id', assetId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.warn('Error fetching existing position:', fetchError.message);
      }

      // If we have an existing position (active or inactive), return it
      if (existingPositions && existingPositions.length > 0) {
        const existingPosition = existingPositions[0];
        
        // If position exists but is inactive, reactivate it
        if (!existingPosition.is_active) {
          const { data: reactivatedPosition, error: reactivateError } = await supabase
            .from('positions')
            .update({
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id)
            .select(`
              *,
              asset:assets(*)
            `)
            .single();

          if (reactivateError) {
            console.warn('Failed to reactivate position:', reactivateError.message);
            return { data: existingPosition, error: null, success: true };
          }

          return { data: reactivatedPosition, error: null, success: true };
        }

        return { data: existingPosition, error: null, success: true };
      }

      // Create new position if it doesn't exist
      // Use upsert to handle race conditions
      const { data: newPosition, error: createError } = await supabase
        .from('positions')
        .upsert({
          portfolio_id: portfolioId,
          asset_id: assetId,
          quantity: 0,
          average_cost_basis: 0,
          total_cost_basis: 0,
          realized_pl: 0,
          open_date: new Date().toISOString().split('T')[0],
          cost_basis_method: 'FIFO',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'portfolio_id,asset_id',
          ignoreDuplicates: false
        })
        .select(`
          *,
          asset:assets(*)
        `)
        .single();

      if (createError) {
        // If upsert failed, try to fetch the existing position again
        // This handles the race condition where another process created it
        const { data: fallbackPositions, error: fallbackError } = await supabase
          .from('positions')
          .select(`
            *,
            asset:assets(*)
          `)
          .eq('portfolio_id', portfolioId)
          .eq('asset_id', assetId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (fallbackError || !fallbackPositions || fallbackPositions.length === 0) {
          return { data: null, error: createError.message, success: false };
        }

        return { data: fallbackPositions[0], error: null, success: true };
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

      // Get asset information to check if this is an option
      const isOption = position.asset?.asset_type === 'option';

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
        if (isOption || newQuantity >= quantity) {
          // For options, allow negative positions (selling to open)
          // For stocks, only allow selling what you own
          const costOfSoldShares = quantity * newAverageCostBasis;
          const saleProceeds = quantity * price - fees;
          newRealizedPL += saleProceeds - costOfSoldShares;
          
          newQuantity -= quantity;
          newTotalCostBasis -= costOfSoldShares;
          
          // Average cost basis remains the same for partial sells
        } else {
          return { data: null, error: 'Cannot sell more shares than owned', success: false };
        }
      } else if (transactionType === 'option_expired') {
        // For option expiration, the entire premium paid is lost
        if (newQuantity >= quantity) {
          const costOfExpiredOptions = quantity * newAverageCostBasis;
          // Realized loss equals the cost basis (since option expires worthless)
          newRealizedPL -= costOfExpiredOptions;
          
          newQuantity -= quantity;
          newTotalCostBasis -= costOfExpiredOptions;
          
          // Average cost basis remains the same for partial expirations
        } else {
          return { data: null, error: 'Cannot expire more options than owned', success: false };
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

  /**
   * Auto-expire options based on current date and expiration dates
   */
  static async autoExpireOptions(portfolioId: string): Promise<ServiceResponse<{ expired: number }>> {
    try {
      console.log('⏰ Checking for expired options in portfolio:', portfolioId);
      
      // Get all active positions for options
      const { data: positions } = await supabase
        .from('positions')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true);
      
      if (!positions || positions.length === 0) {
        return { data: { expired: 0 }, error: null, success: true };
      }
      
      let expiredCount = 0;
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
      
      for (const position of positions) {
        if (!position.asset || position.asset.asset_type !== 'option') {
          continue;
        }
        
        // Parse option symbol to get expiration date
        const { parseOptionSymbol } = await import('../utils/assetCategorization');
        const optionInfo = parseOptionSymbol(position.asset.symbol);
        
        if (!optionInfo) {
          console.log(`⚠️ Could not parse option symbol: ${position.asset.symbol}`);
          continue;
        }
        
        // Check if option has expired
        const expirationDate = new Date(optionInfo.expiration);
        expirationDate.setHours(0, 0, 0, 0);
        
        if (expirationDate < currentDate) {
          console.log(`⏰ Auto-expiring option ${position.asset.symbol} (expired: ${expirationDate.toDateString()})`);
          
          // Create expiration transaction
          const expirationTransaction = {
            portfolio_id: portfolioId,
            asset_id: position.asset_id,
            transaction_type: 'option_expired' as const,
            quantity: Math.abs(position.quantity), // Always positive quantity for expiration
            price: 0, // Expired options have no value
            total_amount: 0,
            fees: 0,
            transaction_date: expirationDate.toISOString(),
            settlement_date: expirationDate.toISOString(),
            exchange_rate: 1,
            currency: 'USD',
            notes: `Auto-generated expiration for ${position.asset.symbol}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Insert expiration transaction
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(expirationTransaction);
            
          if (insertError) {
            console.error(`❌ Failed to create expiration transaction for ${position.asset.symbol}:`, insertError);
            continue;
          }
          
          expiredCount++;
        }
      }
      
      console.log(`✅ Auto-expired ${expiredCount} options`);
      return { data: { expired: expiredCount }, error: null, success: true };
      
    } catch (error) {
      console.error('❌ Error auto-expiring options:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Recalculate all positions for a portfolio from transactions
   * This will rebuild positions from scratch based on all transactions
   */
  static async recalculatePositions(portfolioId: string): Promise<ServiceResponse<{ updated: number; created: number; deleted: number }>> {
    try {
      console.log('🔄 Recalculating positions for portfolio:', portfolioId);
      
      // First, auto-expire any expired options
      const expireResult = await this.autoExpireOptions(portfolioId);
      if (expireResult.success && expireResult.data?.expired && expireResult.data.expired > 0) {
        console.log(`⏰ Auto-expired ${expireResult.data.expired} options before recalculation`);
      }
      
      // Get all transactions for the portfolio
      const transactionsResult = await TransactionService.getTransactions(portfolioId);
      if (!transactionsResult.success || !transactionsResult.data) {
        return { data: null, error: 'Failed to fetch transactions', success: false };
      }
      
      const transactions = transactionsResult.data;
      console.log('📊 Found transactions:', transactions.length);
      
      // If no transactions, delete all positions for this portfolio
      if (transactions.length === 0) {
        console.log('🧹 No transactions found, cleaning up all positions...');
        const { error: deleteError } = await supabase
          .from('positions')
          .delete()
          .eq('portfolio_id', portfolioId);
          
        if (deleteError) {
          console.error('❌ Error deleting positions:', deleteError);
          return { data: null, error: deleteError.message, success: false };
        }
        
        console.log('✅ All positions deleted successfully');
        return { data: { updated: 0, created: 0, deleted: 1 }, error: null, success: true };
      }
      
      // Group transactions by asset
      const transactionsByAsset = new Map<string, typeof transactions>();
      for (const transaction of transactions) {
        const assetId = transaction.asset_id;
        if (!transactionsByAsset.has(assetId)) {
          transactionsByAsset.set(assetId, []);
        }
        transactionsByAsset.get(assetId)!.push(transaction);
      }
      
      console.log('🎯 Assets with transactions:', transactionsByAsset.size);
      
      // Get all existing positions for this portfolio to know which ones to delete
      const { data: existingPositions } = await supabase
        .from('positions')
        .select('id, asset_id')
        .eq('portfolio_id', portfolioId);
      
      const existingAssetIds = new Set(existingPositions?.map(p => p.asset_id) || []);
      const assetsWithTransactions = new Set(transactionsByAsset.keys());
      
      // Delete positions for assets that no longer have transactions
      const assetsToDelete = Array.from(existingAssetIds).filter(assetId => !assetsWithTransactions.has(assetId));
      let deletedCount = 0;
      
      if (assetsToDelete.length > 0) {
        console.log('🧹 Deleting positions for assets without transactions:', assetsToDelete);
        const { error: deleteError } = await supabase
          .from('positions')
          .delete()
          .eq('portfolio_id', portfolioId)
          .in('asset_id', assetsToDelete);
          
        if (!deleteError) {
          deletedCount = assetsToDelete.length;
        }
      }
      
      let createdCount = 0;
      let updatedCount = 0;
      
      // Process each asset
      for (const [assetId, assetTransactions] of transactionsByAsset) {
        // Sort transactions by date
        assetTransactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
        
        // Calculate final position values
        let quantity = 0;
        let totalCostBasis = 0;
        let realizedPL = 0;
        let weightedAverageCost = 0;
        
        // Determine if this is an options asset by checking transaction data
        const isOptionAsset = assetTransactions.some(tx => 
          tx.asset?.asset_type === 'option' || 
          assetTransactions[0]?.asset?.symbol?.includes('C') || 
          assetTransactions[0]?.asset?.symbol?.includes('P')
        );
        
        for (const transaction of assetTransactions) {
          const transactionQuantity = transaction.quantity;
          const transactionPrice = transaction.price;
          const fees = transaction.fees || 0;
          
          if (transaction.transaction_type === 'buy') {
            if (isOptionAsset) {
              // BUYING options (calls or puts) - we pay premium
              const premiumPaid = transactionQuantity * transactionPrice + fees;
              const currentValue = quantity * weightedAverageCost;
              const newValue = currentValue + premiumPaid;
              quantity += transactionQuantity;
              
              if (quantity > 0) {
                weightedAverageCost = newValue / quantity;
                totalCostBasis = newValue;
              }
              console.log(`📈 BOUGHT ${transactionQuantity} options at $${transactionPrice} each (premium paid: $${premiumPaid})`);
            } else {
              // Regular stock purchase
              const totalAmount = transactionQuantity * transactionPrice + fees;
              const currentValue = quantity * weightedAverageCost;
              const newValue = currentValue + totalAmount;
              quantity += transactionQuantity;
              
              if (quantity > 0) {
                weightedAverageCost = newValue / quantity;
                totalCostBasis = newValue;
              }
            }
          } else if (transaction.transaction_type === 'sell') {
            if (isOptionAsset) {
              // SELLING options (covered calls, cash-secured puts) - we receive premium
              const premiumReceived = transactionQuantity * transactionPrice - fees;
              
              if (quantity > 0) {
                // Closing a long option position (selling options we previously bought)
                if (quantity >= transactionQuantity) {
                  const costOfClosedOptions = transactionQuantity * weightedAverageCost;
                  realizedPL += premiumReceived - costOfClosedOptions;
                  
                  quantity -= transactionQuantity;
                  totalCostBasis -= costOfClosedOptions;
                  console.log(`📉 CLOSED ${transactionQuantity} long options (P&L: $${premiumReceived - costOfClosedOptions})`);
                } else {
                  // Handle partial closing
                  const costOfClosedOptions = quantity * weightedAverageCost;
                  realizedPL += premiumReceived - costOfClosedOptions;
                  quantity = 0;
                  totalCostBasis = 0;
                }
              } else {
                // Opening a short option position (covered call, cash-secured put)
                // For short options, we use negative quantity to represent short positions
                quantity -= transactionQuantity; // This will be negative
                realizedPL += premiumReceived; // Premium collected immediately
                console.log(`📉 SOLD ${transactionQuantity} options (covered call/CSP) - premium received: $${premiumReceived}`);
              }
            } else {
              // Regular stock sale
              if (quantity >= transactionQuantity) {
                const costOfSoldShares = transactionQuantity * weightedAverageCost;
                const saleProceeds = transactionQuantity * transactionPrice - fees;
                realizedPL += saleProceeds - costOfSoldShares;
                
                quantity -= transactionQuantity;
                totalCostBasis -= costOfSoldShares;
              } else {
                console.warn(`⚠️ Sell quantity (${transactionQuantity}) exceeds available quantity (${quantity}) for asset ${assetId}`);
                if (quantity > 0) {
                  const costOfSoldShares = quantity * weightedAverageCost;
                  const saleProceeds = transactionQuantity * transactionPrice - fees;
                  realizedPL += saleProceeds - costOfSoldShares;
                  quantity = 0;
                  totalCostBasis = 0;
                }
              }
            }
          } else if (transaction.transaction_type === 'option_expired') {
            if (isOptionAsset) {
              if (quantity > 0) {
                // Long options expired worthless - lose premium paid
                const lostPremium = Math.min(quantity, transactionQuantity) * weightedAverageCost;
                realizedPL -= lostPremium;
                quantity -= Math.min(quantity, transactionQuantity);
                totalCostBasis -= lostPremium;
                console.log(`⏰ ${Math.min(quantity, transactionQuantity)} LONG options expired worthless - lost $${lostPremium}`);
              } else if (quantity < 0) {
                // Short options expired worthless - keep premium received (already in realizedPL)
                quantity += Math.min(Math.abs(quantity), transactionQuantity);
                console.log(`⏰ ${Math.min(Math.abs(quantity), transactionQuantity)} SHORT options expired worthless - kept premium`);
              }
            }
          } else if (transaction.transaction_type === 'dividend') {
            // Dividends don't affect position quantity or cost basis, only realized P&L
            realizedPL += transactionQuantity * transactionPrice - fees;
          }
        }
        
        // For options, we need to handle negative quantities (short positions)
        // For stocks, ensure no negative values due to rounding errors
        if (!isOptionAsset) {
          quantity = Math.max(0, quantity);
          totalCostBasis = Math.max(0, totalCostBasis);
          weightedAverageCost = Math.max(0, weightedAverageCost);
        } else {
          // For options, negative quantity represents short positions
          if (quantity < 0) {
            console.log(`🔻 SHORT option position: ${Math.abs(quantity)} contracts`);
          }
          totalCostBasis = Math.max(0, totalCostBasis);
          weightedAverageCost = Math.max(0, weightedAverageCost);
        }
        
        console.log(`💰 Asset ${assetId}: quantity=${quantity}, avgCost=${weightedAverageCost}, totalCost=${totalCostBasis}, realizedPL=${realizedPL}`);
        
        // Create or update position if we have an open position
        // For stocks: quantity > 0
        // For options: quantity != 0 (can be negative for short positions)
        const shouldKeepPosition = isOptionAsset ? quantity !== 0 : quantity > 0;
        
        if (shouldKeepPosition) {
          // Check if position already exists
          const { data: existingPosition } = await supabase
            .from('positions')
            .select('id')
            .eq('portfolio_id', portfolioId)
            .eq('asset_id', assetId)
            .single();
          
          const positionData = {
            portfolio_id: portfolioId,
            asset_id: assetId,
            quantity,
            average_cost_basis: weightedAverageCost,
            total_cost_basis: totalCostBasis,
            realized_pl: realizedPL,
            open_date: assetTransactions[0].transaction_date,
            cost_basis_method: 'FIFO' as const,
            is_active: true,
            updated_at: new Date().toISOString()
          };
          
          if (existingPosition) {
            // Update existing position
            await supabase
              .from('positions')
              .update(positionData)
              .eq('id', existingPosition.id);
            updatedCount++;
          } else {
            // Create new position
            await supabase
              .from('positions')
              .insert({
                ...positionData,
                created_at: new Date().toISOString()
              });
            createdCount++;
          }
        } else {
          // Delete position when quantity is 0 (or negative for stocks)
          console.log(`🧹 Deleting position for asset ${assetId} with zero quantity`);
          const { error: deleteError } = await supabase
            .from('positions')
            .delete()
            .eq('portfolio_id', portfolioId)
            .eq('asset_id', assetId);
            
          if (!deleteError) {
            deletedCount++;
          }
        }
      }
      
      console.log(`✅ Position recalculation complete: ${createdCount} created, ${updatedCount} updated, ${deletedCount} deleted`);
      return { data: { created: createdCount, updated: updatedCount, deleted: deletedCount }, error: null, success: true };
      
    } catch (error) {
      console.error('❌ Error recalculating positions:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Manually trigger option expiration check for a portfolio
   * This can be called from UI or scheduled tasks
   */
  static async checkAndExpireOptions(portfolioId: string): Promise<ServiceResponse<{ expired: number; recalculated: boolean }>> {
    try {
      console.log('🕒 Manual option expiration check for portfolio:', portfolioId);
      
      // Run auto-expiration
      const expireResult = await this.autoExpireOptions(portfolioId);
      if (!expireResult.success) {
        return { data: null, error: expireResult.error, success: false };
      }
      
      let recalculated = false;
      const expiredCount = expireResult.data?.expired || 0;
      
      // If any options were expired, recalculate positions
      if (expiredCount > 0) {
        console.log(`🔄 Recalculating positions after expiring ${expiredCount} options`);
        const recalcResult = await this.recalculatePositions(portfolioId);
        recalculated = recalcResult.success;
        
        if (!recalcResult.success) {
          console.warn('⚠️ Option expiration succeeded but position recalculation failed:', recalcResult.error);
        }
      }
      
      return { 
        data: { expired: expiredCount, recalculated }, 
        error: null, 
        success: true 
      };
      
    } catch (error) {
      console.error('❌ Error in manual option expiration check:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Detect if an option transaction is a covered call
   */
  static async detectCoveredCall(
    portfolioId: string,
    optionSymbol: string,
    transactionType: string,
    quantity: number
  ): Promise<string | null> {
    try {
      // Only check for option sell transactions
      if (transactionType !== 'sell') {
        return null;
      }

      // Parse option symbol to get underlying stock symbol
      const underlyingSymbol = this.extractUnderlyingFromOption(optionSymbol);
      if (!underlyingSymbol) {
        return null;
      }

      // Check if user owns enough shares of underlying stock
      const { data: positions } = await this.getPositions(portfolioId);
      const underlyingPosition = positions.find(
        position => position.asset.symbol === underlyingSymbol && position.asset.asset_type === 'stock'
      );

      const sharesNeeded = quantity * 100; // 1 option contract = 100 shares
      
      if (underlyingPosition && underlyingPosition.quantity >= sharesNeeded) {
        return 'covered_call';
      }

      return null; // Likely naked call or insufficient shares
    } catch (error) {
      console.error('Error detecting covered call:', error);
      return null;
    }
  }

  /**
   * Extract underlying stock symbol from option symbol
   * Example: "NVDL240315C00061000" -> "NVDL"
   */
  private static extractUnderlyingFromOption(optionSymbol: string): string | null {
    // Standard option format: SYMBOL + YYMMDD + C/P + STRIKE (8 digits)
    const optionPattern = /^([A-Z]{1,6})\d{6}[CP]\d{8}$/;
    const match = optionSymbol.match(optionPattern);
    
    if (match) {
      return match[1]; // Return the underlying symbol
    }

    // Fallback: if it contains known option indicators, try to extract base symbol
    if (optionSymbol.includes('C') || optionSymbol.includes('P')) {
      // Try to find where the symbol part ends (before date/strike info)
      const symbolMatch = optionSymbol.match(/^([A-Z]{1,6})/);
      return symbolMatch ? symbolMatch[1] : null;
    }

    return null;
  }
}

/**
 * Transaction Service - Transaction management
 */
export class TransactionService {
  /**
   * Get all transactions for a portfolio
   */
  static async getTransactions(portfolioId: string, dateRange: string = 'all'): Promise<ServiceListResponse<Transaction & { asset: Asset }>> {
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
        async (client) => {
          let query = client
            .from('transactions')
            .select(`
              *,
              asset:assets(*)
            `)
            .order('transaction_date', { ascending: false });

          if (portfolioId !== 'all') {
            query = query.eq('portfolio_id', portfolioId);
          }

          const today = startOfDay(new Date());
          let startDate: Date | undefined;

          switch (dateRange) {
            case 'last7days':
              startDate = subDays(today, 7);
              break;
            case 'last30days':
              startDate = subDays(today, 30);
              break;
            case 'last90days':
              startDate = subDays(today, 90);
              break;
            case 'thisYear':
              startDate = new Date(today.getFullYear(), 0, 1);
              break;
            case 'all':
            default:
              // No date filter
              break;
          }

          if (startDate) {
            query = query.gte('transaction_date', format(startDate, 'yyyy-MM-dd'));
          }
          
          return query;
        }, 'getTransactions'
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
    transactionDate: string,
    options?: {
      fees?: number;
      currency?: string;
      notes?: string;
      strategyType?: string;
      assetSymbol?: string;
    }
  ): Promise<ServiceResponse<Transaction>> {
    // Production mode validation
    const isProduction = process.env.NODE_ENV === 'production' ||
                        import.meta.env.VITE_APP_ENVIRONMENT === 'production';
    const usingMockServices = shouldUseMockServices();

    // Log service routing decision for debugging
    console.log(`🔄 Transaction creation routing: ${usingMockServices ? 'MOCK' : 'REAL'} services`);
    console.log(`📊 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

    // Critical error if mock services are used in production
    if (usingMockServices && isProduction) {
      console.error('🚨 CRITICAL: Mock services enabled in production mode!');
      console.error('Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        VITE_APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT,
        VITE_TEST_MODE: import.meta.env.VITE_TEST_MODE,
        VITE_MOCK_DATA_MODE: import.meta.env.VITE_MOCK_DATA_MODE,
        localStorage_E2E: typeof localStorage !== 'undefined' ? localStorage?.getItem('__E2E_TEST_MODE__') : 'N/A',
        window_E2E: typeof window !== 'undefined' ? (window as any).__E2E_TEST_MODE__ : 'N/A'
      });
      throw new Error('Mock services cannot be used in production mode - this prevents real database transactions');
    }

    // Use mock service in test mode
    if (usingMockServices) {
      console.warn('⚠️ Using mock transaction service - transaction will NOT be saved to database');
      return MockServices.TransactionService.createTransaction(
        portfolioId, assetId, transactionType, quantity, price, transactionDate
      );
    }

    console.log('✅ Using real database transaction service');

    try {
      // Auto-detect covered call strategy if not provided
      let finalStrategyType = options?.strategyType;
      
      if (!finalStrategyType && options?.assetSymbol && transactionType === 'sell') {
        const detectedStrategy = await PositionService.detectCoveredCall(
          portfolioId,
          options.assetSymbol,
          transactionType,
          quantity
        );
        if (detectedStrategy) {
          finalStrategyType = detectedStrategy;
          console.log(`✅ Auto-detected strategy: ${finalStrategyType} for ${options.assetSymbol}`);
        }
      }

      // Auto-calculate fees if not provided and asset is an option
      let finalFees = options?.fees || 0;
      if (!options?.fees && options?.assetSymbol) {
        // Get asset to check if it's an option
        const assetResult = await AssetService.getOrCreateAsset(options.assetSymbol);
        if (assetResult.success && assetResult.data?.asset_type === 'option') {
          finalFees = calculateTransactionFees('option', Math.abs(quantity));
          console.log(`💰 Auto-calculated option fees: $${finalFees} for ${Math.abs(quantity)} contracts`);
        }
      }

      // Calculate total amount including fees
      // For buys: add fees to get total cost
      // For sells: subtract fees to get net proceeds
      const baseAmount = quantity * price;
      const totalAmount = transactionType === 'buy' 
        ? baseAmount + finalFees 
        : baseAmount - finalFees;

      const transactionData = {
        portfolio_id: portfolioId,
        asset_id: assetId,
        transaction_type: transactionType,
        quantity,
        price,
        total_amount: totalAmount,
        fees: finalFees,
        currency: options?.currency || 'USD',
        notes: options?.notes,
        strategy_type: finalStrategyType,
        transaction_date: transactionDate
      };

      console.log('📊 Creating transaction with data:', transactionData);

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()

      if (error) {
        console.error('❌ Transaction creation failed:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          sentData: transactionData
        });
        return { data: null, error: error.message, success: false }
      }

      // Update position after successful transaction creation
      console.log('Updating position for transaction:', { portfolioId, assetId, transactionType, quantity, price });
      const positionUpdateResult = await PositionService.updatePositionFromTransaction(
        portfolioId,
        assetId,
        transactionType,
        quantity,
        price,
        options?.fees || 0
      );

      if (!positionUpdateResult.success) {
        console.error('Position update failed after transaction creation:', positionUpdateResult.error);
        // Don't fail the transaction creation if position update fails
        // The position can be updated later via reconciliation
        // But we should notify the user about this issue
      } else {
        console.log('Position updated successfully:', positionUpdateResult.data?.id);
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
      console.log(`🗑️ Attempting to delete transaction: ${transactionId}`);

      // First, check if there are any imap_processed records referencing this transaction
      const { data: referencingRecords, error: checkError } = await supabase
        .from('imap_processed')
        .select('id, transaction_id')
        .eq('transaction_id', transactionId);

      if (checkError) {
        console.warn('⚠️ Could not check for email processing references:', checkError.message);
        // This might not be a fatal error, so we can proceed cautiously
      } else if (referencingRecords && referencingRecords.length > 0) {
        console.log(`Found ${referencingRecords.length} email records referencing this transaction. Attempting to unlink...`);

        // Attempt to clean up references using the database function first, as it can bypass RLS.
        const { data: functionResult, error: functionError } = await supabase
          .rpc('cleanup_transaction_references', {
            target_transaction_id: transactionId
          });

        if (functionError) {
          console.warn('Database function to clean up references failed. Falling back to direct update.', functionError.message);

          // Fallback to direct update if the function fails
          const recordIds = referencingRecords.map(r => r.id);
          const { error: updateError } = await supabase
            .from('imap_processed')
            .update({ transaction_id: null })
            .in('id', recordIds);

          if (updateError) {
            console.error('Failed to update email processing references via direct update:', updateError.message);
            return {
              data: false,
              error: `Cannot delete transaction: Failed to remove email processing references. Please try again or contact support.`,
              success: false
            };
          }
        } else {
          console.log(`Successfully unlinked ${functionResult || 0} email records using database function.`);
        }

        // Verify that the references were removed
        const { data: remainingRefs } = await supabase
          .from('imap_processed')
          .select('id')
          .eq('transaction_id', transactionId);

        if (remainingRefs && remainingRefs.length > 0) {
          console.warn(`⚠️ Could not unlink all email records. Proceeding with deletion, but some records may have dangling references.`);
        } else {
          console.log('✅ Verified: All email processing references have been unlinked.');
        }
      }

      // Now delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('❌ Failed to delete transaction:', error.message);
        return { data: false, error: error.message, success: false };
      }

      console.log(`✅ Successfully deleted transaction: ${transactionId}`);
      return { data: true, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Update transaction
   */
  static async updateTransaction(
    transactionId: string,
    updates: {
      asset_id?: string;
      transaction_type?: TransactionType;
      quantity?: number;
      price?: number;
      total_amount?: number;
      fees?: number;
      currency?: string;
      transaction_date?: string;
      settlement_date?: string;
      exchange_rate?: number;
      notes?: string;
      broker_name?: string;
      external_id?: string;
      strategy_type?: OptionStrategyType | null;
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
        .select('*')
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

/**
 * Fund Movement Service - Handle fund deposits, withdrawals, transfers, and conversions
 */
export class FundMovementService {
  /**
   * Create a new fund movement
   */
  static async createFundMovement(
    portfolioId: string,
    type: 'conversion' | 'withdraw' | 'deposit' | 'transfer',
    amount: number,
    currency: string,
    status: 'pending' | 'completed' | 'failed' | 'cancelled',
    date: string,
    options: {
      fees?: number;
      notes?: string;
      // For conversions
      originalAmount?: number;
      originalCurrency?: string;
      convertedAmount?: number;
      convertedCurrency?: string;
      exchangeRate?: number;
      exchangeFees?: number;
      account?: string;
      // For transfers
      fromAccount?: string;
      toAccount?: string;
    } = {}
  ): Promise<ServiceResponse<Record<string, unknown>>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.FundMovementService.createFundMovement(
        portfolioId, type, amount, currency, status, date, options
      );
    }

    try {
      // Validate required fields for conversions before sending to database
      if (type === 'conversion') {
        if (!options.originalAmount || options.originalAmount <= 0) {
          return { data: null, error: 'Original amount is required for conversions', success: false };
        }
        if (!options.exchangeRate || options.exchangeRate <= 0) {
          return { data: null, error: 'Exchange rate is required for conversions', success: false };
        }
        if (!options.convertedAmount || options.convertedAmount <= 0) {
          return { data: null, error: 'Converted amount is required for conversions', success: false };
        }
        if (!options.account) {
          return { data: null, error: 'Account is required for conversions', success: false };
        }
      }

      // Validate and sanitize numeric values to prevent NaN or invalid values
      const sanitizeNumber = (value: number | undefined, defaultValue: number = 0): number => {
        if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
          return defaultValue;
        }
        return value;
      };

      // Validate numeric constraints to prevent database overflow
      const maxDecimal15_6 = 999999999.999999; // DECIMAL(15,6) max value
      const maxDecimal15_8 = 9999999.99999999; // DECIMAL(15,8) max value
      const maxDecimal5_4 = 9.9999; // DECIMAL(5,4) max value
      
      // Sanitize and validate amount constraints
      const sanitizedAmount = sanitizeNumber(amount);
      if (sanitizedAmount > maxDecimal15_6) {
        return { data: null, error: `Amount exceeds maximum allowed value (${maxDecimal15_6})`, success: false };
      }
      
      const sanitizedOriginalAmount = sanitizeNumber(options.originalAmount);
      if (sanitizedOriginalAmount > maxDecimal15_6) {
        return { data: null, error: `Original amount exceeds maximum allowed value (${maxDecimal15_6})`, success: false };
      }
      
      const sanitizedConvertedAmount = sanitizeNumber(options.convertedAmount);
      if (sanitizedConvertedAmount > maxDecimal15_6) {
        return { data: null, error: `Converted amount exceeds maximum allowed value (${maxDecimal15_6})`, success: false };
      }
      
      const sanitizedExchangeRate = sanitizeNumber(options.exchangeRate);
      if (sanitizedExchangeRate > maxDecimal15_8) {
        return { data: null, error: `Exchange rate exceeds maximum allowed value (${maxDecimal15_8})`, success: false };
      }
      
      const sanitizedExchangeFees = sanitizeNumber(options.exchangeFees);
      if (sanitizedExchangeFees > maxDecimal5_4) {
        return { data: null, error: `Exchange fees percentage exceeds maximum allowed value (${maxDecimal5_4}%)`, success: false };
      }

      const { data, error } = await supabase
        .from('fund_movements')
        .insert({
          portfolio_id: portfolioId,
          type,
          amount: Math.min(sanitizedAmount, maxDecimal15_6),
          currency,
          status,
          movement_date: date,
          fees: options.fees ? Math.min(sanitizeNumber(options.fees), maxDecimal15_6) : 0,
          notes: options.notes,
          original_amount: sanitizedOriginalAmount > 0 ? Math.min(sanitizedOriginalAmount, maxDecimal15_6) : null,
          original_currency: options.originalCurrency,
          converted_amount: sanitizedConvertedAmount > 0 ? Math.min(sanitizedConvertedAmount, maxDecimal15_6) : null,
          converted_currency: options.convertedCurrency,
          exchange_rate: sanitizedExchangeRate > 0 ? Math.min(sanitizedExchangeRate, maxDecimal15_8) : null,
          exchange_fees: Math.min(sanitizedExchangeFees, maxDecimal5_4),
          account: options.account,
          from_account: options.fromAccount,
          to_account: options.toAccount
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase fund movement creation error:', error);
        return { data: null, error: `Database error: ${error.message}`, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      console.error('Fund movement service error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Get fund movements for a portfolio
   */
  static async getFundMovements(portfolioId: string): Promise<ServiceListResponse<Record<string, unknown>>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.FundMovementService.getFundMovements(portfolioId);
    }

    try {
      const { data, error } = await supabase
        .from('fund_movements')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('movement_date', { ascending: false })

      if (error) {
        return { data: [], error: error.message, success: false, total: 0 }
      }

      return { data: data || [], error: null, success: true, total: data?.length || 0 }
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false,
        total: 0
      }
    }
  }

  /**
   * Update a fund movement
   */
  static async updateFundMovement(
    id: string,
    updates: {
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
    }
  ): Promise<ServiceResponse<Record<string, unknown>>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.FundMovementService.updateFundMovement(id, updates);
    }

    try {
      const { data, error } = await supabase
        .from('fund_movements')
        .update(updates)
        .eq('id', id)
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
   * Delete a fund movement
   */
  static async deleteFundMovement(id: string): Promise<ServiceResponse<boolean>> {
    // Use mock service in test mode
    if (shouldUseMockServices()) {
      return MockServices.FundMovementService.deleteFundMovement(id);
    }

    try {
      const { error } = await supabase
        .from('fund_movements')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: false, error: error.message, success: false }
      }

      return { data: true, error: null, success: true }
    } catch (error) {
      return { 
        data: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }
}

/**
 * Email Service - Email tables management
 */
export class EmailService {
  /**
   * Get all emails from imap_inbox table
   */
  static async getImapInboxEmails(): Promise<ServiceListResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: 'User not authenticated', success: false };
      }

      const { data, error, count } = await supabase
        .from('imap_inbox')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) {
        return { data: [], error: error.message, success: false };
      }

      return { data: data || [], error: null, success: true, count: count || 0 };
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      };
    }
  }

  /**
   * Get all emails from processed_email table
   */
  static async getProcessedEmails(): Promise<ServiceListResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: 'User not authenticated', success: false };
      }

      const { data, error, count } = await supabase
        .from('imap_processed')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('processed_at', { ascending: false })
        .limit(100);

      if (error) {
        return { data: [], error: error.message, success: false };
      }

      return { data: data || [], error: null, success: true, count: count || 0 };
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      };
    }
  }

  /**
   * Get email statistics for both tables
   */
  static async getEmailTableStats(): Promise<ServiceResponse<{
    inbox: { count: number; pending: number; processing: number; error: number };
    processed: { count: number; approved: number; rejected: number };
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false };
      }

      // Get inbox stats
      const { data: inboxData, error: inboxError } = await supabase
        .from('imap_inbox')
        .select('status', { count: 'exact' })
        .eq('user_id', user.id);

      // Get processed stats
      const { data: processedData, error: processedError } = await supabase
        .from('imap_processed')
        .select('processing_result', { count: 'exact' })
        .eq('user_id', user.id);

      if (inboxError || processedError) {
        return { 
          data: null, 
          error: inboxError?.message || processedError?.message || 'Failed to get stats', 
          success: false 
        };
      }

      // Calculate inbox stats
      const inboxStats = {
        count: inboxData?.length || 0,
        pending: inboxData?.filter(e => e.status === 'pending').length || 0,
        processing: inboxData?.filter(e => e.status === 'processing').length || 0,
        error: inboxData?.filter(e => e.status === 'error').length || 0,
      };

      // Calculate processed stats
      const processedStats = {
        count: processedData?.length || 0,
        approved: processedData?.filter(e => e.processing_result === 'approved').length || 0,
        rejected: processedData?.filter(e => e.processing_result === 'rejected').length || 0,
      };

      return { 
        data: { inbox: inboxStats, processed: processedStats }, 
        error: null, 
        success: true 
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      };
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
  static fundMovement = FundMovementService
  static email = EmailService
}

export default SupabaseService
