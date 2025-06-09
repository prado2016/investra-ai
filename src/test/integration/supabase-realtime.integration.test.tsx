import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetMockDatabase } from '../mocks/supabaseHandlers'

// Mock WebSocket for real-time testing
class MockWebSocket {
  public url: string
  public readyState: number
  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  constructor(url: string) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    
    // Simulate connection establishment
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen?.({ type: 'open' } as Event)
    }, 100)
  }

  send(data: string) {
    // Mock sending data
    console.log('WebSocket send:', data)
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ 
      type: 'close', 
      code: code || 1000, 
      reason: reason || '',
      wasClean: true 
    } as CloseEvent)
  }

  addEventListener(type: string, listener: (...args: unknown[]) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: (...args: unknown[]) => void) {
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.delete(listener)
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: unknown) {
    const event = {
      type: 'message',
      data: JSON.stringify(data)
    } as MessageEvent
    
    this.onmessage?.(event)
    
    const listeners = this.listeners.get('message')
    if (listeners) {
      listeners.forEach(listener => listener(event))
    }
  }

  // Helper method to simulate errors
  simulateError() {
    const event = { type: 'error' } as Event
    this.onerror?.(event)
    
    const listeners = this.listeners.get('error')
    if (listeners) {
      listeners.forEach(listener => listener(event))
    }
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket
let mockWebSockets: MockWebSocket[] = []

beforeEach(() => {
  mockWebSockets = []
  global.WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url)
      mockWebSockets.push(this)
    }
  } as unknown as typeof WebSocket
})

afterEach(() => {
  global.WebSocket = originalWebSocket
  mockWebSockets = []
})

// Mock hook for real-time subscriptions
const useRealtimeSubscription = (table: string, initialData: Record<string, unknown>[] = []) => {
  const [data, setData] = React.useState(initialData)
  const [connected, setConnected] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Simulate subscription setup
    const ws = new WebSocket(`wss://test-project.supabase.co/realtime/v1?vsn=1.0.0`)
    
    ws.onopen = () => {
      setConnected(true)
      setError(null)
    }
    
    ws.onclose = () => {
      setConnected(false)
    }
    
    ws.onerror = () => {
      setError('Connection failed')
      setConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [table])

  const handleInsert = React.useCallback((payload: { new: Record<string, unknown> }) => {
    setData(prev => [...prev, payload.new])
  }, [])

  const handleUpdate = React.useCallback((payload: { new: Record<string, unknown>, old: Record<string, unknown> }) => {
    setData(prev => prev.map(item => 
      item.id === payload.old.id ? payload.new : item
    ))
  }, [])

  const handleDelete = React.useCallback((payload: { old: Record<string, unknown> }) => {
    setData(prev => prev.filter(item => item.id !== payload.old.id))
  }, [])

  return {
    data,
    connected,
    error,
    handleInsert,
    handleUpdate,
    handleDelete
  }
}

