/**
 * API Monitoring Dashboard
 * Comprehensive monitoring for API calls, rate limits, and circuit breakers
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { enhancedSupabase } from '../lib/enhancedSupabase';
import { emergencyStop } from '../utils/emergencyStop';
import { requestDebouncer } from '../utils/requestDebouncer';
import { performanceMonitor } from '../utils/performanceMonitor';

const DashboardContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  max-height: 80vh;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 16px;
  font-size: 11px;
  z-index: 1002;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
`;

const Section = styled.div`
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-secondary);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: bold;
  color: var(--text-primary);
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 10px;
`;

const StatusValue = styled.span<{ status?: 'good' | 'warning' | 'error' }>`
  color: ${({ status }) => {
    switch (status) {
      case 'good': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'error': return 'var(--color-error)';
      default: return 'var(--text-secondary)';
    }
  }};
  font-weight: 500;
`;

const ActionButton = styled.button`
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 10px;
  cursor: pointer;
  margin-right: 4px;
  margin-bottom: 4px;
  
  &:hover {
    opacity: 0.8;
  }
  
  &.danger {
    background: var(--color-error);
  }
  
  &.warning {
    background: var(--color-warning);
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: 1px solid var(--border-primary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface Props {
  show?: boolean;
}

const ApiMonitoringDashboard: React.FC<Props> = ({ show = process.env.NODE_ENV === 'development' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [metrics, setMetrics] = useState({
    circuitBreaker: { isHealthy: true, consecutiveFailures: 0, circuitBreakerOpen: false },
    rateLimits: { portfolio: 0, transaction: 0 },
    emergencyStatus: { isActive: false, reason: '' },
    pendingRequests: 0,
    performance: { totalOperations: 0, successRate: 1, averageDuration: 0 }
  });

  useEffect(() => {
    if (!show) return;

    const updateMetrics = () => {
      const circuitBreaker = enhancedSupabase.getHealthStatus();
      const emergencyStatus = emergencyStop.getStatus();
      const pendingRequests = requestDebouncer.getPendingCount();
      const performance = performanceMonitor.getOverallSummary(5 * 60 * 1000); // Last 5 minutes

      setMetrics({
        circuitBreaker,
        rateLimits: {
          portfolio: 0, // Rate limiters don't expose current counts
          transaction: 0
        },
        emergencyStatus,
        pendingRequests,
        performance
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  if (isCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '8px',
        cursor: 'pointer',
        zIndex: 1002
      }} onClick={() => setIsCollapsed(false)}>
        📊 API Monitor
      </div>
    );
  }

  const handleEmergencyStop = () => {
    if (metrics.emergencyStatus.isActive) {
      emergencyStop.deactivate();
    } else {
      emergencyStop.activate('Manual activation from dashboard');
    }
  };

  const handleResetCircuitBreaker = () => {
    enhancedSupabase.resetCircuitBreaker();
  };

  const handleClearDebouncer = () => {
    requestDebouncer.clearAll();
  };

  return (
    <DashboardContainer>
      <ToggleButton onClick={() => setIsCollapsed(true)}>
        ×
      </ToggleButton>
      
      <SectionTitle>🔍 API Monitoring Dashboard</SectionTitle>

      <Section>
        <SectionTitle>Circuit Breaker</SectionTitle>
        <StatusRow>
          <span>Status:</span>
          <StatusValue status={metrics.circuitBreaker.circuitBreakerOpen ? 'error' : 'good'}>
            {metrics.circuitBreaker.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}
          </StatusValue>
        </StatusRow>
        <StatusRow>
          <span>Consecutive Failures:</span>
          <StatusValue status={metrics.circuitBreaker.consecutiveFailures > 3 ? 'warning' : 'good'}>
            {metrics.circuitBreaker.consecutiveFailures}
          </StatusValue>
        </StatusRow>
        <ActionButton onClick={handleResetCircuitBreaker}>
          Reset Circuit Breaker
        </ActionButton>
      </Section>

      <Section>
        <SectionTitle>Emergency Stop</SectionTitle>
        <StatusRow>
          <span>Status:</span>
          <StatusValue status={metrics.emergencyStatus.isActive ? 'error' : 'good'}>
            {metrics.emergencyStatus.isActive ? 'ACTIVE' : 'INACTIVE'}
          </StatusValue>
        </StatusRow>
        {metrics.emergencyStatus.isActive && (
          <StatusRow>
            <span>Reason:</span>
            <StatusValue>{metrics.emergencyStatus.reason}</StatusValue>
          </StatusRow>
        )}
        <ActionButton 
          className={metrics.emergencyStatus.isActive ? 'warning' : 'danger'}
          onClick={handleEmergencyStop}
        >
          {metrics.emergencyStatus.isActive ? 'Deactivate' : 'Emergency Stop'}
        </ActionButton>
      </Section>

      <Section>
        <SectionTitle>Request Status</SectionTitle>
        <StatusRow>
          <span>Pending Requests:</span>
          <StatusValue status={metrics.pendingRequests > 5 ? 'warning' : 'good'}>
            {metrics.pendingRequests}
          </StatusValue>
        </StatusRow>
        <ActionButton onClick={handleClearDebouncer}>
          Clear Debouncer
        </ActionButton>
      </Section>

      <Section>
        <SectionTitle>Performance (5min)</SectionTitle>
        <StatusRow>
          <span>Total Operations:</span>
          <StatusValue>{metrics.performance.totalOperations}</StatusValue>
        </StatusRow>
        <StatusRow>
          <span>Success Rate:</span>
          <StatusValue status={metrics.performance.successRate < 0.8 ? 'error' : 'good'}>
            {(metrics.performance.successRate * 100).toFixed(1)}%
          </StatusValue>
        </StatusRow>
        <StatusRow>
          <span>Avg Duration:</span>
          <StatusValue status={metrics.performance.averageDuration > 3000 ? 'warning' : 'good'}>
            {Math.round(metrics.performance.averageDuration)}ms
          </StatusValue>
        </StatusRow>
      </Section>

      <Section>
        <SectionTitle>Quick Actions</SectionTitle>
        <ActionButton onClick={() => window.location.reload()}>
          Reload Page
        </ActionButton>
        <ActionButton onClick={() => {
          handleResetCircuitBreaker();
          requestDebouncer.clearAll();
          if (metrics.emergencyStatus.isActive) emergencyStop.deactivate();
        }}>
          Reset All
        </ActionButton>
      </Section>
    </DashboardContainer>
  );
};

export default ApiMonitoringDashboard;
