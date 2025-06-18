/**
 * Real-time Email Processing Status Component
 * Shows live updates from WebSocket for email processing
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Play,
  Pause,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useEmailProcessingWebSocket } from '../hooks/useWebSocket';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background-color: ${props => props.$connected ? '#dcfce7' : '#fef2f2'};
  border: 1px solid ${props => props.$connected ? '#16a34a' : '#dc2626'};
  color: ${props => props.$connected ? '#15803d' : '#dc2626'};
  font-size: 0.875rem;
  font-weight: 500;

  [data-theme="dark"] & {
    background-color: ${props => props.$connected ? '#14532d' : '#7f1d1d'};
    border-color: ${props => props.$connected ? '#16a34a' : '#dc2626'};
    color: ${props => props.$connected ? '#22c55e' : '#ef4444'};
  }
`;

const MessageList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;

  [data-theme="dark"] & {
    border-color: #374151;
    background-color: #1f2937;
  }
`;

const MessageItem = styled.div<{ $type: string }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }

  [data-theme="dark"] & {
    border-bottom-color: #374151;
  }
`;

const MessageIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.125rem;
  
  ${props => {
    switch (props.$type) {
      case 'email_processing_started':
        return `
          background-color: #dbeafe;
          color: #2563eb;
          [data-theme="dark"] & {
            background-color: #1e3a8a;
            color: #60a5fa;
          }
        `;
      case 'email_processing_completed':
        return `
          background-color: #dcfce7;
          color: #16a34a;
          [data-theme="dark"] & {
            background-color: #14532d;
            color: #22c55e;
          }
        `;
      case 'email_processing_failed':
        return `
          background-color: #fef2f2;
          color: #dc2626;
          [data-theme="dark"] & {
            background-color: #7f1d1d;
            color: #ef4444;
          }
        `;
      case 'connection_test':
        return `
          background-color: #fef3c7;
          color: #d97706;
          [data-theme="dark"] & {
            background-color: #92400e;
            color: #fbbf24;
          }
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #6b7280;
          [data-theme="dark"] & {
            background-color: #374151;
            color: #9ca3af;
          }
        `;
    }
  }}
`;

const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const MessageTitle = styled.div`
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;

  [data-theme="dark"] & {
    color: #f9fafb;
  }
`;

const MessageDetails = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #6b7280;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatCard = styled.div`
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #ffffff;
  text-align: center;

  [data-theme="dark"] & {
    border-color: #374151;
    background-color: #1f2937;
  }
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f9fafb;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const RealTimeEmailStatus: React.FC = () => {
  const {
    connected,
    connecting,
    error,
    emailProcessingMessages,
    latestProcessingStatus,
    isProcessing,
    connect,
    disconnect,
    clearMessages,
    reconnectCount
  } = useEmailProcessingWebSocket();

  const [isExpanded, setIsExpanded] = useState(true);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'email_processing_started':
        return <Clock size={14} />;
      case 'email_processing_completed':
        return <CheckCircle size={14} />;
      case 'email_processing_failed':
        return <XCircle size={14} />;
      case 'connection_test':
        return <Activity size={14} />;
      default:
        return <Activity size={14} />;
    }
  };

  const getMessageTitle = (message: any) => {
    switch (message.type) {
      case 'email_processing_started':
        return 'Email Processing Started';
      case 'email_processing_completed':
        return 'Email Processing Completed';
      case 'email_processing_failed':
        return 'Email Processing Failed';
      case 'connection_test':
        return message.data.status === 'testing' ? 'Connection Test Started' : 'Connection Test Completed';
      case 'system_status':
        return 'System Status Update';
      default:
        return 'System Message';
    }
  };

  const getMessageDetails = (message: any) => {
    switch (message.type) {
      case 'email_processing_started':
        return `Processing: ${message.data.subject || 'Unknown subject'}`;
      case 'email_processing_completed':
        return `Successfully processed email. Transaction created: ${message.data.result?.extractedData?.transactions?.[0]?.symbol || 'N/A'}`;
      case 'email_processing_failed':
        return `Error: ${message.data.error || 'Unknown error'}`;
      case 'connection_test':
        return message.data.status === 'testing' 
          ? `Testing connection to ${message.data.host}:${message.data.port}`
          : `Connection test ${message.data.result?.success ? 'passed' : 'failed'}`;
      case 'system_status':
        return message.data.message || 'System status update';
      default:
        return 'System message received';
    }
  };

  const completedCount = emailProcessingMessages.filter(m => m.type === 'email_processing_completed').length;
  const failedCount = emailProcessingMessages.filter(m => m.type === 'email_processing_failed').length;
  const testCount = emailProcessingMessages.filter(m => m.type === 'connection_test').length;

  return (
    <Card>
      <StatusContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Real-time Processing Status
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        <ConnectionStatus $connected={connected && !connecting}>
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          {connecting ? (
            'Connecting to real-time updates...'
          ) : connected ? (
            'Connected - Real-time updates active'
          ) : error ? (
            `Connection error: ${error}`
          ) : (
            'Disconnected from real-time updates'
          )}
          {reconnectCount > 0 && ` (Reconnect attempts: ${reconnectCount})`}
        </ConnectionStatus>

        {isExpanded && (
          <>
            <StatsRow>
              <StatCard>
                <StatValue>{emailProcessingMessages.length}</StatValue>
                <StatLabel>Total Messages</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{completedCount}</StatValue>
                <StatLabel>Completed</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{failedCount}</StatValue>
                <StatLabel>Failed</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{testCount}</StatValue>
                <StatLabel>Tests</StatLabel>
              </StatCard>
            </StatsRow>

            <ControlsRow>
              <Button
                variant="outline"
                size="sm"
                onClick={connected ? disconnect : connect}
                disabled={connecting}
              >
                {connecting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : connected ? (
                  <Pause size={14} />
                ) : (
                  <Play size={14} />
                )}
                {connecting ? 'Connecting...' : connected ? 'Disconnect' : 'Connect'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearMessages}
                disabled={emailProcessingMessages.length === 0}
              >
                <Trash2 size={14} />
                Clear Messages
              </Button>
            </ControlsRow>

            {emailProcessingMessages.length > 0 ? (
              <MessageList>
                {emailProcessingMessages.map((message, index) => (
                  <MessageItem key={`${message.id}-${index}`} $type={message.type}>
                    <MessageIcon $type={message.type}>
                      {getMessageIcon(message.type)}
                    </MessageIcon>
                    <MessageContent>
                      <MessageTitle>{getMessageTitle(message)}</MessageTitle>
                      <MessageDetails>{getMessageDetails(message)}</MessageDetails>
                      <MessageTime>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </MessageTime>
                    </MessageContent>
                  </MessageItem>
                ))}
              </MessageList>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                No real-time messages yet. Process an email to see live updates.
              </div>
            )}
          </>
        )}
      </StatusContainer>
    </Card>
  );
};

export default RealTimeEmailStatus;
