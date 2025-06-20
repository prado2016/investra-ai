/**
 * Real-time Connection Test Component
 * Test the fixes for the "Failed to fetch" error
 */

import React, { useEffect, useState } from 'react';
import { useRealtime } from '../hooks/useRealtime';
import { runRealtimeDiagnostics, logDiagnosticReport } from '../utils/realtimeDiagnostics';
import { runRealtimeConnectionFixTest } from '../utils/realtimeConnectionFixTest';

const RealtimeConnectionTest: React.FC = () => {
  const { isConnected, status, connect, reconnect } = useRealtime();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    try {
      const report = await runRealtimeDiagnostics();
      setDiagnostics(report);
      logDiagnosticReport(report);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const runComprehensiveTest = async () => {
    setTesting(true);
    try {
      console.log('🧪 Running comprehensive fix tests...');
      const results = await runRealtimeConnectionFixTest();
      setTestResults(results);
    } catch (error) {
      console.error('Comprehensive test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    console.log('🔌 Manual connection attempt...');
    await connect();
  };

  const handleReconnect = async () => {
    console.log('🔄 Manual reconnection attempt...');
    await reconnect();
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>Real-time Connection Test</h1>
      
      <div style={{
        padding: '16px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: isConnected ? '#e7f5e7' : '#fee'
      }}>
        <h3>Connection Status</h3>
        <p><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Error:</strong> {status.error || 'None'}</p>
        <p><strong>Reconnect Attempts:</strong> {status.reconnectAttempts}</p>
        <p><strong>Subscribed Tables:</strong> {status.subscribedTables.join(', ') || 'None'}</p>
        <p><strong>Last Heartbeat:</strong> {status.lastHeartbeat?.toLocaleTimeString() || 'None'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleConnect}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Connect
        </button>
        
        <button 
          onClick={handleReconnect}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reconnect
        </button>
        
        <button 
          onClick={runDiagnostics}
          disabled={testing}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {testing ? 'Running...' : 'Run Diagnostics'}
        </button>
        
        <button 
          onClick={runComprehensiveTest}
          disabled={testing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {testing ? 'Testing...' : 'Test All Fixes'}
        </button>
      </div>

      {testResults && (
        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f0f8ff',
          marginBottom: '20px'
        }}>
          <h3>Fix Test Results</h3>
          {testResults.map((result: any, index: number) => (
            <div key={index} style={{
              padding: '8px',
              margin: '4px 0',
              backgroundColor: result.passed ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.passed ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px'
            }}>
              <strong>{result.passed ? '✅' : '❌'} {result.testName}</strong>
              <br />
              <small>{result.message}</small>
            </div>
          ))}
        </div>
      )}

      {diagnostics && (
        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>Latest Diagnostics</h3>
          <pre style={{
            fontSize: '12px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#e8f4fd',
        borderRadius: '8px'
      }}>
        <h3>Debug Console Commands</h3>
        <p>Open the browser console and try these commands:</p>
        <ul>
          <li><code>window.debugRealtime()</code> - Run diagnostics</li>
          <li><code>window.testRealtimeFixes()</code> - Test all fixes</li>
          <li><code>realtimeService.getStatus()</code> - Get current status</li>
          <li><code>realtimeService.reconnect()</code> - Manual reconnect</li>
        </ul>
      </div>
    </div>
  );
};

export default RealtimeConnectionTest;
