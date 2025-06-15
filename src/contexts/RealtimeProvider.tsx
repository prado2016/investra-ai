/**
 * Real-time Context for Stock Tracker App
 * Provides real-time data synchronization throughout the application
 * Manages Supabase Realtime subscriptions and connection state
 */

import React, { useEffect, useState, useCallback } from 'react';
import { realtimeService } from '../services/realtimeService';
import type { RealtimeEvent, SubscriptionStatus } from '../services/realtimeService';
import { useAuth } from './AuthProvider';
import type { Portfolio, Position, Transaction, Asset } from '../lib/database/types';
import { RealtimeContext, type RealtimeContextType } from './RealtimeContext';

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

    // Don't reconnect if already connected
    if (isConnected && realtimeService.isServiceConnected()) {
      console.log('✅ Already connected to realtime service')
      return true
    }

    console.log('🚀 Connecting to realtime service...')
    const success = await realtimeService.initialize()
    
    if (success) {
      console.log('✅ Successfully connected to realtime service')
    } else {
      console.log('❌ Failed to connect to realtime service')
    }
    
    return success
  }, [user, isConnected])

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
    if (user && autoConnect && !isConnected) {
      console.log('🔌 User authenticated, connecting to realtime...');
      connect()
    } else if (!user && isConnected) {
      console.log('🔌 User logged out, disconnecting from realtime...');
      disconnect()
    }
  }, [user, autoConnect, isConnected, connect, disconnect])

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
  );
};

export default RealtimeProvider;
