/**
 * Connection Health Debug Component
 * Displays real-time connection status and performance metrics
 */

import React from 'react';
import styled from 'styled-components';
import { useConnectionHealth } from '../hooks/useConnectionHealth';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const HealthContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  max-width: 300px;
  font-size: 12px;
`;

const HealthHeader = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  
  color: ${({ status }) => {
    switch (status) {
      case 'healthy': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'critical': return 'var(--color-error)';
      default: return 'var(--text-muted)';
    }
  }};
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: var(--text-secondary);
`;

const ErrorList = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-secondary);
`;

const ErrorItem = styled.div`
  color: var(--color-error);
  font-size: 11px;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RefreshButton = styled.button`
  background: none;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  margin-top: 8px;
  
  &:hover {
    background: var(--bg-secondary);
  }
`;

interface Props {
  show?: boolean;
}

const ConnectionHealthDebug: React.FC<Props> = ({ show = process.env.NODE_ENV === 'development' }) => {
  const { health, refresh } = useConnectionHealth();

  if (!show) return null;

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle size={16} />;
      case 'warning':
        return <AlertCircle size={16} />;
      case 'critical':
        return <AlertCircle size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const formatDuration = (ms: number) => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSuccessRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <HealthContainer>
      <HealthHeader status={health.status}>
        {getStatusIcon()}
        Connection Health: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
      </HealthHeader>

      <MetricRow>
        <span>Operations:</span>
        <span>{health.metrics.totalOperations}</span>
      </MetricRow>

      <MetricRow>
        <span>Success Rate:</span>
        <span>{formatSuccessRate(health.metrics.successRate)}</span>
      </MetricRow>

      <MetricRow>
        <span>Avg Duration:</span>
        <span>{formatDuration(health.metrics.averageDuration)}</span>
      </MetricRow>

      <MetricRow>
        <span>Max Duration:</span>
        <span>{formatDuration(health.metrics.maxDuration)}</span>
      </MetricRow>

      <MetricRow>
        <span>Failures:</span>
        <span>{health.supabaseHealth.consecutiveFailures}</span>
      </MetricRow>

      {health.supabaseHealth.circuitBreakerOpen && (
        <MetricRow>
          <span style={{ color: 'var(--color-error)' }}>Circuit Breaker:</span>
          <span style={{ color: 'var(--color-error)' }}>OPEN</span>
        </MetricRow>
      )}

      {health.metrics.recentErrors.length > 0 && (
        <ErrorList>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Recent Errors:</div>
          {health.metrics.recentErrors.slice(0, 3).map((error, index) => (
            <ErrorItem key={index} title={error}>
              {error}
            </ErrorItem>
          ))}
        </ErrorList>
      )}

      <RefreshButton onClick={refresh}>
        <Clock size={12} style={{ marginRight: 4 }} />
        Refresh
      </RefreshButton>
    </HealthContainer>
  );
};

export default ConnectionHealthDebug;
