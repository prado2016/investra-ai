/**
 * Manual Review Notifications Component
 * Task 10.3: Implement manual review notifications
 * Notification system for manual review queue events, assignments, and escalations
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Users,
  Bell,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle,
  X,
  UserCheck,
  UserX,
  MessageSquare,
  TrendingUp,
  Calendar,
  Timer,
  Flag,
  Mail,
  Smartphone,
  Settings,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Archive,
  ExternalLink,
  Zap,
  AlertCircle,
  FileText,
  Target
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatting';

interface ReviewNotification {
  id: string;
  type: 'review_assigned' | 'review_due' | 'review_overdue' | 'review_escalated' | 'review_completed' | 'review_rejected' | 'queue_full' | 'reviewer_unavailable';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  status: 'unread' | 'read' | 'acknowledged' | 'dismissed';
  reviewItem: {
    id: string;
    emailSubject: string;
    flagReason: string;
    priority: string;
    slaDeadline: string;
    estimatedReviewTime: number;
    portfolioId: string;
  };
  assignment: {
    assignedTo?: string;
    assignedBy?: string;
    assignedAt?: string;
    dueAt?: string;
    escalationLevel?: number;
  };
  actions: Array<{
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: () => void;
    requiresConfirmation?: boolean;
  }>;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    slack?: boolean;
    webhook?: boolean;
  };
  autoActions?: {
    escalateAfter?: number; // minutes
    reassignAfter?: number; // minutes
    alertFrequency?: number; // minutes
  };
}

interface ReviewerStatus {
  id: string;
  name: string;
  email: string;
  role: 'reviewer' | 'senior_reviewer' | 'team_lead' | 'escalation_contact';
  status: 'available' | 'busy' | 'away' | 'offline';
  capacity: {
    current: number;
    maximum: number;
    avgReviewTime: number;
  };
  preferences: {
    notificationChannels: string[];
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
    specializations: string[];
  };
  performance: {
    reviewsCompleted: number;
    avgCompletionTime: number;
    accuracyRate: number;
    escalationRate: number;
  };
}

interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    reviewTypes: string[];
    priorities: string[];
    slaThreshold: number; // percentage of SLA remaining
    workingHoursOnly: boolean;
  };
  actions: {
    channels: string[];
    frequency: 'immediate' | 'every_15min' | 'every_30min' | 'hourly';
    escalation: boolean;
    autoAssign: boolean;
  };
  recipients: {
    reviewers: string[];
    managers: string[];
    escalationContacts: string[];
  };
}

const NotificationsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

const StatsPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(Card)`
  padding: 1.25rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
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
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatChange = styled.div<{ $trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => {
    switch (props.$trend) {
      case 'up': return '#059669';
      case 'down': return '#dc2626';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$trend) {
        case 'up': return '#10b981';
        case 'down': return '#f87171';
        default: return '#9ca3af';
      }
    }};
  }
`;

const ReviewersSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const NotificationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const NotificationCard = styled(Card)<{ $priority: string; $unread: boolean }>`
  padding: 1.25rem;
  border-left: 4px solid ${props => {
    switch (props.$priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'normal': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#d1d5db';
    }
  }};
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.$unread && `
    background: linear-gradient(90deg, #eff6ff 0%, #ffffff 100%);
    box-shadow: 0 0 0 1px #dbeafe;
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }

  [data-theme="dark"] & {
    ${props => props.$unread && `
      background: linear-gradient(90deg, #1e3a8a 0%, #374151 100%);
      box-shadow: 0 0 0 1px #1e40af;
    `}
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const NotificationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationTitle = styled.h3`
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

const NotificationMessage = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const NotificationMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #9ca3af;

  [data-theme="dark"] & {
    color: #6b7280;
  }
`;

const PriorityBadge = styled.span<{ $priority: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.$priority) {
      case 'urgent':
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
      case 'normal':
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
      switch (props.$priority) {
        case 'urgent':
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
        case 'normal':
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

const SLAIndicator = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => {
    switch (props.$status) {
      case 'overdue': return '#dc2626';
      case 'urgent': return '#f59e0b';
      case 'warning': return '#d97706';
      case 'normal': return '#059669';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$status) {
        case 'overdue': return '#f87171';
        case 'urgent': return '#fbbf24';
        case 'warning': return '#fcd34d';
        case 'normal': return '#10b981';
        default: return '#9ca3af';
      }
    }};
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
`;

const QuickActionButton = styled.button<{ $variant: string }>`
  padding: 0.375rem 0.75rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          
          &:hover {
            background: #2563eb;
          }
        `;
      case 'secondary':
        return `
          background: transparent;
          border-color: #d1d5db;
          color: #374151;
          
          &:hover {
            background: #f3f4f6;
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          border-color: #ef4444;
          color: white;
          
          &:hover {
            background: #dc2626;
          }
        `;
      default:
        return `
          background: transparent;
          border-color: #d1d5db;
          color: #6b7280;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$variant) {
        case 'secondary':
          return `
            border-color: #4b5563;
            color: #d1d5db;
            
            &:hover {
              background: #4b5563;
            }
          `;
        default:
          return '';
      }
    }}
  }
`;

const ReviewersPanel = styled(Card)`
  padding: 1.25rem;
  height: fit-content;
`;

const ReviewersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ReviewerCard = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.$status) {
      case 'available':
        return `border-color: #10b981; background: #f0fdf4;`;
      case 'busy':
        return `border-color: #f59e0b; background: #fffbeb;`;
      case 'away':
        return `border-color: #6b7280; background: #f9fafb;`;
      case 'offline':
        return `border-color: #ef4444; background: #fef2f2;`;
      default:
        return `border-color: #e5e7eb; background: white;`;
    }
  }}

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  [data-theme="dark"] & {
    border-color: #4b5563;
    ${props => {
      switch (props.$status) {
        case 'available':
          return `border-color: #10b981; background: #064e3b;`;
        case 'busy':
          return `border-color: #f59e0b; background: #78350f;`;
        case 'away':
          return `border-color: #6b7280; background: #374151;`;
        case 'offline':
          return `border-color: #ef4444; background: #7f1d1d;`;
        default:
          return `background: #374151;`;
      }
    }}
  }
`;

const ReviewerAvatar = styled.div<{ $status: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'available': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'away': return '#6b7280';
      case 'offline': return '#ef4444';
      default: return '#3b82f6';
    }
  }};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border: 2px solid white;
    border-radius: 50%;
    background: ${props => {
      switch (props.$status) {
        case 'available': return '#10b981';
        case 'busy': return '#f59e0b';
        case 'away': return '#6b7280';
        case 'offline': return '#ef4444';
        default: return '#6b7280';
      }
    }};
  }
`;

const ReviewerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ReviewerName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ReviewerStats = styled.div`
  font-size: 0.75rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
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

interface ManualReviewNotificationsProps {
  notifications?: ReviewNotification[];
  reviewers?: ReviewerStatus[];
  rules?: NotificationRule[];
  loading?: boolean;
  onNotificationAction?: (notificationId: string, action: string) => Promise<void>;
  onAssignReviewer?: (reviewId: string, reviewerId: string) => Promise<void>;
  onConfigureRules?: () => void;
  className?: string;
}

const ManualReviewNotifications: React.FC<ManualReviewNotificationsProps> = ({
  notifications = [],
  reviewers = [],
  rules = [],
  loading = false,
  onNotificationAction = async () => {},
  onAssignReviewer = async () => {},
  onConfigureRules = () => {},
  className
}) => {
  const { success, error } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState<ReviewNotification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mock data for demonstration
  const mockNotifications: ReviewNotification[] = [
    {
      id: 'notif-1',
      type: 'review_overdue',
      priority: 'urgent',
      title: 'Review Overdue',
      message: 'AAPL duplicate review is 2 hours overdue and requires immediate attention',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      status: 'unread',
      reviewItem: {
        id: 'review-1',
        emailSubject: 'Trade Confirmation - AAPL Purchase',
        flagReason: 'potential_duplicate',
        priority: 'high',
        slaDeadline: new Date(Date.now() - 7200000).toISOString(),
        estimatedReviewTime: 5,
        portfolioId: 'TFSA Portfolio'
      },
      assignment: {
        assignedTo: 'john.doe@investra.com',
        assignedBy: 'system',
        assignedAt: new Date(Date.now() - 14400000).toISOString(),
        dueAt: new Date(Date.now() - 7200000).toISOString(),
        escalationLevel: 1
      },
      actions: [
        {
          label: 'Escalate',
          type: 'danger',
          action: () => success('Action', 'Review escalated to senior reviewer')
        },
        {
          label: 'Reassign',
          type: 'secondary',
          action: () => success('Action', 'Review reassigned to available reviewer')
        }
      ],
      channels: {
        inApp: true,
        email: true,
        sms: true,
        slack: true
      }
    },
    {
      id: 'notif-2',
      type: 'review_assigned',
      priority: 'normal',
      title: 'New Review Assigned',
      message: 'TSLA symbol ambiguity case assigned for your review',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'unread',
      reviewItem: {
        id: 'review-2',
        emailSubject: 'Trade Confirmation - TSLA Sale',
        flagReason: 'symbol_ambiguous',
        priority: 'normal',
        slaDeadline: new Date(Date.now() + 3600000).toISOString(),
        estimatedReviewTime: 10,
        portfolioId: 'RRSP Portfolio'
      },
      assignment: {
        assignedTo: 'jane.smith@investra.com',
        assignedBy: 'auto-assignment',
        assignedAt: new Date(Date.now() - 1800000).toISOString(),
        dueAt: new Date(Date.now() + 3600000).toISOString(),
        escalationLevel: 0
      },
      actions: [
        {
          label: 'Start Review',
          type: 'primary',
          action: () => success('Navigation', 'Opening review interface...')
        },
        {
          label: 'View Details',
          type: 'secondary',
          action: () => success('Navigation', 'Opening review details...')
        }
      ],
      channels: {
        inApp: true,
        email: true,
        sms: false
      }
    }
  ];

  const mockReviewers: ReviewerStatus[] = [
    {
      id: 'reviewer-1',
      name: 'John Doe',
      email: 'john.doe@investra.com',
      role: 'reviewer',
      status: 'busy',
      capacity: {
        current: 3,
        maximum: 5,
        avgReviewTime: 8
      },
      preferences: {
        notificationChannels: ['email', 'slack'],
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'EST'
        },
        specializations: ['duplicate-detection', 'symbol-lookup']
      },
      performance: {
        reviewsCompleted: 247,
        avgCompletionTime: 7.2,
        accuracyRate: 94.8,
        escalationRate: 2.1
      }
    },
    {
      id: 'reviewer-2',
      name: 'Jane Smith',
      email: 'jane.smith@investra.com',
      role: 'senior_reviewer',
      status: 'available',
      capacity: {
        current: 1,
        maximum: 3,
        avgReviewTime: 12
      },
      preferences: {
        notificationChannels: ['email', 'sms', 'slack'],
        workingHours: {
          start: '08:00',
          end: '18:00',
          timezone: 'EST'
        },
        specializations: ['complex-cases', 'escalations']
      },
      performance: {
        reviewsCompleted: 189,
        avgCompletionTime: 11.5,
        accuracyRate: 98.2,
        escalationRate: 0.8
      }
    }
  ];

  const currentNotifications = notifications.length > 0 ? notifications : mockNotifications;
  const currentReviewers = reviewers.length > 0 ? reviewers : mockReviewers;

  const notificationStats = {
    total: currentNotifications.length,
    unread: currentNotifications.filter(n => n.status === 'unread').length,
    overdue: currentNotifications.filter(n => n.type === 'review_overdue').length,
    urgent: currentNotifications.filter(n => n.priority === 'urgent').length
  };

  const reviewerStats = {
    available: currentReviewers.filter(r => r.status === 'available').length,
    busy: currentReviewers.filter(r => r.status === 'busy').length,
    totalCapacity: currentReviewers.reduce((sum, r) => sum + r.capacity.maximum, 0),
    currentLoad: currentReviewers.reduce((sum, r) => sum + r.capacity.current, 0)
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review_assigned': return <UserCheck size={16} />;
      case 'review_due': return <Clock size={16} />;
      case 'review_overdue': return <AlertTriangle size={16} />;
      case 'review_escalated': return <TrendingUp size={16} />;
      case 'review_completed': return <CheckCircle size={16} />;
      case 'review_rejected': return <X size={16} />;
      case 'queue_full': return <AlertCircle size={16} />;
      case 'reviewer_unavailable': return <UserX size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle size={12} />;
      case 'high': return <Flag size={12} />;
      case 'normal': return <Bell size={12} />;
      case 'low': return <Bell size={12} />;
      default: return <Bell size={12} />;
    }
  };

  const getSLAStatus = (deadline: string): string => {
    const now = new Date();
    const slaTime = new Date(deadline);
    const diffMs = slaTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'overdue';
    if (diffMs < 900000) return 'urgent'; // 15 minutes
    if (diffMs < 3600000) return 'warning'; // 1 hour
    return 'normal';
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

  const handleNotificationAction = async (notificationId: string, action: string) => {
    setActionLoading(notificationId);
    try {
      await onNotificationAction(notificationId, action);
      success('Action Completed', `Notification ${action} completed successfully`);
    } catch (err) {
      error('Action Failed', `Failed to ${action} notification: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const viewDetails = (notification: ReviewNotification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
  };

  return (
    <>
      <NotificationsContainer className={className}>
        <Header>
          <Title>
            <Users size={24} />
            Review Notifications ({notificationStats.unread} unread)
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
              <Archive size={16} />
              Archive All
            </Button>
          </HeaderActions>
        </Header>

        <StatsPanel>
          <StatCard>
            <StatHeader>
              <StatTitle>Pending Reviews</StatTitle>
              <StatIcon $color="#3b82f6">
                <FileText size={16} />
              </StatIcon>
            </StatHeader>
            <StatValue>{notificationStats.total}</StatValue>
            <StatChange $trend="up">
              <TrendingUp size={14} />
              +3 this hour
            </StatChange>
          </StatCard>

          <StatCard>
            <StatHeader>
              <StatTitle>Overdue Items</StatTitle>
              <StatIcon $color="#ef4444">
                <AlertTriangle size={16} />
              </StatIcon>
            </StatHeader>
            <StatValue>{notificationStats.overdue}</StatValue>
            <StatChange $trend="down">
              <Timer size={14} />
              SLA breach
            </StatChange>
          </StatCard>

          <StatCard>
            <StatHeader>
              <StatTitle>Available Reviewers</StatTitle>
              <StatIcon $color="#10b981">
                <Users size={16} />
              </StatIcon>
            </StatHeader>
            <StatValue>{reviewerStats.available}/{currentReviewers.length}</StatValue>
            <StatChange $trend="neutral">
              <Target size={14} />
              {Math.round((reviewerStats.currentLoad / reviewerStats.totalCapacity) * 100)}% capacity
            </StatChange>
          </StatCard>
        </StatsPanel>

        <ReviewersSection>
          <NotificationsList>
            {currentNotifications.length === 0 ? (
              <EmptyState>
                <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  No review notifications
                </div>
                <div>All reviews are up to date</div>
              </EmptyState>
            ) : (
              currentNotifications.map((notification) => {
                const slaStatus = getSLAStatus(notification.reviewItem.slaDeadline);
                return (
                  <NotificationCard
                    key={notification.id}
                    $priority={notification.priority}
                    $unread={notification.status === 'unread'}
                  >
                    <NotificationHeader>
                      <NotificationInfo>
                        <NotificationTitle>
                          {getNotificationIcon(notification.type)}
                          {notification.title}
                        </NotificationTitle>
                        <NotificationMessage>{notification.message}</NotificationMessage>
                        <NotificationMeta>
                          <span>Email: {notification.reviewItem.emailSubject}</span>
                          <span>•</span>
                          <span>Portfolio: {notification.reviewItem.portfolioId}</span>
                          <span>•</span>
                          <span>Reason: {notification.reviewItem.flagReason.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{formatDate(notification.timestamp)}</span>
                        </NotificationMeta>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <PriorityBadge $priority={notification.priority}>
                            {getPriorityIcon(notification.priority)}
                            {notification.priority}
                          </PriorityBadge>
                          <SLAIndicator $status={slaStatus}>
                            <Timer size={12} />
                            {formatTimeRemaining(notification.reviewItem.slaDeadline)}
                          </SLAIndicator>
                          {notification.assignment.assignedTo && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Assigned to: {notification.assignment.assignedTo}
                            </span>
                          )}
                        </div>
                      </NotificationInfo>
                    </NotificationHeader>

                    <QuickActions>
                      <QuickActionButton
                        $variant="secondary"
                        onClick={() => viewDetails(notification)}
                      >
                        <Eye size={12} />
                        View Details
                      </QuickActionButton>
                      
                      {notification.actions.map((action, index) => (
                        <QuickActionButton
                          key={index}
                          $variant={action.type}
                          onClick={() => {
                            action.action();
                            handleNotificationAction(notification.id, action.label.toLowerCase());
                          }}
                          disabled={actionLoading === notification.id}
                        >
                          {action.label}
                        </QuickActionButton>
                      ))}
                      
                      <QuickActionButton
                        $variant="secondary"
                        onClick={() => handleNotificationAction(notification.id, 'dismiss')}
                        disabled={actionLoading === notification.id}
                      >
                        <X size={12} />
                        Dismiss
                      </QuickActionButton>
                    </QuickActions>
                  </NotificationCard>
                );
              })
            )}
          </NotificationsList>

          <ReviewersPanel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Active Reviewers</h3>
              <Button variant="ghost" size="sm">
                <Settings size={14} />
              </Button>
            </div>
            
            <ReviewersList>
              {currentReviewers.map((reviewer) => (
                <ReviewerCard key={reviewer.id} $status={reviewer.status}>
                  <ReviewerAvatar $status={reviewer.status}>
                    {reviewer.name.split(' ').map(n => n[0]).join('')}
                  </ReviewerAvatar>
                  <ReviewerInfo>
                    <ReviewerName>{reviewer.name}</ReviewerName>
                    <ReviewerStats>
                      {reviewer.capacity.current}/{reviewer.capacity.maximum} reviews • 
                      {reviewer.performance.accuracyRate.toFixed(1)}% accuracy
                    </ReviewerStats>
                  </ReviewerInfo>
                  {reviewer.status === 'available' && (
                    <Button variant="ghost" size="sm">
                      <UserCheck size={12} />
                    </Button>
                  )}
                </ReviewerCard>
              ))}
            </ReviewersList>
          </ReviewersPanel>
        </ReviewersSection>
      </NotificationsContainer>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Review Notification Details"
        size="lg"
      >
        {selectedNotification && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3>Notification Information</h3>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Type:</strong> {selectedNotification.type.replace('_', ' ').toUpperCase()}<br />
                  <strong>Priority:</strong> {selectedNotification.priority.toUpperCase()}<br />
                  <strong>Status:</strong> {selectedNotification.status.toUpperCase()}<br />
                  <strong>Timestamp:</strong> {formatDate(selectedNotification.timestamp)}
                </div>
              </div>
            </div>

            <div>
              <h3>Review Item Details</h3>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Email Subject:</strong> {selectedNotification.reviewItem.emailSubject}<br />
                  <strong>Flag Reason:</strong> {selectedNotification.reviewItem.flagReason.replace('_', ' ')}<br />
                  <strong>Portfolio:</strong> {selectedNotification.reviewItem.portfolioId}<br />
                  <strong>Priority:</strong> {selectedNotification.reviewItem.priority}<br />
                  <strong>Est. Review Time:</strong> {selectedNotification.reviewItem.estimatedReviewTime} minutes<br />
                  <strong>SLA Deadline:</strong> {formatDate(selectedNotification.reviewItem.slaDeadline)}
                </div>
              </div>
            </div>

            {selectedNotification.assignment.assignedTo && (
              <div>
                <h3>Assignment Details</h3>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Assigned To:</strong> {selectedNotification.assignment.assignedTo}<br />
                    <strong>Assigned By:</strong> {selectedNotification.assignment.assignedBy}<br />
                    <strong>Assigned At:</strong> {formatDate(selectedNotification.assignment.assignedAt!)}<br />
                    <strong>Due At:</strong> {formatDate(selectedNotification.assignment.dueAt!)}<br />
                    <strong>Escalation Level:</strong> {selectedNotification.assignment.escalationLevel}
                  </div>
                </div>
              </div>
            )}

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
                  success('Navigation', 'Opening review interface...');
                }}
              >
                <ExternalLink size={16} />
                Open Review
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ManualReviewNotifications;