/**
 * Real-time Data Synchronization Service for Stock Tracker App
 * Handles Supabase Realtime subscriptions for live data updates
 * Provides optimized subscription management and reconnection logic
 */

import { supabase } from '../lib/supabase'
import type { 
  Portfolio, 
  Position, 
  Transaction, 
  Asset 
} from '../lib/database/types'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Real-time event types
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeEvent<T = unknown> {
  eventType: RealtimeEventType
  table: string
  new: T | null
  old: T | null
  timestamp: string
}

// Subscription status tracking
export interface SubscriptionStatus {
  connected: boolean
  subscribedTables: string[]
  lastHeartbeat: Date | null
  reconnectAttempts: number
  error: string | null
}

// Event listener types
export type PortfolioEventListener = (event: RealtimeEvent<Portfolio>) => void
export type PositionEventListener = (event: RealtimeEvent<Position>) => void
export type TransactionEventListener = (event: RealtimeEvent<Transaction>) => void
export type AssetEventListener = (event: RealtimeEvent<Asset>) => void
export type ConnectionStatusListener = (status: SubscriptionStatus) => void

/**
 * Real-time Synchronization Service Class
 */
export class RealtimeService {
  private static instance: RealtimeService
  
  private channel: RealtimeChannel | null = null
  private isConnected = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  
  // Event listeners
  private portfolioListeners: PortfolioEventListener[] = []
  private positionListeners: PositionEventListener[] = []
  private transactionListeners: TransactionEventListener[] = []
  private assetListeners: AssetEventListener[] = []
  private statusListeners: ConnectionStatusListener[] = []
  
  // Subscription status
  private status: SubscriptionStatus = {
    connected: false,
    subscribedTables: [],
    lastHeartbeat: null,
    reconnectAttempts: 0,
    error: null
  }

  private constructor() {
    this.setupHeartbeat()
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  /**
   * Initialize real-time subscriptions for authenticated user
   */
  public async initialize(): Promise<boolean> {
    try {
      // Don't re-initialize if already connected
      if (this.isConnected && this.channel) {
        console.log('🔌 Realtime service already initialized and connected')
        return true
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        this.updateStatus({ error: 'User not authenticated' })
        return false
      }

      // Create channel for user-specific data
      this.channel = supabase.channel(`user_${user.id}`)

      // Subscribe to portfolios changes
      this.channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolios',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => this.handlePortfolioChange(payload as RealtimePostgresChangesPayload<Portfolio>)
      )

      // Subscribe to positions changes (via portfolios relationship)
      this.channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions'
        },
        (payload) => this.handlePositionChange(payload as RealtimePostgresChangesPayload<Position>)
      )

