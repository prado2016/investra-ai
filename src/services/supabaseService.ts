/**
 * Supabase Service Layer for Stock Tracker App
 * Provides CRUD operations for all data models with Supabase integration
 * Implements error handling, data validation, and optimistic updates
 */

import { supabase } from '../lib/supabase'
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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: [], error: 'User not authenticated', success: false }
      }

      // Add 10-second timeout to prevent hanging
      const portfolioQuery = supabase
        .from('portfolios')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Portfolio query timeout after 10 seconds')), 10000)
      })

      const { data, error, count } = await Promise.race([portfolioQuery, timeoutPromise])

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
      // Add 10-second timeout to prevent hanging
      const positionQuery = supabase
        .from('positions')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Position query timeout after 10 seconds')), 10000)
      })

      const { data, error } = await Promise.race([positionQuery, timeoutPromise])

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
    try {
      // Add 10-second timeout to prevent hanging
      const transactionQuery = supabase
        .from('transactions')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: false })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction query timeout after 10 seconds')), 10000)
      })

      const { data, error } = await Promise.race([transactionQuery, timeoutPromise])

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
