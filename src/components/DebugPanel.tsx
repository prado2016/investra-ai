import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { debug, ErrorTracker, PerformanceTracker, isDev, isDebug } from '../utils/debug';
import { useDebugSettings } from '../contexts/DebugContext';
import { Bug, X, Trash2, Download, Eye, EyeOff, Monitor } from 'lucide-react';
import InlineLogViewer from './InlineLogViewer';

const DebugPanelContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: ${props => props.$isOpen ? '400px' : '60px'};
  height: ${props => props.$isOpen ? '500px' : '60px'};
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #333;
  border-radius: 8px;
  z-index: 10000;
  transition: all 0.3s ease;
  overflow: hidden;
  backdrop-filter: blur(10px);
`;

const DebugHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
`;

const DebugToggle = styled.button`
  width: 60px;
  height: 60px;
  border: none;
  background: #ff6b35;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: #ff8c42;
    transform: scale(1.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const DebugContent = styled.div`
  height: calc(100% - 50px);
  overflow-y: auto;
  padding: 10px;
  color: #fff;
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #333;
  margin-bottom: 10px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 8px 12px;
  border: none;
  background: ${props => props.active ? '#333' : 'transparent'};
  color: ${props => props.active ? '#fff' : '#888'};
  cursor: pointer;
  font-size: 11px;
  border-radius: 4px 4px 0 0;
  
  &:hover {
    background: #333;
    color: #fff;
  }
`;

const LogEntryComponent: React.FC<{ level: string; children: React.ReactNode }> = ({ level, children }) => {
  const { settings } = useDebugSettings();
  
  return (
    <div 
      style={{
        padding: '4px 8px',
        margin: '2px 0',
        borderRadius: '4px',
        background: (() => {
          switch (level) {
            case 'error': return 'rgba(239, 68, 68, 0.2)';
            case 'warn': return 'rgba(245, 158, 11, 0.2)';
            case 'info': return 'rgba(59, 130, 246, 0.2)';
            case 'debug': return 'rgba(156, 163, 175, 0.2)';
            default: return 'rgba(75, 85, 99, 0.2)';
          }
        })(),
        borderLeft: `3px solid ${(() => {
          switch (level) {
            case 'error': return '#ef4444';
            case 'warn': return '#f59e0b';
            case 'info': return '#3b82f6';
            case 'debug': return '#9ca3af';
            default: return '#6b7280';
          }
        })()}`,
        fontSize: settings.largerLogText ? '13px' : '11px',
        lineHeight: 1.4
      }}
    >
      {children}
    </div>
  );
};

const LogEntry = styled.div<{ level: string }>`
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  background: ${props => {
    switch (props.level) {
      case 'error': return 'rgba(239, 68, 68, 0.2)';
      case 'warn': return 'rgba(245, 158, 11, 0.2)';
      case 'info': return 'rgba(59, 130, 246, 0.2)';
      case 'debug': return 'rgba(156, 163, 175, 0.2)';
      default: return 'rgba(75, 85, 99, 0.2)';
    }
  }};
  border-left: 3px solid ${props => {
    switch (props.level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'debug': return '#9ca3af';
      default: return '#6b7280';
    }
  }};
  font-size: 11px;
  line-height: 1.4;
`;

const LogTime = styled.span`
  color: #888;
  margin-right: 8px;
`;

const LogSource = styled.span`
  color: #60a5fa;
  margin-right: 8px;
  font-weight: 600;
`;

const LogMessage = styled.div`
  color: #fff;
  margin-bottom: 4px;
