          style={{
            padding: '10px 20px',
            backgroundColor: !isConnected ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          Disconnect
        </button>

        <button
          onClick={handleReconnect}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reconnect
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, marginRight: '15px' }}>🔄 Live Events ({eventHistory.length})</h4>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '5px 10px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9em'
            }}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {eventHistory.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            fontStyle: 'italic',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            No real-time events yet. Try creating a portfolio or transaction to see live updates!
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            maxHeight: showDetails ? '400px' : '150px',
            overflowY: 'auto'
          }}>
            {eventHistory.map((event, index) => (
              <div
                key={event.id}
                style={{
                  padding: '10px',
                  borderBottom: index < eventHistory.length - 1 ? '1px solid #eee' : 'none',
                  fontSize: '0.9em'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px' }}>
                      {getEventIcon(event.table, event.eventType)}
                    </span>
                    <strong>{event.table}</strong>
                    <span style={{ 
                      marginLeft: '8px',
                      padding: '2px 6px',
                      backgroundColor: event.eventType === 'INSERT' ? '#d4edda' : 
                                       event.eventType === 'UPDATE' ? '#fff3cd' : '#f8d7da',
                      color: event.eventType === 'INSERT' ? '#155724' : 
                             event.eventType === 'UPDATE' ? '#856404' : '#721c24',
                      borderRadius: '3px',
                      fontSize: '0.8em'
                    }}>
                      {event.eventType}
                    </span>
                  </div>
                  
                  <span style={{ color: '#666', fontSize: '0.8em' }}>
                    {formatTime(event.timestamp)}
                  </span>
                </div>

                {showDetails && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '3px',
                    fontSize: '0.8em'
                  }}>
                    {event.new && (
                      <div style={{ marginBottom: '5px' }}>
                        <strong>New:</strong> {JSON.stringify(event.new, null, 2).substring(0, 200)}
                        {JSON.stringify(event.new).length > 200 && '...'}
                      </div>
                    )}
                    {event.old && (
                      <div>
                        <strong>Old:</strong> {JSON.stringify(event.old, null, 2).substring(0, 200)}
                        {JSON.stringify(event.old).length > 200 && '...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e6f3ff',
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <h5>💡 Real-time Features</h5>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Live portfolio updates across all devices</li>
          <li>Real-time position and transaction synchronization</li>
          <li>Automatic reconnection with exponential backoff</li>
          <li>Connection health monitoring with heartbeat</li>
          <li>Event history tracking for debugging</li>
          <li>Secure user-specific data filtering</li>
        </ul>
      </div>
    </div>
  )
}

export default RealtimeStatusComponent
