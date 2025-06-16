/**
 * Failed Processing Alerts Component
 * Task 10.2: Build failed processing alert system
 * Comprehensive alert system for failed email import processing with escalation and resolution tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  AlertTriangle,
  AlertCircle,
  Zap,
  Clock,
  TrendingUp,
  X,
  Bell,
  BellOff,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Eye,
  ExternalLink,
  Mail,
  Server,
  Wifi,
  Database,
  Bug,
  Network,
  FileX,
  Shield,
  Users,
  MessageSquare,
  CheckCircle,
  Archive,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatting';

interface FailedProcessingAlert {
  id: string;
  alertType: 'import_failure' | 'system_error' | 'service_down' | 'rate_limit' | 'security_issue' | 'data_corruption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  firstOccurred: string;
  lastOccurred: string;
  occurrenceCount: number;
  status: 'active' | 'investigating' | 'resolved' | 'suppressed';
  source: {
    component: 'imap_service' | 'email_parser' | 'ai_processor' | 'database' | 'api_gateway' | 'symbol_lookup';
    service: string;
    location?: string;
  };
  affectedItems: {
    emails: string[];
    portfolios: string[];
    users?: string[];
  };
  errorDetails: {
    errorCode?: string;
    errorMessage: string;
    stackTrace?: string;
    requestId?: string;
    context?: Record<string, unknown>;
  };
  metrics: {
    failureRate: number;
    affectedEmails: number;
    estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
    downtime?: number; // in seconds
  };
  escalation: {
    level: 0 | 1 | 2 | 3; // 0=auto, 1=tier1, 2=tier2, 3=critical
    escalatedAt?: string;
    escalatedTo?: string;
    slaDeadline: string;
    autoEscalation: boolean;
  };
  resolution?: {
    action: 'fixed' | 'workaround' | 'suppressed' | 'known_issue';
    description: string;
    resolvedBy: string;
    resolvedAt: string;
    preventionMeasures?: string[];
  };
  notifications: {
    channels: ('in_app' | 'email' | 'sms' | 'slack' | 'webhook')[];
    frequency: 'immediate' | 'hourly' | 'daily' | 'suppressed';
    lastNotified: string;
    suppressUntil?: string;
  };
  tags: string[];
}

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    errorTypes: string[];
    severityThreshold: string;
    occurrenceThreshold: number;
    timeWindow: number; // in minutes
  };
  actions: {
    notify: boolean;
    escalate: boolean;
    autoResolve: boolean;
    suppressDuplicates: boolean;
  };
  channels: string[];
}

const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const AlertsHeader = styled.div`
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

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const AlertStatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 1rem;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div<{ $severity?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: ${props => {
    switch (props.$severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      default: return '#111827';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$severity) {
        case 'critical': return '#f87171';
        case 'high': return '#fbbf24';
        case 'medium': return '#60a5fa';
        default: return '#f3f4f6';
      }
    }};
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const AlertsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AlertCard = styled(Card)<{ $severity: string; $pulsing: boolean }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#d1d5db';
    }
  }};
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.$pulsing && `
    animation: pulse 2s infinite;
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.3); }
    50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0.1); }
    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
  }
`;

const AlertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const AlertInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AlertTitle = styled.h3`
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const AlertDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const AlertMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const SeverityBadge = styled.span<{ $severity: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.$severity) {
      case 'critical':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'high':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'medium':
        return `
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        `;
      case 'low':
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
      switch (props.$severity) {
        case 'critical':
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
        case 'high':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'medium':
          return `
            background: #1e3a8a;
            color: #bfdbfe;
            border-color: #1e40af;
          `;
        case 'low':
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

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'active':
        return `
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        `;
      case 'investigating':
        return `
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fed7aa;
        `;
      case 'resolved':
        return `
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        `;
      case 'suppressed':
        return `
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
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
        case 'active':
          return `
            background: #7f1d1d;
            color: #fca5a5;
            border-color: #dc2626;
          `;
        case 'investigating':
          return `
            background: #78350f;
            color: #fcd34d;
            border-color: #d97706;
          `;
        case 'resolved':
          return `
            background: #14532d;
            color: #86efac;
            border-color: #16a34a;
          `;
        case 'suppressed':
          return `
            background: #334155;
            color: #94a3b8;
            border-color: #64748b;
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

const AlertDetails = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  font-size: 0.875rem;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const DetailValue = styled.span`
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

const EscalationInfo = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: 0.75rem;
  
  ${props => props.$overdue ? `
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  ` : `
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  `}

  [data-theme="dark"] & {
    ${props => props.$overdue ? `
      background: #7f1d1d;
      color: #fca5a5;
      border-color: #dc2626;
    ` : `
      background: #14532d;
      color: #86efac;
      border-color: #16a34a;
    `}
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$active ? `
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  ` : `
    background: transparent;
    border-color: #d1d5db;
    color: #6b7280;
    
    &:hover {
      background: #f3f4f6;
    }
  `}

  [data-theme="dark"] & {
    ${props => !props.$active && `
      border-color: #6b7280;
      color: #9ca3af;
      
      &:hover {
        background: #6b7280;
      }
    `}
  }
`;

interface FailedProcessingAlertsProps {
  alerts?: FailedProcessingAlert[];
  alertRules?: AlertRule[];
  loading?: boolean;
  onAlertAction?: (alertId: string, action: string) => Promise<void>;
  onViewDetails?: (alert: FailedProcessingAlert) => void;
  onConfigureRules?: () => void;
  className?: string;
}

const FailedProcessingAlerts: React.FC<FailedProcessingAlertsProps> = ({
  alerts = [],
  alertRules = [],
  loading = false,
  onAlertAction = async () => {},
  onViewDetails = () => {},
  onConfigureRules = () => {},
  className
}) => {
  const { success, error } = useNotifications();
  const [filter, setFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<FailedProcessingAlert | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mock alerts for demonstration
  const mockAlerts: FailedProcessingAlert[] = [
    {
      id: 'alert-1',
      alertType: 'import_failure',
      severity: 'critical',
      title: 'Multiple Import Failures - Symbol Lookup Service Down',
      description: 'Symbol lookup service is experiencing high failure rates, causing multiple email imports to fail',
      firstOccurred: new Date(Date.now() - 3600000).toISOString(),
      lastOccurred: new Date(Date.now() - 300000).toISOString(),
      occurrenceCount: 47,
      status: 'active',
      source: {
        component: 'symbol_lookup',
        service: 'Yahoo Finance API',
        location: 'us-east-1'
      },
      affectedItems: {
        emails: ['email-1', 'email-2', 'email-3'],
        portfolios: ['TFSA Portfolio', 'RRSP Portfolio'],
        users: ['user-123', 'user-456']
      },
      errorDetails: {
        errorCode: 'SYMBOL_SERVICE_TIMEOUT',
        errorMessage: 'Request timeout after 30 seconds',
        context: {
          apiEndpoint: 'https://query1.finance.yahoo.com/v8/finance/chart/',
          timeoutMs: 30000,
          retryCount: 3
        }
      },
      metrics: {
        failureRate: 78.3,
        affectedEmails: 47,
        estimatedImpact: 'critical',
        downtime: 3300
      },
      escalation: {
        level: 2,
        escalatedAt: new Date(Date.now() - 1800000).toISOString(),
        escalatedTo: 'tier2-support@investra.com',
        slaDeadline: new Date(Date.now() + 1800000).toISOString(),
        autoEscalation: true
      },
      notifications: {
        channels: ['in_app', 'email', 'slack'],
        frequency: 'immediate',
        lastNotified: new Date(Date.now() - 300000).toISOString()
      },
      tags: ['symbol-lookup', 'api-timeout', 'high-impact']
    },
    {
      id: 'alert-2',
      alertType: 'system_error',
      severity: 'high',
      title: 'IMAP Service Connection Issues',
      description: 'Intermittent connection failures to email server affecting email processing',
      firstOccurred: new Date(Date.now() - 7200000).toISOString(),
      lastOccurred: new Date(Date.now() - 900000).toISOString(),
      occurrenceCount: 12,
      status: 'investigating',
      source: {
        component: 'imap_service',
        service: 'docker-mailserver',
        location: 'production'
      },
      affectedItems: {
        emails: ['email-4', 'email-5'],
        portfolios: ['Margin Account']
      },
      errorDetails: {
        errorCode: 'IMAP_CONNECTION_REFUSED',
        errorMessage: 'Connection refused by IMAP server',
        context: {
          serverHost: 'mail.investra.com',
          port: 993,
          tlsEnabled: true
        }
      },
      metrics: {
        failureRate: 23.5,
        affectedEmails: 12,
        estimatedImpact: 'medium',
        downtime: 450
      },
      escalation: {
        level: 1,
        escalatedAt: new Date(Date.now() - 3600000).toISOString(),
        escalatedTo: 'tier1-support@investra.com',
        slaDeadline: new Date(Date.now() + 3600000).toISOString(),
        autoEscalation: true
      },
      notifications: {
        channels: ['in_app', 'email'],
        frequency: 'hourly',
        lastNotified: new Date(Date.now() - 900000).toISOString()
      },
      tags: ['imap', 'connection-issue', 'intermittent']
    }
  ];

  const currentAlerts = alerts.length > 0 ? alerts : mockAlerts;

  const filteredAlerts = currentAlerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'active') return alert.status === 'active';
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'escalated') return alert.escalation.level > 0;
    return alert.alertType === filter;
  });

  const alertStats = {
    total: currentAlerts.length,
    active: currentAlerts.filter(a => a.status === 'active').length,
    critical: currentAlerts.filter(a => a.severity === 'critical').length,
    escalated: currentAlerts.filter(a => a.escalation.level > 0).length
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'import_failure': return <FileX size={16} />;
      case 'system_error': return <Server size={16} />;
      case 'service_down': return <Wifi size={16} />;
      case 'rate_limit': return <Clock size={16} />;
      case 'security_issue': return <Shield size={16} />;
      case 'data_corruption': return <Database size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={14} />;
      case 'high': return <AlertCircle size={14} />;
      case 'medium': return <Bell size={14} />;
      case 'low': return <Bell size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Zap size={14} />;
      case 'investigating': return <Eye size={14} />;
      case 'resolved': return <CheckCircle size={14} />;
      case 'suppressed': return <BellOff size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const isEscalationOverdue = (alert: FailedProcessingAlert): boolean => {
    return new Date(alert.escalation.slaDeadline) < new Date();
  };

  const formatTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const slaTime = new Date(deadline);
    const diffMs = slaTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      const overdue = Math.abs(diffMs);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours > 0 ? `${hours}h ` : ''}${minutes}m overdue`;
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m remaining`;
  };

  const handleAlertAction = async (alertId: string, action: string) => {
    setActionLoading(alertId);
    try {
      await onAlertAction(alertId, action);
      success('Action Completed', `Alert ${action} action completed successfully`);
    } catch (err) {
      error('Action Failed', `Failed to ${action} alert: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const viewDetails = (alert: FailedProcessingAlert) => {
    setSelectedAlert(alert);
    setShowDetailsModal(true);
    onViewDetails(alert);
  };

  return (
    <>
      <AlertsContainer className={className}>
        <AlertsHeader>
          <Title>
            <AlertTriangle size={24} />
            Processing Alerts ({filteredAlerts.length})
          </Title>
          <HeaderActions>
            <Button
              variant="outline"
              onClick={onConfigureRules}
              disabled={loading}
            >
              <Settings size={16} />
              Configure Rules
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </HeaderActions>
        </AlertsHeader>

        <AlertStatsBar>
          <StatItem>
            <StatValue>{alertStats.total}</StatValue>
            <StatLabel>Total Alerts</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $severity="critical">{alertStats.critical}</StatValue>
            <StatLabel>Critical</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $severity="high">{alertStats.active}</StatValue>
            <StatLabel>Active</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $severity="medium">{alertStats.escalated}</StatValue>
            <StatLabel>Escalated</StatLabel>
          </StatItem>
        </AlertStatsBar>

        <FilterBar>
          <FilterButton
            $active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All Alerts
          </FilterButton>
          <FilterButton
            $active={filter === 'active'}
            onClick={() => setFilter('active')}
          >
            Active
          </FilterButton>
          <FilterButton
            $active={filter === 'critical'}
            onClick={() => setFilter('critical')}
          >
            Critical
          </FilterButton>
          <FilterButton
            $active={filter === 'escalated'}
            onClick={() => setFilter('escalated')}
          >
            Escalated
          </FilterButton>
          <FilterButton
            $active={filter === 'import_failure'}
            onClick={() => setFilter('import_failure')}
          >
            Import Failures
          </FilterButton>
          <FilterButton
            $active={filter === 'system_error'}
            onClick={() => setFilter('system_error')}
          >
            System Errors
          </FilterButton>
        </FilterBar>

        <AlertsList>
          {filteredAlerts.length === 0 ? (
            <EmptyState>
              <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                No alerts to display
              </div>
              <div>All systems are operating normally</div>
            </EmptyState>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertCard 
                key={alert.id} 
                $severity={alert.severity}
                $pulsing={alert.status === 'active' && alert.severity === 'critical'}
              >
                <AlertHeader>
                  <AlertInfo>
                    <AlertTitle>
                      {getAlertIcon(alert.alertType)}
                      {alert.title}
                    </AlertTitle>
                    <AlertDescription>{alert.description}</AlertDescription>
                    <AlertMeta>
                      <span>First: {formatDate(alert.firstOccurred)}</span>
                      <span>•</span>
                      <span>Last: {formatDate(alert.lastOccurred)}</span>
                      <span>•</span>
                      <span>Count: {alert.occurrenceCount}</span>
                      <span>•</span>
                      <span>Source: {alert.source.component}</span>
                    </AlertMeta>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <SeverityBadge $severity={alert.severity}>
                        {getSeverityIcon(alert.severity)}
                        {alert.severity}
                      </SeverityBadge>
                      <StatusBadge $status={alert.status}>
                        {getStatusIcon(alert.status)}
                        {alert.status}
                      </StatusBadge>
                    </div>
                  </AlertInfo>
                </AlertHeader>

                <AlertDetails>
                  <DetailsGrid>
                    <DetailItem>
                      <DetailLabel>Failure Rate</DetailLabel>
                      <DetailValue>{alert.metrics.failureRate.toFixed(1)}%</DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Affected Emails</DetailLabel>
                      <DetailValue>{alert.metrics.affectedEmails}</DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Impact Level</DetailLabel>
                      <DetailValue>{alert.metrics.estimatedImpact.toUpperCase()}</DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Error Code</DetailLabel>
                      <DetailValue>{alert.errorDetails.errorCode || 'N/A'}</DetailValue>
                    </DetailItem>
                    {alert.metrics.downtime && (
                      <DetailItem>
                        <DetailLabel>Downtime</DetailLabel>
                        <DetailValue>{Math.floor(alert.metrics.downtime / 60)}m {alert.metrics.downtime % 60}s</DetailValue>
                      </DetailItem>
                    )}
                    <DetailItem>
                      <DetailLabel>Escalation Level</DetailLabel>
                      <DetailValue>Tier {alert.escalation.level}</DetailValue>
                    </DetailItem>
                  </DetailsGrid>
                </AlertDetails>

                {alert.escalation.level > 0 && (
                  <EscalationInfo $overdue={isEscalationOverdue(alert)}>
                    <TrendingUp size={14} />
                    <span>
                      Escalated to {alert.escalation.escalatedTo} • 
                      SLA: {formatTimeRemaining(alert.escalation.slaDeadline)}
                    </span>
                  </EscalationInfo>
                )}

                <ActionButtons>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewDetails(alert)}
                  >
                    <Eye size={14} />
                    View Details
                  </Button>
                  
                  {alert.status === 'active' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAlertAction(alert.id, 'investigate')}
                      disabled={actionLoading === alert.id}
                    >
                      <Users size={14} />
                      Investigate
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAlertAction(alert.id, 'suppress')}
                    disabled={actionLoading === alert.id}
                  >
                    <BellOff size={14} />
                    Suppress
                  </Button>
                  
                  {alert.status !== 'resolved' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAlertAction(alert.id, 'resolve')}
                      disabled={actionLoading === alert.id}
                    >
                      <CheckCircle size={14} />
                      Mark Resolved
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAlertAction(alert.id, 'escalate')}
                    disabled={actionLoading === alert.id}
                  >
                    <TrendingUp size={14} />
                    Escalate
                  </Button>
                </ActionButtons>
              </AlertCard>
            ))
          )}
        </AlertsList>
      </AlertsContainer>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Alert Details"
        size="lg"
      >
        {selectedAlert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3>Alert Information</h3>
              <AlertDetails>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Type:</strong> {selectedAlert.alertType.replace('_', ' ').toUpperCase()}<br />
                  <strong>Severity:</strong> {selectedAlert.severity.toUpperCase()}<br />
                  <strong>Status:</strong> {selectedAlert.status.toUpperCase()}<br />
                  <strong>Source:</strong> {selectedAlert.source.component} ({selectedAlert.source.service})
                </div>
              </AlertDetails>
            </div>

            <div>
              <h3>Error Details</h3>
              <AlertDetails>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Error Code:</strong> {selectedAlert.errorDetails.errorCode || 'N/A'}<br />
                  <strong>Message:</strong> {selectedAlert.errorDetails.errorMessage}<br />
                  {selectedAlert.errorDetails.requestId && (
                    <>
                      <strong>Request ID:</strong> {selectedAlert.errorDetails.requestId}<br />
                    </>
                  )}
                </div>
                {selectedAlert.errorDetails.context && (
                  <div>
                    <strong>Context:</strong>
                    <pre style={{ 
                      background: '#f8fafc', 
                      padding: '0.75rem', 
                      borderRadius: '6px', 
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      marginTop: '0.5rem'
                    }}>
                      {JSON.stringify(selectedAlert.errorDetails.context, null, 2)}
                    </pre>
                  </div>
                )}
              </AlertDetails>
            </div>

            <div>
              <h3>Affected Resources</h3>
              <AlertDetails>
                <DetailsGrid>
                  <DetailItem>
                    <DetailLabel>Emails</DetailLabel>
                    <DetailValue>{selectedAlert.affectedItems.emails.length}</DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Portfolios</DetailLabel>
                    <DetailValue>{selectedAlert.affectedItems.portfolios.join(', ')}</DetailValue>
                  </DetailItem>
                  {selectedAlert.affectedItems.users && (
                    <DetailItem>
                      <DetailLabel>Users</DetailLabel>
                      <DetailValue>{selectedAlert.affectedItems.users.length}</DetailValue>
                    </DetailItem>
                  )}
                </DetailsGrid>
              </AlertDetails>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  if (selectedAlert && selectedAlert.status !== 'resolved') {
                    handleAlertAction(selectedAlert.id, 'investigate');
                  }
                }}
              >
                <Users size={16} />
                Investigate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default FailedProcessingAlerts;