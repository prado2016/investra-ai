import React, { useState, useCallback } from 'react'
import { SupabaseService } from '../../services'
import { useNotifications } from '../../contexts/NotificationContext'
import { useRealtimePortfolios, useRealtimeTransactions } from '../../contexts/RealtimeContext'
import type { RealtimeEvent, Portfolio, Transaction } from '../../lib/database/types'

const RealtimePortfolioDemo: React.FC = () => {
  const [portfolioName, setPortfolioName] = useState('')
  const [portfolioDescription, setPortfolioDescription] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const { success, error } = useNotifications()

  // Handle real-time portfolio updates
  const handlePortfolioEvent = useCallback((event: RealtimeEvent<Portfolio>) => {
    console.log('📊 Portfolio event received:', event)
    
    setRealtimeEvents(prev => [event, ...prev.slice(0, 4)]) // Keep last 5 events
    
    if (event.eventType === 'INSERT' && event.new) {
      setPortfolios(prev => [...prev, event.new])
      success('Portfolio Added!', `New portfolio "${event.new.name}" was created`)
    } else if (event.eventType === 'UPDATE' && event.new) {
      setPortfolios(prev => prev.map(p => p.id === event.new!.id ? event.new! : p))
      success('Portfolio Updated!', `Portfolio "${event.new.name}" was modified`)
    } else if (event.eventType === 'DELETE' && event.old) {
      setPortfolios(prev => prev.filter(p => p.id !== event.old!.id))
      success('Portfolio Removed!', `Portfolio "${event.old.name}" was deleted`)
    }
  }, [success])

  // Handle real-time transaction updates
  const handleTransactionEvent = useCallback((event: RealtimeEvent<Transaction>) => {
    console.log('💰 Transaction event received:', event)
    
    setRealtimeEvents(prev => [event, ...prev.slice(0, 4)]) // Keep last 5 events
    
    if (event.eventType === 'INSERT' && event.new) {
      success('Transaction Added!', `New ${event.new.transaction_type} transaction created`)
    }
  }, [success])

  // Subscribe to real-time events
  useRealtimePortfolios(handlePortfolioEvent)
  useRealtimeTransactions(handleTransactionEvent)

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!portfolioName.trim()) {
      error('Validation Error', 'Portfolio name is required')
      return
    }

    setLoading(true)
    
    try {
      const result = await SupabaseService.portfolio.createPortfolio(
        portfolioName.trim(),
        portfolioDescription.trim(),
        currency
      )

      if (result.success && result.data) {
        // Real-time event will handle UI update
        setPortfolioName('')
        setPortfolioDescription('')
        loadPortfolios() // Refresh to ensure consistency
      } else {
        error('Create Failed', result.error || 'Failed to create portfolio')
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadPortfolios = async () => {
    try {
      const result = await SupabaseService.portfolio.getPortfolios()
      if (result.success) {
        setPortfolios(result.data)
      } else if (result.error !== 'User not authenticated') {
        error('Load Failed', result.error || 'Failed to load portfolios')
      }
    } catch (err) {
      console.error('Failed to load portfolios:', err)
    }
  }

  const handleBuyStock = async (portfolioId: string) => {
    setLoading(true)
    
    try {
      const result = await SupabaseService.utility.processBuyTransaction(
        portfolioId,
        'AAPL',
        10,
        150.50,
        new Date().toISOString(),
        1.99,
        'stock',
        'USD'
      )

      if (result.success && result.data) {
        // Real-time event will handle notification
      } else {
        error('Transaction Failed', result.error || 'Failed to process buy transaction')
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadPortfolios()
  }, [])

  const getEventIcon = (eventType: string, table: string) => {
    const tableIcons: Record<string, string> = {
      'portfolios': '📊',
      'transactions': '💰',
      'positions': '📈',
      'assets': '🏢'
    }
    
    const eventIcons: Record<string, string> = {
      'INSERT': '➕',
      'UPDATE': '✏️',
      'DELETE': '🗑️'
    }
    
    return `${tableIcons[table] || '📄'} ${eventIcons[eventType] || '🔄'}`
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>📊 Real-time Portfolio Demo</h3>
      <p>Create portfolios and see live updates across all devices!</p>
      
      {realtimeEvents.length > 0 && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#e6ffe6',
          border: '1px solid #28a745',
          borderRadius: '4px'
        }}>
          <h5>🔄 Recent Real-time Events</h5>
          {realtimeEvents.slice(0, 3).map((event, index) => (
            <div key={index} style={{ 
              fontSize: '0.9em', 
              marginBottom: '5px',
              padding: '5px',
              backgroundColor: 'white',
              borderRadius: '3px'
            }}>
              {getEventIcon(event.eventType, event.table)} {event.table} {event.eventType} 
              <span style={{ color: '#666', marginLeft: '10px' }}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleCreatePortfolio} style={{ marginBottom: '20px' }}>
        <h4>Create New Portfolio</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Portfolio Name *
          </label>
          <input
            type="text"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            placeholder="My Portfolio"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Description
          </label>
          <textarea
            value={portfolioDescription}
            onChange={(e) => setPortfolioDescription(e.target.value)}
            placeholder="Optional description..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '60px'
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            disabled={loading}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Portfolio'}
        </button>
      </form>

      <div>
        <h4>Your Portfolios ({portfolios.length})</h4>
        {portfolios.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No portfolios found. Create one above to get started!
          </p>
        ) : (
          portfolios.map(portfolio => (
            <div
              key={portfolio.id}
              style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '10px',
                backgroundColor: 'white',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h5 style={{ margin: '0 0 5px 0' }}>{portfolio.name}</h5>
                  <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
                    {portfolio.description || 'No description'}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', color: '#999' }}>
                    Currency: {portfolio.currency} | Created: {new Date(portfolio.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleBuyStock(portfolio.id)}
                  disabled={loading}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  {loading ? '...' : 'Buy AAPL (Demo)'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#e6f3ff',
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <strong>🔄 Real-time Demo Features:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>✅ Live portfolio creation and updates</li>
          <li>✅ Real-time transaction notifications</li>
          <li>✅ Multi-device synchronization</li>
          <li>✅ Event history tracking</li>
          <li>✅ Automatic UI updates</li>
        </ul>
        <p style={{ margin: '5px 0', fontSize: '0.8em', color: '#666' }}>
          Try opening this app in multiple tabs or devices to see real-time sync in action!
        </p>
      </div>
    </div>
  )
}

export default RealtimePortfolioDemo
