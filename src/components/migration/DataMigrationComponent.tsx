import React, { useState, useEffect, useCallback } from 'react'
import { dataMigrationService } from '../../services/dataMigrationService'
import type { MigrationStatus, MigrationSummary } from '../../services/dataMigrationService'
import { useNotifications } from '../../contexts/NotificationContext'

const DataMigrationComponent: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>(dataMigrationService.getStatus())
  const [analysis, setAnalysis] = useState<{
    portfolios: number
    positions: number
    transactions: number
    hasData: boolean
    estimatedTime: number
  } | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const { success, error, warning, info } = useNotifications()

  useEffect(() => {
    // Subscribe to migration status updates
    const unsubscribe = dataMigrationService.onStatusUpdate(setMigrationStatus)
    
    // Initial analysis
    analyzeData()
    
    return unsubscribe
  }, [analyzeData])

  const analyzeData = useCallback(async () => {
    try {
      const result = await dataMigrationService.analyzeLocalData()
      setAnalysis(result)
      
      if (!result.hasData) {
        info('No Data Found', 'No data found in localStorage to migrate')
      }
    } catch (err) {
      error('Analysis Failed', err instanceof Error ? err.message : 'Failed to analyze localStorage data')
    }
  }, [])

  const startMigration = async () => {
    try {
      info('Migration Started', 'Data migration has begun. Please do not close this tab.')
      
      const summary = await dataMigrationService.migrateData()
      
      success(
        'Migration Complete!', 
        `Successfully migrated ${summary.portfoliosMigrated} portfolios, ${summary.positionsMigrated} positions, and ${summary.transactionsMigrated} transactions`
      )

      if (summary.totalErrors > 0) {
        warning('Migration Warnings', `${summary.totalErrors} items had errors during migration. Check details below.`)
      }
    } catch (err) {
      error('Migration Failed', err instanceof Error ? err.message : 'Migration encountered an error')
    }
  }

  const clearLocalStorage = async () => {
    if (!window.confirm('Are you sure you want to clear all localStorage data? This cannot be undone.')) {
      return
    }

    try {
      const cleared = await dataMigrationService.clearLocalStorageData()
      if (cleared) {
        success('Data Cleared', 'Successfully cleared localStorage data')
        await analyzeData() // Refresh analysis
      } else {
        error('Clear Failed', 'Failed to clear localStorage data')
      }
    } catch (err) {
      error('Clear Error', err instanceof Error ? err.message : 'Error clearing data')
    }
  }

  const resetMigration = () => {
    dataMigrationService.reset()
    analyzeData()
  }

  const getProgressBarColor = () => {
    if (migrationStatus.stage === 'error') return '#dc3545'
    if (migrationStatus.stage === 'completed') return '#28a745'
    return '#007bff'
  }

  const getStatusIcon = () => {
    switch (migrationStatus.stage) {
      case 'idle': return '⏳'
      case 'analyzing': return '🔍'
      case 'migrating': return '🚀'
      case 'completed': return '✅'
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>📦 Data Migration Tool</h3>
      <p>Migrate your data from localStorage to Supabase database</p>

      {analysis && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: analysis.hasData ? '#e6f3ff' : '#fff3cd',
          border: `1px solid ${analysis.hasData ? '#0066cc' : '#ffc107'}`,
          borderRadius: '4px'
        }}>
          <h4>📊 Data Analysis</h4>
          {analysis.hasData ? (
            <div>
              <p><strong>Found in localStorage:</strong></p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>📁 <strong>{analysis.portfolios}</strong> portfolios</li>
                <li>📈 <strong>{analysis.positions}</strong> positions</li>
                <li>💰 <strong>{analysis.transactions}</strong> transactions</li>
              </ul>
              <p><small>Estimated migration time: ~{Math.round(analysis.estimatedTime)} seconds</small></p>
            </div>
          ) : (
            <p>No data found in localStorage. Nothing to migrate.</p>
          )}
        </div>
      )}

      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '1.2em', marginRight: '10px' }}>{getStatusIcon()}</span>
          <strong>Status: {migrationStatus.currentStep}</strong>
        </div>

        {migrationStatus.stage !== 'idle' && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ 
              width: '100%', 
              backgroundColor: '#e9ecef', 
              borderRadius: '4px',
              height: '20px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${migrationStatus.progress}%`,
                backgroundColor: getProgressBarColor(),
                height: '100%',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <small style={{ color: '#666' }}>
              {migrationStatus.progress.toFixed(1)}% complete
            </small>
          </div>
        )}

        {migrationStatus.summary && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#e6ffe6',
            borderRadius: '4px'
          }}>
            <h5>📋 Migration Summary</h5>
            <div style={{ fontSize: '0.9em' }}>
              <p>✅ Portfolios: {migrationStatus.summary.portfoliosMigrated}/{migrationStatus.summary.portfoliosFound}</p>
              <p>✅ Positions: {migrationStatus.summary.positionsMigrated}/{migrationStatus.summary.positionsFound}</p>
              <p>✅ Transactions: {migrationStatus.summary.transactionsMigrated}/{migrationStatus.summary.transactionsFound}</p>
              <p>🆕 Assets Created: {migrationStatus.summary.assetsCreated}</p>
              <p>⏱️ Migration Time: {(migrationStatus.summary.migrationTime / 1000).toFixed(1)} seconds</p>
              {migrationStatus.summary.totalErrors > 0 && (
                <p style={{ color: '#dc3545' }}>❌ Errors: {migrationStatus.summary.totalErrors}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4>🚀 Actions</h4>
        
        <button
          onClick={startMigration}
          disabled={!analysis?.hasData || migrationStatus.stage === 'migrating'}
          style={{
            padding: '12px 24px',
            backgroundColor: analysis?.hasData && migrationStatus.stage !== 'migrating' ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: analysis?.hasData && migrationStatus.stage !== 'migrating' ? 'pointer' : 'not-allowed',
            marginRight: '10px',
            fontSize: '1em',
            fontWeight: 'bold'
          }}
        >
          {migrationStatus.stage === 'migrating' ? 'Migrating...' : 'Start Migration'}
        </button>

        <button
          onClick={resetMigration}
          disabled={migrationStatus.stage === 'migrating'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: migrationStatus.stage === 'migrating' ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          Reset
        </button>

        <button
          onClick={clearLocalStorage}
          disabled={migrationStatus.stage === 'migrating' || !analysis?.hasData}
          style={{
            padding: '12px 24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: migrationStatus.stage === 'migrating' || !analysis?.hasData ? 'not-allowed' : 'pointer'
          }}
        >
          Clear localStorage
        </button>
      </div>

      {(migrationStatus.errors.length > 0 || migrationStatus.warnings.length > 0) && (
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            {showDetails ? 'Hide' : 'Show'} Details ({migrationStatus.errors.length + migrationStatus.warnings.length})
          </button>

          {showDetails && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {migrationStatus.errors.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <h5 style={{ color: '#dc3545' }}>❌ Errors:</h5>
                  {migrationStatus.errors.map((err, index) => (
                    <p key={index} style={{ color: '#dc3545', fontSize: '0.9em', margin: '5px 0' }}>
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {migrationStatus.warnings.length > 0 && (
                <div>
                  <h5 style={{ color: '#ffc107' }}>⚠️ Warnings:</h5>
                  {migrationStatus.warnings.map((warn, index) => (
                    <p key={index} style={{ color: '#856404', fontSize: '0.9em', margin: '5px 0' }}>
                      • {warn}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e6f3ff',
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <h5>💡 Migration Information</h5>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>This tool migrates data from your browser's localStorage to Supabase</li>
          <li>You must be signed in to migrate data</li>
          <li>All data will be associated with your user account</li>
          <li>Migration is safe - your localStorage data won't be deleted unless you choose to clear it</li>
          <li>You can run the migration multiple times safely</li>
        </ul>
      </div>
    </div>
  )
}

export default DataMigrationComponent