`;

const LogDataComponent: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <pre 
    style={{
      color: '#d1d5db',
      fontSize: '10px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      marginTop: '4px',
      padding: '4px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '2px',
      ...style
    }}
  >
    {children}
  </pre>
);

const ActionButton = styled.button`
  padding: 4px 8px;
  margin: 0 4px;
  border: none;
  background: #374151;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  
  &:hover {
    background: #4b5563;
  }
  
  svg {
    width: 12px;
    height: 12px;
    margin-right: 4px;
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
`;

const StatBox = styled.div`
  padding: 8px;
  background: rgba(75, 85, 99, 0.3);
  border-radius: 4px;
  text-align: center;
`;

const StatLabel = styled.div`
  color: #9ca3af;
  font-size: 10px;
  margin-bottom: 2px;
`;

const StatValue = styled.div`
  color: #fff;
  font-size: 14px;
  font-weight: 600;
`;

// Define proper types for the debug data
interface LogEntry {
  timestamp: Date;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  data?: unknown;
  source?: string;
}

interface ErrorEntry {
  id: string;
  timestamp: Date;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: unknown;
  userAgent?: string;
  url?: string;
  userId?: string;
}

interface MeasureEntry {
  name: string;
  duration: number;
  timestamp: Date;
}

interface DebugPanelProps {
  enabled?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ enabled = isDev || isDebug }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'browser' | 'errors' | 'performance'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [measures, setMeasures] = useState<MeasureEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setLogs(debug.getLogs().slice(-100)); // Keep last 100 logs
      setErrors(ErrorTracker.getErrors().slice(-50)); // Keep last 50 errors
      setMeasures(PerformanceTracker.getMeasures().slice(-30)); // Keep last 30 measures
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const handleClearLogs = () => {
    debug.clearLogs();
    setLogs([]);
  };

  const handleClearErrors = () => {
    ErrorTracker.clearErrors();
    setErrors([]);
  };

  const handleClearMeasures = () => {
    PerformanceTracker.clearMeasures();
    setMeasures([]);
  };

  const handleExportLogs = () => {
    const data = {
      logs: debug.getLogs(),
      errors: ErrorTracker.getErrors(),
      measures: PerformanceTracker.getMeasures(),
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString().split(' ')[0];
  };

  const safeStringify = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  if (!isOpen) {
    return (
      <DebugPanelContainer $isOpen={false}>
        <DebugToggle onClick={() => setIsOpen(true)}>
          <Bug />
        </DebugToggle>
      </DebugPanelContainer>
    );
  }

  return (
    <DebugPanelContainer $isOpen={true}>
      <DebugHeader>
        <span>🐛 Debug Panel</span>
        <div>
          <ActionButton 
            onClick={() => window.open('/browser-log-viewer.html', '_blank')} 
            title="Open standalone log viewer"
          >
            <Monitor />
          </ActionButton>
          <ActionButton onClick={() => setAutoScroll(!autoScroll)} title="Toggle auto-scroll">
            {autoScroll ? <Eye /> : <EyeOff />}
          </ActionButton>
          <ActionButton onClick={handleExportLogs} title="Export logs">
            <Download />
          </ActionButton>
          <ActionButton onClick={() => setIsOpen(false)} title="Close">
            <X />
          </ActionButton>
        </div>
      </DebugHeader>

      <DebugContent>
        <StatsContainer>
          <StatBox>
            <StatLabel>Total Logs</StatLabel>
            <StatValue>{logs.length}</StatValue>
          </StatBox>
          <StatBox>
            <StatLabel>Errors</StatLabel>
            <StatValue style={{ color: errors.length > 0 ? '#ef4444' : '#10b981' }}>
              {errors.length}
            </StatValue>
          </StatBox>
        </StatsContainer>

        <TabContainer>
          <Tab 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')}
          >
            Logs ({logs.length})
          </Tab>
          <Tab 
            active={activeTab === 'browser'} 
            onClick={() => setActiveTab('browser')}
          >
            Browser Console
          </Tab>
          <Tab 
            active={activeTab === 'errors'} 
            onClick={() => setActiveTab('errors')}
          >
            Errors ({errors.length})
          </Tab>
          <Tab 
            active={activeTab === 'performance'} 
            onClick={() => setActiveTab('performance')}
          >
            Performance ({measures.length})
          </Tab>
        </TabContainer>

        <div style={{ marginBottom: '10px' }}>
          {activeTab === 'logs' && (
            <ActionButton onClick={handleClearLogs}>
              <Trash2 />
              Clear Logs
            </ActionButton>
          )}
          {activeTab === 'browser' && (
            <ActionButton onClick={() => window.open('/browser-log-viewer.html', '_blank')}>
              <Monitor />
              Open Full Viewer
            </ActionButton>
          )}
          {activeTab === 'errors' && (
            <ActionButton onClick={handleClearErrors}>
              <Trash2 />
              Clear Errors
            </ActionButton>
          )}
          {activeTab === 'performance' && (
            <ActionButton onClick={handleClearMeasures}>
              <Trash2 />
              Clear Measures
            </ActionButton>
          )}
        </div>

        {activeTab === 'logs' && (
          <div>
            {logs.map((log, index) => (
              <LogEntryComponent key={index} level={log.level}>
                <LogTime>{formatTime(log.timestamp)}</LogTime>
                <LogSource>[{log.source || 'Unknown'}]</LogSource>
                <LogMessage>{log.message}</LogMessage>
                {log.data && typeof log.data !== 'undefined' ? (
                  <LogDataComponent>{String(safeStringify(log.data))}</LogDataComponent>
                ) : null}
              </LogEntryComponent>
            ))}
            {logs.length === 0 && (
              <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                No logs yet...
              </div>
            )}
          </div>
        )}

        {activeTab === 'browser' && (
          <div style={{ height: '320px', marginTop: '10px' }}>
            <InlineLogViewer 
              height="300px" 
              showControls={true}
              autoScroll={autoScroll}
              maxLogs={100}
            />
          </div>
        )}

        {activeTab === 'errors' && (
          <div>
            {errors.map((error, index) => (
              <LogEntryComponent key={index} level="error">
                <LogTime>{formatTime(error.timestamp)}</LogTime>
                <LogMessage>{error.error.message}</LogMessage>
                {error.error.stack && (
                  <LogDataComponent>{error.error.stack}</LogDataComponent>
                )}
                {error.context && typeof error.context !== 'undefined' ? (
                  <LogDataComponent>Context: {String(safeStringify(error.context))}</LogDataComponent>
                ) : null}
              </LogEntryComponent>
            ))}
            {errors.length === 0 && (
              <div style={{ color: '#10b981', textAlign: 'center', padding: '20px' }}>
                No errors! 🎉
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div>
            {measures.map((measure, index) => (
              <LogEntryComponent key={index} level="info">
                <LogTime>{formatTime(measure.timestamp)}</LogTime>
                <LogMessage>{measure.name}</LogMessage>
                <LogDataComponent style={{ 
                  color: measure.duration > 100 ? '#ef4444' : 
                         measure.duration > 50 ? '#f59e0b' : '#10b981' 
                }}>
                  {measure.duration.toFixed(2)}ms
                </LogDataComponent>
              </LogEntryComponent>
            ))}
            {measures.length === 0 && (
              <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                No performance measures yet...
              </div>
            )}
          </div>
        )}
      </DebugContent>
    </DebugPanelContainer>
  );
};

export default DebugPanel;
