/**
 * Email Processing Status Display Component
 * Task 9.1: Create email processing status display
 * Real-time dashboard showing IMAP service status and email processing metrics
 */

import React from 'react';
import styled from 'styled-components';
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Activity,
  TrendingUp,
  AlertTriangle,
  Zap,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useEmailProcessing } from '../hooks/useEmailProcessing';
import type { 
  EmailProcessingStats, 
  IMAPServiceStatus
} from '../services/emailApiService';

// Remove local interface definitions since they're now imported from the hook
// The interfaces are now defined in the emailApiService

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1.5rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 1rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: space-between;
    width: 100%;
  }
`;

const ServiceStatusCard = styled(Card)<{ $status: string }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'running': return '#10b981';
      case 'error': return '#f87171';
      case 'starting': case 'reconnecting': return '#f59e0b';
      case 'stopped': return '#6b7280';
      default: return '#d1d5db';
    }
  }};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }
`;

const ServiceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ServiceTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatusIndicator = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'running':
        return `
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `;
      case 'error':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'starting':
      case 'reconnecting':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'stopped':
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'running':
          return `
            background: #064e3b;
            color: #a7f3d0;
            border-color: #065f46;
          `;
        case 'error':
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
        case 'starting':
        case 'reconnecting':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'stopped':
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
          `;
        default:
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
          `;
      }
    }}
  }
`;

const ServiceControls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const StatTitle = styled.h3`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const StatIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${props => props.$color};
  border-radius: 8px;
  color: white;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.$positive ? '#059669' : '#dc2626'};

  [data-theme="dark"] & {
    color: ${props => props.$positive ? '#10b981' : '#f87171'};
  }
`;

const QueueContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const QueueHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const QueueTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const QueueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const QueueItem = styled(Card)`
  padding: 1.25rem;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
  }
`;

const QueueItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const QueueItemTitle = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const QueueItemStatus = styled(StatusIndicator)`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;

  [data-theme="dark"] & {
    background: #374151;
  }
`;

const ProgressFill = styled.div<{ $percentage: number }>`
  width: ${props => props.$percentage}%;
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
`;

const StagesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  font-size: 0.75rem;
`;

const Stage = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${props => {
    switch (props.$status) {
      case 'completed': return '#059669';
      case 'failed': return '#dc2626';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$status) {
        case 'completed': return '#10b981';
        case 'failed': return '#f87171';
        case 'pending': return '#9ca3af';
        default: return '#9ca3af';
      }
    }};
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  [data-theme="dark"] & {
    border-color: #4b5563;
    color: #9ca3af;

    &:hover {
      background: #374151;
      border-color: #6b7280;
    }
  }
