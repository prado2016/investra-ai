import React, { useState, useCallback } from 'react'
import { useOffline, useOfflineStatus } from '../../contexts/OfflineContext'
import { useNotifications } from '../../contexts/NotificationContext'

const OfflineStatusComponent: React.FC = () => {
  const { 
    createPortfolioOffline, 
    getPortfoliosOffline, 
    syncNow, 
    clearOfflineData, 
    isInitialized 
  } = useOffline()
  
  const { 
    isOnline, 
    isSyncing, 
    queueSize, 
    lastSyncTime, 
    syncErrors, 
    hasErrors 
  } = useOfflineStatus()
  
  const [portfolioName, setPortfolioName] = useState('')
  const [offlinePortfolios, setOfflinePortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { success, error, info, warning } = useNotifications()

  const handleCreateOfflinePortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!portfolioName.trim()) {
      error('Validation Error', 'Portfolio name is required')
      return
    }

    setLoading(true)
    
    try {
      const result = await createPortfolioOffline(
        portfolioName.trim(),
        'Created offline',
        'USD'
      )

      if (result.success) {
        success(
          'Portfolio Created Offline!', 
          isOnline ? 'Will sync to server automatically' : 'Saved locally, will sync when online'
        )
        setPortfolioName('')
        loadOfflinePortfolios()
      } else {
        error('Creation Failed', result.error || 'Failed to create portfolio offline')
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadOfflinePortfolios = useCallback(async () => {
    try {
      const portfolios = await getPortfoliosOffline()
      setOfflinePortfolios(portfolios)
    } catch (err) {
      console.error('Failed to load offline portfolios:', err)
    }
  }, [getPortfoliosOffline])

  const handleSyncNow = async () => {
    if (!isOnline) {
      warning('Offline Mode', 'Cannot sync while offline. Connect to internet first.')
      return
    }

    setLoading(true)
    info('Syncing...', 'Synchronizing offline data with server')
    
    try {
      const success = await syncNow()
      
      if (success) {
        info('Sync Complete!', 'All offline data synchronized successfully')
        loadOfflinePortfolios() // Refresh data after sync
      } else {
        error('Sync Failed', 'Failed to synchronize data with server')
      }
    } catch (err) {
      error('Sync Error', err instanceof Error ? err.message : 'Unknown sync error')
    } finally {
      setLoading(false)
    }
  }

  const handleClearOfflineData = async () => {
    if (!window.confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      return
    }

    setLoading(true)
    
    try {
      const cleared = await clearOfflineData()
      
      if (cleared) {
        success('Data Cleared', 'All offline data has been cleared')
        setOfflinePortfolios([])
      } else {
        error('Clear Failed', 'Failed to clear offline data')
      }
    } catch (err) {
      error('Clear Error', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const simulateOffline = () => {
    if (navigator.onLine) {
      info('Offline Simulation', 'Use browser DevTools → Network tab → "Offline" to test offline mode')
    }
  }

  React.useEffect(() => {
    if (isInitialized) {
      loadOfflinePortfolios()
    }
  }, [isInitialized, loadOfflinePortfolios])

  const getConnectionIcon = () => isOnline ? '🌐' : '📱'
  const getConnectionColor = () => isOnline ? '#28a745' : '#ffc107'
  const getSyncIcon = () => isSyncing ? '🔄' : '⏸️'

  if (!isInitialized) {
    return (
      <div style={{ 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        margin: '20px',
        backgroundColor: '#fff3cd'
      }}>
        <h3>📱 Offline Support</h3>
        <p>Initializing offline storage...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>📱 Offline Support & Sync</h3>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2em', marginRight: '10px' }}>
              {getConnectionIcon()}
            </span>
            <strong style={{ color: getConnectionColor() }}>
              {isOnline ? 'Online' : 'Offline'}
            </strong>
            {isSyncing && (
              <span style={{ marginLeft: '10px', color: '#17a2b8' }}>
                {getSyncIcon()} Syncing...
              </span>
            )}
          </div>
          
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            Queue: {queueSize} items
          </div>
        </div>

        {lastSyncTime && (
          <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}

        {hasErrors && (
          <div style={{ 
            fontSize: '0.9em', 
            color: '#dc3545',
            padding: '8px',
            backgroundColor: '#ffe6e6',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            ❌ Sync errors: {syncErrors.join(', ')}
          </div>
        )}
      </div>

      <form onSubmit={handleCreateOfflinePortfolio} style={{ marginBottom: '20px' }}>
        <h4>🧪 Test Offline Portfolio Creation</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            placeholder="Offline Portfolio Name"
            style={{
              width: '70%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginRight: '10px'
            }}
            disabled={loading}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Create Offline'}
          </button>
        </div>
        
        <small style={{ color: '#666' }}>
          {isOnline ? 'Will sync to server automatically' : 'Will be stored locally until online'}
        </small>
      </form>

      <div style={{ marginBottom: '20px' }}>
        <h4>🎛️ Sync Controls</h4>
        
        <button
          onClick={handleSyncNow}
          disabled={!isOnline || loading || isSyncing}
          style={{
            padding: '10px 20px',
            backgroundColor: !isOnline || loading || isSyncing ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isOnline || loading || isSyncing ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        <button
          onClick={simulateOffline}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Offline Mode
        </button>

        <button
          onClick={handleClearOfflineData}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Clear Offline Data
        </button>
      </div>

      <div>
        <h4>📱 Offline Portfolios ({offlinePortfolios.length})</h4>
        {offlinePortfolios.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No offline portfolios found. Create one above to test offline functionality!
          </p>
        ) : (
          offlinePortfolios.map(portfolio => (
            <div
              key={portfolio.id}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '8px',
                backgroundColor: 'white',
                fontSize: '0.9em'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{portfolio.name}</div>
              <div style={{ color: '#666', fontSize: '0.8em' }}>
                {portfolio.description} | {portfolio.currency}
              </div>
              <div style={{ color: '#999', fontSize: '0.7em' }}>
                ID: {portfolio.id.startsWith('temp_') ? '🔄 Pending sync' : '✅ Synced'}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e6f3ff',
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <h5>💡 Offline Features</h5>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Create and modify data while offline</li>
          <li>Automatic sync when connection is restored</li>
          <li>Conflict resolution with server-wins strategy</li>
          <li>Sync queue with retry mechanism</li>
          <li>IndexedDB for reliable offline storage</li>
          <li>Real-time online/offline status detection</li>
        </ul>
      </div>
    </div>
  )
}

export default OfflineStatusComponent
