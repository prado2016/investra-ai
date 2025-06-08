/**
 * Real-time Context for Stock Tracker App
 * Provides real-time data synchronization throughout the application
 * Manages Supabase Realtime subscriptions and connection state
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { realtimeService } from '../services/realtimeService'
import type { RealtimeEvent, SubscriptionStatus } from '../services/realtimeService'
import { useAuth } from './AuthContext'
import type { Portfolio, Position, Transaction, Asset } from '../lib/database/types'

// Context interface
interface RealtimeContextType {
  // Connection status
  isConnected: boolean
  status: SubscriptionStatus
  
  // Manual controls
  connect: () => Promise<boolean>
  disconnect: () => Promise<void>
  reconnect: () => Promise<boolean>
  
  // Event subscription helpers
  subscribeToPortfolios: (callback: (event: RealtimeEvent<Portfolio>) => void) => () => void
  subscribeToPositions: (callback: (event: RealtimeEvent<Position>) => void) => () => void
  subscribeToTransactions: (callback: (event: RealtimeEvent<Transaction>) => void) => () => void
  subscribeToAssets: (callback: (event: RealtimeEvent<Asset>) => void) => () => void
  
  // Latest events for debugging
  lastEvent: RealtimeEvent | null
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

// Provider props
interface RealtimeProviderProps {
  children: React.ReactNode
  autoConnect?: boolean
}

/**
 * Real-time Provider Component
 */
export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ 
  children, 
  autoConnect = true 
}) => {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<SubscriptionStatus>(realtimeService.getStatus())
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)

  // Connection management
  const connect = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.log('👤 User not authenticated, skipping realtime connection')
      return false
    }

    console.log('🚀 Connecting to realtime service...')
    const success = await realtimeService.initialize()
    
    if (success) {
      console.log('✅ Successfully connected to realtime service')
    } else {
      console.log('❌ Failed to connect to realtime service')
    }
    
    return success
  }, [user])

  const disconnect = useCallback(async (): Promise<void> => {
    console.log('📡 Disconnecting from realtime service...')
    await realtimeService.disconnect()
  }, [])

  const reconnect = useCallback(async (): Promise<boolean> => {
    console.log('🔄 Reconnecting to realtime service...')
    return await realtimeService.reconnect()
  }, [])

  // Event subscription helpers
  const subscribeToPortfolios = useCallback((callback: (event: RealtimeEvent<Portfolio>) => void) => {
    const wrappedCallback = (event: RealtimeEvent<Portfolio>) => {
      setLastEvent(event)
      callback(event)
    }
    return realtimeService.onPortfolioChange(wrappedCallback)
  }, [])

  const subscribeToPositions = useCallback((callback: (event: RealtimeEvent<Position>) => void) => {
    const wrappedCallback = (event: RealtimeEvent<Position>) => {
      setLastEvent(event)
      callback(event)
    }
    return realtimeService.onPositionChange(wrappedCallback)
  }, [])

  const subscribeToTransactions = useCallback((callback: (event: RealtimeEvent<Transaction>) => void) => {
    const wrappedCallback = (event: RealtimeEvent<Transaction>) => {
      setLastEvent(event)
      callback(event)
    }
    return realtimeService.onTransactionChange(wrappedCallback)
  }, [])

  const subscribeToAssets = useCallback((callback: (event: RealtimeEvent<Asset>) => void) => {
    const wrappedCallback = (event: RealtimeEvent<Asset>) => {
      setLastEvent(event)
      callback(event)
    }
    return realtimeService.onAssetChange(wrappedCallback)
  }, [])

  // Effect to handle authentication changes
  useEffect(() => {
    if (user && autoConnect) {
      connect()
    } else if (!user) {
      disconnect()
    }
  }, [user, autoConnect, connect, disconnect])

  // Effect to subscribe to status changes
  useEffect(() => {
    const unsubscribe = realtimeService.onStatusChange((newStatus) => {
      setStatus(newStatus)
      setIsConnected(newStatus.connected)
    })

    return unsubscribe
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realtimeService.cleanup()
    }
  }, [])

  const contextValue: RealtimeContextType = {
    isConnected,
    status,
    connect,
    disconnect,
    reconnect,
    subscribeToPortfolios,
    subscribeToPositions,
    subscribeToTransactions,
    subscribeToAssets,
    lastEvent
  }

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

/**
 * Hook to use real-time context
 */
export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

/**
 * Hook for portfolio real-time updates
 */
export const useRealtimePortfolios = (
  callback: (event: RealtimeEvent<Portfolio>) => void
): void => {
  const { subscribeToPortfolios } = useRealtime()

  useEffect(() => {
    const unsubscribe = subscribeToPortfolios(callback)
    return unsubscribe
  }, [subscribeToPortfolios, callback])
}

/**
 * Hook for position real-time updates
 */
export const useRealtimePositions = (
  callback: (event: RealtimeEvent<Position>) => void
): void => {
  const { subscribeToPositions } = useRealtime()

  useEffect(() => {
    const unsubscribe = subscribeToPositions(callback)
    return unsubscribe
  }, [subscribeToPositions, callback])
}

/**
 * Hook for transaction real-time updates
 */
export const useRealtimeTransactions = (
  callback: (event: RealtimeEvent<Transaction>) => void
): void => {
  const { subscribeToTransactions } = useRealtime()

  useEffect(() => {
    const unsubscribe = subscribeToTransactions(callback)
    return unsubscribe
  }, [subscribeToTransactions, callback])
}

/**
 * Hook for asset real-time updates
 */
export const useRealtimeAssets = (
  callback: (event: RealtimeEvent<Asset>) => void
): void => {
  const { subscribeToAssets } = useRealtime()

  useEffect(() => {
    const unsubscribe = subscribeToAssets(callback)
    return unsubscribe
  }, [subscribeToAssets, callback])
}

export default RealtimeProvider
