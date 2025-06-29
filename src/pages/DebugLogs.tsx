import React from 'react';
// InlineLogViewer component was removed during cleanup
import { debug } from '../utils/debug';

const DebugLogsPage: React.FC = () => {
  const clearAllLogs = () => {
    debug.clearLogs();
    debug.info('All logs cleared by user', undefined, 'DebugPage');
  };

  const exportLogs = () => {
    const logs = debug.getLogs();
    const data = {
      timestamp: new Date().toISOString(),
      totalLogs: logs.length,
      logs: logs
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investra-debug-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🔍 Debug Logs</h1>
        <p>Real-time application logs and debugging information</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Application Logs</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary"
              onClick={clearAllLogs}
            >
              🗑️ Clear Logs
            </button>
            <button 
              className="btn btn-primary"
              onClick={exportLogs}
            >
              💾 Export Logs
            </button>
          </div>
        </div>

        <div className="card-content">
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            InlineLogViewer component was removed during cleanup. 
            Use browser dev tools console for debugging.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Debug Information</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Environment:
              </label>
              <span>{process.env.NODE_ENV}</span>
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Debug Mode:
              </label>
              <span>{typeof window !== 'undefined' && (window as any).__DEBUG__ ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                User Agent:
              </label>
              <span style={{ fontSize: '0.9em', wordBreak: 'break-all' }}>
                {navigator.userAgent}
              </span>
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                URL:
              </label>
              <span style={{ fontSize: '0.9em', wordBreak: 'break-all' }}>
                {window.location.href}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => debug.info('Test log message', { timestamp: new Date(), test: true }, 'DebugPage')}
            >
              📝 Test Log Message
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => debug.warn('Test warning message', { level: 'warning' }, 'DebugPage')}
            >
              ⚠️ Test Warning
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => debug.error('Test error message', new Error('Test error'), 'DebugPage')}
            >
              ❌ Test Error
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                for (let i = 0; i < 10; i++) {
                  debug.info(`Batch log message ${i + 1}`, { batchIndex: i }, 'DebugPage');
                }
              }}
            >
              📦 Generate Batch Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugLogsPage;