`;

interface EmailProcessingStatusDisplayProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const EmailProcessingStatusDisplay: React.FC<EmailProcessingStatusDisplayProps> = ({
  className,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  // Use the email processing hook instead of local state and mock data
  const {
    loading,
    lastRefresh,
    processingStats,
    imapStatus,
    processingQueue,
    refreshData,
    startService,
    stopService,
    restartService,
    processNow
  } = useEmailProcessing(autoRefresh, refreshInterval);

  // Handle null values with default fallbacks
  const safeImapStatus: IMAPServiceStatus = imapStatus || {
    status: 'stopped',
    healthy: false,
    uptime: 0,
    startedAt: undefined
  };

  const safeProcessingStats: EmailProcessingStats = processingStats || {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    duplicates: 0,
    reviewRequired: 0,
    averageProcessingTime: 0
  };

  // Handle service actions
  const handleServiceAction = async (action: 'start' | 'stop' | 'restart') => {
    switch (action) {
      case 'start':
        await startService();
        break;
      case 'stop':
        await stopService();
        break;
      case 'restart':
        await restartService();
        break;
    }
  };

  // Handle manual processing
  const handleProcessNow = async () => {
    await processNow();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle size={16} />;
      case 'error': return <AlertCircle size={16} />;
      case 'starting': case 'reconnecting': return <Clock size={16} />;
      case 'stopped': return <WifiOff size={16} />;
      default: return <Wifi size={16} />;
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={12} />;
      case 'failed': return <AlertCircle size={12} />;
      case 'pending': return <Clock size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <DashboardContainer className={className}>
      <Header>
        <HeaderLeft>
          <Title>
            <Mail size={32} />
            Email Processing Status
          </Title>
          <Subtitle>
            Monitor IMAP service health and email processing metrics
          </Subtitle>
        </HeaderLeft>
        <HeaderRight>
          <RefreshButton
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </RefreshButton>
          <Button
            variant="outline"
            onClick={handleProcessNow}
            disabled={loading || safeImapStatus.status !== 'running'}
          >
            <Zap size={16} />
            Process Now
          </Button>
        </HeaderRight>
      </Header>

      <ServiceStatusCard $status={safeImapStatus.status}>
        <ServiceHeader>
          <ServiceTitle>
            <Server size={20} />
            IMAP Email Service
          </ServiceTitle>
          <StatusIndicator $status={safeImapStatus.status}>
            {getStatusIcon(safeImapStatus.status)}
            {safeImapStatus.status.charAt(0).toUpperCase() + safeImapStatus.status.slice(1)}
          </StatusIndicator>
        </ServiceHeader>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Uptime</div>
            <div style={{ fontWeight: '600' }}>{formatUptime(safeImapStatus.uptime)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Health</div>
            <div style={{ fontWeight: '600', color: safeImapStatus.healthy ? '#059669' : '#dc2626' }}>
              {safeImapStatus.healthy ? 'Healthy' : 'Unhealthy'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Started</div>
            <div style={{ fontWeight: '600' }}>
              {safeImapStatus.startedAt ? new Date(safeImapStatus.startedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        <ServiceControls>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleServiceAction('start')}
            disabled={loading || safeImapStatus.status === 'running'}
          >
            <Play size={14} />
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleServiceAction('stop')}
            disabled={loading || safeImapStatus.status === 'stopped'}
          >
            <Pause size={14} />
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleServiceAction('restart')}
            disabled={loading}
          >
            <RotateCcw size={14} />
            Restart
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            disabled={loading}
          >
            <Settings size={14} />
            Configure
          </Button>
        </ServiceControls>
      </ServiceStatusCard>

      <StatsGrid>
        <StatCard>
          <StatHeader>
            <StatTitle>Total Processed</StatTitle>
            <StatIcon $color="#3b82f6">
              <Mail size={16} />
            </StatIcon>
          </StatHeader>
          <StatValue>{safeProcessingStats.totalProcessed}</StatValue>
          <StatChange $positive={true}>
            <TrendingUp size={14} />
            +12 this hour
          </StatChange>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>Success Rate</StatTitle>
            <StatIcon $color="#10b981">
              <CheckCircle size={16} />
            </StatIcon>
          </StatHeader>
          <StatValue>
            {safeProcessingStats.totalProcessed > 0 
              ? Math.round((safeProcessingStats.successful / safeProcessingStats.totalProcessed) * 100)
              : 0}%
          </StatValue>
          <StatChange $positive={true}>
            <TrendingUp size={14} />
            +2.1% this week
          </StatChange>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>Failed Imports</StatTitle>
            <StatIcon $color="#f87171">
              <AlertTriangle size={16} />
            </StatIcon>
          </StatHeader>
          <StatValue>{safeProcessingStats.failed}</StatValue>
          <StatChange $positive={false}>
            <AlertCircle size={14} />
            Needs attention
          </StatChange>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>Avg. Processing Time</StatTitle>
            <StatIcon $color="#8b5cf6">
              <Activity size={16} />
            </StatIcon>
          </StatHeader>
          <StatValue>{(safeProcessingStats.averageProcessingTime / 1000).toFixed(1)}s</StatValue>
          <StatChange $positive={true}>
            <TrendingUp size={14} />
            -0.3s improvement
          </StatChange>
        </StatCard>
      </StatsGrid>

      <QueueContainer>
        <QueueHeader>
          <QueueTitle>
            <Activity size={20} />
            Processing Queue ({processingQueue.length})
          </QueueTitle>
          <RefreshButton
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Refresh Queue
          </RefreshButton>
        </QueueHeader>

        <QueueList>
          {processingQueue.length === 0 ? (
            <Card style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              No emails currently in processing queue
            </Card>
          ) : (
            processingQueue.map((item) => (
              <QueueItem key={item.id}>
                <QueueItemHeader>
                  <QueueItemTitle>{item.emailSubject}</QueueItemTitle>
                  <QueueItemStatus $status={item.status}>
                    {getStatusIcon(item.status)}
                    {item.status.replace('-', ' ').toUpperCase()}
                  </QueueItemStatus>
                </QueueItemHeader>
                
                <ProgressBar>
                  <ProgressFill $percentage={item.progress.percentage} />
                </ProgressBar>
                
                <StagesList>
                  <Stage $status={item.stages.parsing}>
                    {getStageIcon(item.stages.parsing)}
                    Parsing
                  </Stage>
                  <Stage $status={item.stages.duplicateCheck}>
                    {getStageIcon(item.stages.duplicateCheck)}
                    Duplicate Check
                  </Stage>
                  <Stage $status={item.stages.symbolProcessing}>
                    {getStageIcon(item.stages.symbolProcessing)}
                    Symbol Processing
                  </Stage>
                  <Stage $status={item.stages.transactionCreation}>
                    {getStageIcon(item.stages.transactionCreation)}
                    Transaction Creation
                  </Stage>
                </StagesList>

                {item.errors.length > 0 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '4px', fontSize: '0.75rem', color: '#dc2626' }}>
                    <strong>Errors:</strong> {item.errors.join(', ')}
                  </div>
                )}
              </QueueItem>
            ))
          )}
        </QueueList>
      </QueueContainer>

      <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
        Last refreshed: {lastRefresh.toLocaleString()}
        {autoRefresh && ` • Auto-refresh every ${refreshInterval / 1000}s`}
      </div>
    </DashboardContainer>
  );
};

export default EmailProcessingStatusDisplay;