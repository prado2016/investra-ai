import React, { useState } from 'react'
import { SupabaseService } from '../../services'
import { useNotifications } from '../../contexts/NotificationContext'

const PortfolioDemo: React.FC = () => {
  const [portfolioName, setPortfolioName] = useState('')
  const [portfolioDescription, setPortfolioDescription] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [portfolios, setPortfolios] = useState<any[]>([])
  const { success, error } = useNotifications()

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
        success('Portfolio Created!', `Successfully created portfolio "${result.data.name}"`)
        setPortfolioName('')
        setPortfolioDescription('')
        loadPortfolios() // Refresh the list
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
        'AAPL', // symbol
        10,     // quantity
        150.50, // price
        new Date().toISOString(), // date
        1.99,   // fees
        'stock',
        'USD'
      )

      if (result.success && result.data) {
        success(
          'Transaction Added!', 
          `Bought 10 shares of AAPL at $150.50 in portfolio`
        )
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

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>📊 Service Layer Demo: Portfolio Management</h3>
      
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
                backgroundColor: 'white'
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
    </div>
  )
}

export default PortfolioDemo
