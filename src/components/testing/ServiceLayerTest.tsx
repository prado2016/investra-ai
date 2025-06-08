            <div>
              {getStatusIcon(results.assetService)} Asset Service: {getStatusText(results.assetService)}
            </div>
            <div>
              {getStatusIcon(results.positionService)} Position Service: {getStatusText(results.positionService)}
            </div>
            <div>
              {getStatusIcon(results.transactionService)} Transaction Service: {getStatusText(results.transactionService)}
            </div>
          </div>

          {results.error && (
            <div style={{ 
              color: 'red', 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#ffe6e6',
              borderRadius: '4px'
            }}>
              <strong>Error:</strong> {results.error}
            </div>
          )}

          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: results.assetService ? '#e6ffe6' : '#ffe6e6',
            borderRadius: '4px'
          }}>
            {results.assetService ? (
              <span>🎉 <strong>SUCCESS!</strong> Service layer is connected to Supabase!</span>
            ) : (
              <span>⚠️ <strong>ISSUE:</strong> Some services failed. Check console for details.</span>
            )}
          </div>

          <button 
            onClick={runTests}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Run Tests Again'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ServiceLayerTest
