import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { debug } from '../utils/debug';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  data?: unknown;
}

interface LogViewerProps {
  maxLogs?: number;
  height?: string;
  showControls?: boolean;
  autoScroll?: boolean;
}

export const InlineLogViewer: FC<LogViewerProps> = ({
  maxLogs = 500,
  height = '400px',
  showControls = true,
  autoScroll = true
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);
  const [filter, setFilter] = useState({
    level: 'all',
    source: 'all'
  });
  const [sources, setSources] = useState<string[]>(['all']);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial load of existing logs
    loadExistingLogs();

    // Set up polling for new logs
    const interval = setInterval(() => {
      if (isCapturing) {
        loadExistingLogs();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCapturing, maxLogs]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const loadExistingLogs = () => {
    try {
      const debugLogs = debug.getLogs();
      const formattedLogs = debugLogs
        .slice(-maxLogs)
        .map((log, index) => ({
          id: `${log.timestamp.getTime()}-${index}`,
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          source: log.source || 'App',
          data: log.data
        }));

      setLogs(formattedLogs);

      // Update sources list
      const uniqueSources = ['all', ...Array.from(new Set(formattedLogs.map(log => log.source)))];
      setSources(uniqueSources);
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter.level !== 'all') {
      const levelPriority = { debug: 0, log: 1, info: 2, warn: 3, error: 4 };
      const minPriority = levelPriority[filter.level as keyof typeof levelPriority];
      const logPriority = levelPriority[log.level];
      if (logPriority < minPriority) return false;
    }

    if (filter.source !== 'all' && log.source !== filter.source) {
      return false;
    }

    return true;
  });

  const clearLogs = () => {
    debug.clearLogs();
    setLogs([]);
  };

  const exportLogs = () => {
    const data = {
      timestamp: new Date().toISOString(),
      totalLogs: logs.length,
      filteredLogs: filteredLogs.length,
      filters: filter,
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#dc3545';
      case 'warn': return '#ffc107';
      case 'info': return '#17a2b8';
      case 'debug': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  };

  const formatData = (data: unknown): React.ReactNode => {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      background: 'white',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {showControls && (
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #ddd',
          background: '#f8f9fa',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setIsCapturing(!isCapturing)}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              background: isCapturing ? '#dc3545' : '#28a745',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {isCapturing ? '⏸️ Pause' : '▶️ Resume'}
          </button>

          <button
            onClick={clearLogs}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              background: '#6c757d',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗑️ Clear
          </button>

          <button
            onClick={exportLogs}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              background: '#007bff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            💾 Export
          </button>

          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
            style={{
              padding: '4px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings & Errors</option>
            <option value="info">Info & Above</option>
            <option value="debug">Debug & Above</option>
          </select>

          <select
            value={filter.source}
            onChange={(e) => setFilter({ ...filter, source: e.target.value })}
            style={{
              padding: '4px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {sources.map(source => (
              <option key={source} value={source}>
                {source === 'all' ? 'All Sources' : source}
              </option>
            ))}
          </select>

          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6c757d' }}>
            {filteredLogs.length} / {logs.length} logs
          </span>
        </div>
      )}

      <div
        ref={logContainerRef}
        style={{
          height,
          overflowY: 'auto',
          padding: '8px'
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            {logs.length === 0 ? 'No logs captured yet' : 'No logs match current filters'}
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              style={{
                marginBottom: '4px',
                padding: '6px 8px',
                borderLeft: `3px solid ${getLevelColor(log.level)}`,
                background: '#f8f9fa',
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#6c757d', minWidth: '80px' }}>
                  {formatTimestamp(log.timestamp)}
                </span>
                <span
                  style={{
                    background: getLevelColor(log.level),
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}
                >
                  {log.level}
                </span>
                <span
                  style={{
                    background: '#e9ecef',
                    color: '#495057',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}
                >
                  {log.source}
                </span>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>
                  {log.message}
                </span>
              </div>
              {log.data && (
                <div style={{
                  marginTop: '4px',
                  padding: '6px',
                  background: '#ffffff',
                  border: '1px solid #dee2e6',
                  borderRadius: '3px',
                  fontSize: '11px',
                  color: '#495057',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}>
                  {formatData(log.data) as React.ReactNode}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InlineLogViewer;