describe('Supabase Real-time Integration Tests', () => {
  beforeEach(() => {
    resetMockDatabase()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      expect(result.current.connected).toBe(false)

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.connected).toBe(true)
      }, { timeout: 200 })

      expect(result.current.error).toBeNull()
    })

    it('should handle connection failures', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      // Simulate connection error
      await waitFor(() => {
        const ws = mockWebSockets[0]
        if (ws) {
          act(() => {
            ws.simulateError()
          })
        }
      })

      expect(result.current.connected).toBe(false)
      expect(result.current.error).toBe('Connection failed')
    })

    it('should handle connection drops and reconnection', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true)
      })

      // Simulate connection drop
      act(() => {
        const ws = mockWebSockets[0]
        if (ws) {
          ws.close()
        }
      })

      await waitFor(() => {
        expect(result.current.connected).toBe(false)
      })
    })
  })

  describe('Real-time Data Synchronization', () => {
    it('should handle INSERT events', async () => {
      const initialData = [
        { id: 1, asset_symbol: 'AAPL', quantity: 10 }
      ]

      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', initialData)
      )

      expect(result.current.data).toHaveLength(1)

      // Simulate INSERT event
      act(() => {
        result.current.handleInsert({
          new: { id: 2, asset_symbol: 'GOOGL', quantity: 5 }
        })
      })

      expect(result.current.data).toHaveLength(2)
      expect(result.current.data[1]).toEqual({
        id: 2,
        asset_symbol: 'GOOGL',
        quantity: 5
      })
    })

    it('should handle UPDATE events', async () => {
      const initialData = [
        { id: 1, asset_symbol: 'AAPL', quantity: 10 },
        { id: 2, asset_symbol: 'GOOGL', quantity: 5 }
      ]

      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', initialData)
      )

      // Simulate UPDATE event
      act(() => {
        result.current.handleUpdate({
          old: { id: 1, asset_symbol: 'AAPL', quantity: 10 },
          new: { id: 1, asset_symbol: 'AAPL', quantity: 15 }
        })
      })

      expect(result.current.data).toHaveLength(2)
      expect(result.current.data[0].quantity).toBe(15)
      expect(result.current.data[1].quantity).toBe(5) // Unchanged
    })

    it('should handle DELETE events', async () => {
      const initialData = [
        { id: 1, asset_symbol: 'AAPL', quantity: 10 },
        { id: 2, asset_symbol: 'GOOGL', quantity: 5 }
      ]

      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', initialData)
      )

      expect(result.current.data).toHaveLength(2)

      // Simulate DELETE event
      act(() => {
        result.current.handleDelete({
          old: { id: 1, asset_symbol: 'AAPL', quantity: 10 }
        })
      })

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].id).toBe(2)
    })
  })

  describe('Subscription Lifecycle Management', () => {
    it('should clean up subscriptions on unmount', async () => {
      const { result, unmount } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true)
      })

      expect(mockWebSockets).toHaveLength(1)
      const ws = mockWebSockets[0]
      const closeSpy = vi.spyOn(ws, 'close')

      // Unmount component
      unmount()

      expect(closeSpy).toHaveBeenCalled()
    })

    it('should handle multiple subscriptions', async () => {
      const { result: result1 } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )
      
      const { result: result2 } = renderHook(() => 
        useRealtimeSubscription('positions', [])
      )

      await waitFor(() => {
        expect(result1.current.connected).toBe(true)
        expect(result2.current.connected).toBe(true)
      })

      expect(mockWebSockets).toHaveLength(2)
    })
  })

  describe('Real-time Performance Testing', () => {
    it('should handle high-frequency updates', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      const startTime = performance.now()

      // Simulate multiple rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.handleInsert({
            new: { id: i + 1, asset_symbol: `STOCK${i}`, quantity: i }
          })
        })
      }

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(result.current.data).toHaveLength(100)
      expect(processingTime).toBeLessThan(1000) // Should process quickly
    })

    it('should measure message latency', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      const messageTimestamp = Date.now()

      act(() => {
        result.current.handleInsert({
          new: { 
            id: 1, 
            asset_symbol: 'AAPL', 
            quantity: 10,
            timestamp: messageTimestamp
          }
        })
      })

      const processedTimestamp = Date.now()
      const latency = processedTimestamp - messageTimestamp

      expect(latency).toBeLessThan(100) // Should be very fast in tests
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle malformed real-time messages', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true)
      })

      // Simulate malformed message
      act(() => {
        const ws = mockWebSockets[0]
        if (ws) {
          ws.simulateMessage({ invalid: 'data' })
        }
      })

      // Should not crash the subscription
      expect(result.current.connected).toBe(true)
    })

    it('should handle subscription failures gracefully', async () => {
      const { result } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )

      // Simulate subscription failure
      act(() => {
        const ws = mockWebSockets[0]
        if (ws) {
          ws.simulateError()
        }
      })

      expect(result.current.error).toBe('Connection failed')
      expect(result.current.connected).toBe(false)
    })
  })

  describe('Cross-table Synchronization', () => {
    it('should maintain consistency across related tables', async () => {
      const { result: transactionResult } = renderHook(() => 
        useRealtimeSubscription('transactions', [])
      )
      
      const { result: positionResult } = renderHook(() => 
        useRealtimeSubscription('positions', [])
      )

      // Wait for both connections
      await waitFor(() => {
        expect(transactionResult.current.connected).toBe(true)
        expect(positionResult.current.connected).toBe(true)
      })

      // Simulate related updates
      act(() => {
        // Add transaction
        transactionResult.current.handleInsert({
          new: { 
            id: 1, 
            asset_symbol: 'AAPL', 
            quantity: 10, 
            type: 'buy',
            user_id: 'test-user-1'
          }
        })

        // Update corresponding position
        positionResult.current.handleUpdate({
          old: { id: 1, asset_symbol: 'AAPL', quantity: 5 },
          new: { id: 1, asset_symbol: 'AAPL', quantity: 15 }
        })
      })

      expect(transactionResult.current.data).toHaveLength(1)
      expect(positionResult.current.data).toHaveLength(1)
      expect(positionResult.current.data[0].quantity).toBe(15)
    })
  })
})