      // Subscribe to transactions changes (via portfolios relationship)
      this.channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => this.handleTransactionChange(payload as RealtimePostgresChangesPayload<Transaction>)
      )

      // Subscribe to assets changes (public data)
      this.channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets'
        },
        (payload) => this.handleAssetChange(payload as RealtimePostgresChangesPayload<Asset>)
      )

      // Set up connection event handlers
      this.channel
        .on('presence', { event: 'sync' }, () => {
          console.log('💚 Realtime presence synced')
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('👋 User joined:', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('👋 User left:', key, leftPresences)
        })

      // Subscribe to the channel
      await this.channel.subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          this.updateStatus({
            connected: true,
            subscribedTables: ['portfolios', 'positions', 'transactions', 'assets'],
            error: null,
            reconnectAttempts: 0
          })
        } else if (status === 'CHANNEL_ERROR') {
          this.isConnected = false
          this.updateStatus({
            connected: false,
            error: 'Channel error occurred'
          })
          this.scheduleReconnect()
        } else if (status === 'TIMED_OUT') {
          this.isConnected = false
          this.updateStatus({
            connected: false,
            error: 'Connection timed out'
          })
          this.scheduleReconnect()
        } else if (status === 'CLOSED') {
          this.isConnected = false
          this.updateStatus({
            connected: false,
            error: 'Connection closed'
          })
        }
      })

      console.log('🚀 Realtime service initialized')
      return true

    } catch (error) {
      console.error('❌ Failed to initialize realtime service:', error)
      this.updateStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      })
      return false
    }
  }

  /**
   * Handle portfolio changes
   */
  private async handlePortfolioChange(payload: RealtimePostgresChangesPayload<Portfolio>): Promise<void> {
    try {
      // Verify this change belongs to current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const portfolio = payload.new as Portfolio || payload.old as Portfolio
      if (portfolio && portfolio.user_id !== user.id) return

      const event: RealtimeEvent<Portfolio> = {
        eventType: payload.eventType as RealtimeEventType,
        table: 'portfolios',
        new: payload.new as Portfolio || null,
        old: payload.old as Portfolio || null,
        timestamp: new Date().toISOString()
      }

      // Notify all portfolio listeners
      this.portfolioListeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('❌ Error in portfolio listener:', error)
        }
      })

      console.log('📊 Portfolio change:', payload.eventType, portfolio?.name)
    } catch (error) {
      console.error('❌ Error handling portfolio change:', error)
    }
  }

  /**
   * Handle position changes
   */
  private async handlePositionChange(payload: RealtimePostgresChangesPayload<Position>): Promise<void> {
    try {
      // For positions, we need to verify ownership through portfolio
      const position = payload.new as Position || payload.old as Position
      if (!position) return

      // Check if this position belongs to user's portfolio
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('user_id')
        .eq('id', position.portfolio_id)
        .single()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !portfolio || portfolio.user_id !== user.id) return

      const event: RealtimeEvent<Position> = {
        eventType: payload.eventType as RealtimeEventType,
        table: 'positions',
        new: payload.new as Position || null,
        old: payload.old as Position || null,
        timestamp: new Date().toISOString()
      }

      // Notify all position listeners
      this.positionListeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('❌ Error in position listener:', error)
        }
      })

      console.log('📈 Position change:', payload.eventType, position.id)
    } catch (error) {
      console.error('❌ Error handling position change:', error)
    }
  }

  /**
   * Handle transaction changes
   */
  private async handleTransactionChange(payload: RealtimePostgresChangesPayload<Transaction>): Promise<void> {
    try {
      // For transactions, verify ownership through portfolio
      const transaction = payload.new as Transaction || payload.old as Transaction
      if (!transaction) return

      // Check if this transaction belongs to user's portfolio
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('user_id')
        .eq('id', transaction.portfolio_id)
        .single()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !portfolio || portfolio.user_id !== user.id) return

      const event: RealtimeEvent<Transaction> = {
        eventType: payload.eventType as RealtimeEventType,
        table: 'transactions',
        new: payload.new as Transaction || null,
        old: payload.old as Transaction || null,
        timestamp: new Date().toISOString()
      }

      // Notify all transaction listeners
      this.transactionListeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('❌ Error in transaction listener:', error)
        }
      })

      console.log('💰 Transaction change:', payload.eventType, transaction.id)
    } catch (error) {
      console.error('❌ Error handling transaction change:', error)
    }
  }

  /**
   * Handle asset changes (public data)
   */
  private handleAssetChange(payload: RealtimePostgresChangesPayload<Asset>): void {
    try {
      const asset = payload.new as Asset || payload.old as Asset

      const event: RealtimeEvent<Asset> = {
        eventType: payload.eventType as RealtimeEventType,
        table: 'assets',
        new: payload.new as Asset || null,
        old: payload.old as Asset || null,
        timestamp: new Date().toISOString()
      }

      // Notify all asset listeners
      this.assetListeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('❌ Error in asset listener:', error)
        }
      })

      console.log('🏢 Asset change:', payload.eventType, asset?.symbol)
    } catch (error) {
      console.error('❌ Error handling asset change:', error)
    }
  }

  /**
   * Subscribe to portfolio changes
   */
  public onPortfolioChange(listener: PortfolioEventListener): () => void {
    this.portfolioListeners.push(listener)
    return () => {
      const index = this.portfolioListeners.indexOf(listener)
      if (index > -1) {
        this.portfolioListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to position changes
   */
  public onPositionChange(listener: PositionEventListener): () => void {
    this.positionListeners.push(listener)
    return () => {
      const index = this.positionListeners.indexOf(listener)
      if (index > -1) {
        this.positionListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to transaction changes
   */
  public onTransactionChange(listener: TransactionEventListener): () => void {
    this.transactionListeners.push(listener)
    return () => {
      const index = this.transactionListeners.indexOf(listener)
      if (index > -1) {
        this.transactionListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to asset changes
   */
  public onAssetChange(listener: AssetEventListener): () => void {
    this.assetListeners.push(listener)
    return () => {
      const index = this.assetListeners.indexOf(listener)
      if (index > -1) {
        this.assetListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  public onStatusChange(listener: ConnectionStatusListener): () => void {
    this.statusListeners.push(listener)
    // Send current status immediately
    listener(this.status)
    return () => {
      const index = this.statusListeners.indexOf(listener)
      if (index > -1) {
        this.statusListeners.splice(index, 1)
      }
    }
  }

  /**
   * Update subscription status and notify listeners
   */
  private updateStatus(updates: Partial<SubscriptionStatus>): void {
    this.status = { 
      ...this.status, 
      ...updates,
      lastHeartbeat: new Date()
    }
    
    this.statusListeners.forEach(listener => {
      try {
        listener(this.status)
      } catch (error) {
        console.error('❌ Error in status listener:', error)
      }
    })
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = Math.min(1000 * Math.pow(2, this.status.reconnectAttempts), 30000) // Exponential backoff, max 30s
    
    this.reconnectTimer = setTimeout(async () => {
      console.log(`🔄 Attempting reconnection (attempt ${this.status.reconnectAttempts + 1})`)
      
      this.updateStatus({
        reconnectAttempts: this.status.reconnectAttempts + 1
      })

      await this.disconnect()
      await this.initialize()
    }, delay)
  }

  /**
   * Setup heartbeat to monitor connection health
   */
  private setupHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.updateStatus({ lastHeartbeat: new Date() })
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Get current connection status
   */
  public getStatus(): SubscriptionStatus {
    return { ...this.status }
  }

  /**
   * Check if service is connected
   */
  public isServiceConnected(): boolean {
    return this.isConnected
  }

  /**
   * Manually reconnect
   */
  public async reconnect(): Promise<boolean> {
    console.log('🔄 Manual reconnection requested')
    await this.disconnect()
    return await this.initialize()
  }

  /**
   * Disconnect from real-time service
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }

      if (this.channel) {
        await this.channel.unsubscribe()
        this.channel = null
      }

      this.isConnected = false
      this.updateStatus({
        connected: false,
        subscribedTables: [],
        error: null
      })

      console.log('📡 Realtime service disconnected')
    } catch (error) {
      console.error('❌ Error disconnecting realtime service:', error)
    }
  }

  /**
   * Clean up all resources
   */
  public async cleanup(): Promise<void> {
    await this.disconnect()
    
    // Clear all listeners
    this.portfolioListeners = []
    this.positionListeners = []
    this.transactionListeners = []
    this.assetListeners = []
    this.statusListeners = []

    console.log('🧹 Realtime service cleaned up')
  }
}

// Export singleton instance
export const realtimeService = RealtimeService.getInstance()
export default realtimeService
