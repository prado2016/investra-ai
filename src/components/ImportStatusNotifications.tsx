/**
 * Import Status Notifications Component
 * Task 10.1: Create real-time import status notifications
 * Real-time notification system for email import processing events
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  Mail,
  TrendingUp,
  Zap,
  Eye,
  Settings,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Filter,
  Archive,
  RefreshCw,
  Users,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatting';

interface ImportNotification {
  id: string;
  type: 'import_success' | 'import_failed' | 'duplicate_detected' | 'manual_review_required' | 'processing_complete' | 'system_alert';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  data: {
    emailSubject?: string;
    portfolioId?: string;
    transactionId?: string;
    errorCode?: string;
    processingTime?: number;
    importId?: string;
    duplicateCount?: number;
    reviewQueue?: string;
  };
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: () => void;
  }>;
  soundEnabled?: boolean;
  autoArchive?: boolean;
  autoArchiveDelay?: number; // in milliseconds
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  showToasts: boolean;
  maxVisible: number;
  autoArchiveDelay: number;
  filters: {
    types: string[];
    priorities: string[];
    portfolios: string[];
  };
  positioning: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark' | 'auto';
}

const NotificationContainer = styled.div<{ $position: string; $collapsed: boolean }>`
  position: fixed;
  ${props => {
    switch (props.$position) {
      case 'top-right':
        return 'top: 1rem; right: 1rem;';
      case 'top-left':
        return 'top: 1rem; left: 1rem;';
      case 'bottom-right':
        return 'bottom: 1rem; right: 1rem;';
      case 'bottom-left':
        return 'bottom: 1rem; left: 1rem;';
      default:
        return 'top: 1rem; right: 1rem;';
    }
  }}
  z-index: 1000;
  max-width: 400px;
  width: 100%;
  transition: all 0.3s ease;
  
  ${props => props.$collapsed && `
    transform: scale(0.8);
    opacity: 0.7;
  `}

  @media (max-width: 640px) {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
`;

const NotificationPanel = styled(Card)<{ $collapsed: boolean }>`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
  overflow: hidden;
  transition: all 0.3s ease;
  
  ${props => props.$collapsed && `
    max-height: 60px;
    overflow: hidden;
  `}

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.2);
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;

  [data-theme="dark"] & {
    border-color: #4b5563;
    background: #4b5563;
  }
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
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
  align-items: center;
  gap: 0.5rem;
`;

const NotificationCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0 0.375rem;
`;

const NotificationList = styled.div<{ $maxHeight: number }>`
  max-height: ${props => props.$maxHeight}px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  [data-theme="dark"] & {
    &::-webkit-scrollbar-track {
      background: #374151;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #6b7280;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  }
`;

const NotificationItem = styled.div<{ $priority: string; $unread: boolean }>`
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.$unread && `
    background: linear-gradient(90deg, #eff6ff 0%, #ffffff 100%);
    border-left: 4px solid #3b82f6;
  `}
  
  ${props => {
    switch (props.$priority) {
      case 'urgent':
        return `border-left: 4px solid #dc2626;`;
      case 'high':
        return `border-left: 4px solid #f59e0b;`;
      case 'normal':
        return `border-left: 4px solid #3b82f6;`;
      case 'low':
        return `border-left: 4px solid #6b7280;`;
      default:
        return `border-left: 4px solid #d1d5db;`;
    }
  }}

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }

  [data-theme="dark"] & {
    border-color: #4b5563;
    
    ${props => props.$unread && `
      background: linear-gradient(90deg, #1e3a8a 0%, #374151 100%);
    `}
    
    &:hover {
      background: #4b5563;
    }
  }
`;

const NotificationIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: white;
  margin-right: 0.75rem;
  flex-shrink: 0;
  
  ${props => {
    switch (props.$type) {
      case 'import_success':
        return `background: #10b981;`;
      case 'import_failed':
        return `background: #ef4444;`;
      case 'duplicate_detected':
        return `background: #f59e0b;`;
      case 'manual_review_required':
        return `background: #8b5cf6;`;
      case 'processing_complete':
        return `background: #06b6d4;`;
      case 'system_alert':
        return `background: #6b7280;`;
      default:
        return `background: #3b82f6;`;
    }
  }}
`;

const NotificationContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const NotificationDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationTitle = styled.div`
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
  line-height: 1.4;

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
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #9ca3af;

  [data-theme="dark"] & {
    color: #6b7280;
  }
`;

const NotificationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const QuickAction = styled.button<{ $variant: string }>`
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

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const FilterBar = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
  display: flex;
  gap: 0.5rem;
  align-items: center;

  [data-theme="dark"] & {
    border-color: #4b5563;
    background: #4b5563;
  }
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.75rem;
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

interface ImportStatusNotificationsProps {
  notifications?: ImportNotification[];
  settings?: NotificationSettings;
  onNotificationClick?: (notification: ImportNotification) => void;
  onNotificationAction?: (notificationId: string, actionType: string) => void;
  onSettingsChange?: (settings: Partial<NotificationSettings>) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  className?: string;
}

const ImportStatusNotifications: React.FC<ImportStatusNotificationsProps> = ({
  notifications = [],
  settings,
  onNotificationClick = () => {},
  onNotificationAction = () => {},
  onSettingsChange = () => {},
  onMarkAllRead = () => {},
  onClearAll = () => {},
  className
}) => {
  const { success } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const defaultSettings: NotificationSettings = {
    enabled: true,
    soundEnabled: true,
    showToasts: true,
    maxVisible: 5,
    autoArchiveDelay: 30000,
    filters: {
      types: [],
      priorities: [],
      portfolios: []
    },
    positioning: 'top-right',
    theme: 'auto'
  };

  const currentSettings = { ...defaultSettings, ...settings };

  // Mock notifications for demonstration
  const mockNotifications: ImportNotification[] = [
    {
      id: 'notif-1',
      type: 'import_success',
      title: 'Import Successful',
      message: 'AAPL purchase transaction imported successfully to TFSA Portfolio',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      priority: 'normal',
      status: 'unread',
      data: {
        emailSubject: 'Trade Confirmation - AAPL Purchase',
        portfolioId: 'TFSA Portfolio',
        transactionId: 'trans-789',
        processingTime: 2150
      },
      actions: [
        {
          label: 'View Transaction',
          type: 'primary',
          action: () => success('Navigation', 'Opening transaction details...')
        }
      ]
    },
    {
      id: 'notif-2',
      type: 'duplicate_detected',
      title: 'Duplicate Detected',
      message: 'Similar TSLA transaction found, sent to review queue',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      priority: 'high',
      status: 'unread',
      data: {
        emailSubject: 'Trade Confirmation - TSLA Sale',
        portfolioId: 'RRSP Portfolio',
        duplicateCount: 1,
        reviewQueue: 'manual-review'
      },
      actions: [
        {
          label: 'Review',
          type: 'primary',
          action: () => success('Navigation', 'Opening review queue...')
        },
        {
          label: 'Auto-Approve',
          type: 'secondary',
          action: () => success('Action', 'Transaction auto-approved')
        }
      ]
    },
    {
      id: 'notif-3',
      type: 'import_failed',
      title: 'Import Failed',
      message: 'Failed to process email: Symbol UNKNOWN_SYM not found',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      priority: 'urgent',
      status: 'read',
      data: {
        emailSubject: 'Trade Confirmation - UNKNOWN_SYM Purchase',
        portfolioId: 'Margin Account',
        errorCode: 'SYMBOL_NOT_FOUND'
      },
      actions: [
        {
          label: 'Retry',
          type: 'primary',
          action: () => success('Action', 'Retrying import...')
        },
        {
          label: 'Manual Fix',
          type: 'secondary',
          action: () => success('Navigation', 'Opening manual fix interface...')
        }
      ]
    }
  ];

  const currentNotifications = notifications.length > 0 ? notifications : mockNotifications;

  const filteredNotifications = currentNotifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return notif.status === 'unread';
    if (filter === 'urgent') return notif.priority === 'urgent' || notif.priority === 'high';
    return notif.type === filter;
  });

  const unreadCount = currentNotifications.filter(n => n.status === 'unread').length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'import_success': return <CheckCircle size={16} />;
      case 'import_failed': return <AlertTriangle size={16} />;
      case 'duplicate_detected': return <AlertCircle size={16} />;
      case 'manual_review_required': return <Users size={16} />;
      case 'processing_complete': return <Zap size={16} />;
      case 'system_alert': return <Info size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const handleNotificationClick = (notification: ImportNotification) => {
    // Mark as read
    onNotificationClick(notification);
  };

  const playNotificationSound = useCallback(() => {
    if (currentSettings.soundEnabled) {
      // In real implementation, this would play a notification sound
      console.log('🔊 Notification sound played');
    }
  }, [currentSettings.soundEnabled]);

  // Auto-play sound for new urgent notifications
  useEffect(() => {
    const urgentUnread = currentNotifications.filter(
      n => n.status === 'unread' && (n.priority === 'urgent' || n.priority === 'high')
    );
    
    if (urgentUnread.length > 0) {
      playNotificationSound();
    }
  }, [currentNotifications, playNotificationSound]);

  return (
    <NotificationContainer 
      $position={currentSettings.positioning} 
      $collapsed={collapsed}
      className={className}
    >
      <NotificationPanel $collapsed={collapsed}>
        <NotificationHeader>
          <HeaderTitle>
            <Bell size={16} />
            Import Notifications
            {unreadCount > 0 && <NotificationCount>{unreadCount}</NotificationCount>}
          </HeaderTitle>
          <HeaderActions>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSettingsChange({ soundEnabled: !currentSettings.soundEnabled })}
            >
              {currentSettings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {}}
            >
              <Settings size={14} />
            </Button>
          </HeaderActions>
        </NotificationHeader>

        {!collapsed && (
          <>
            {showFilters && (
              <FilterBar>
                <FilterButton
                  $active={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  All
                </FilterButton>
                <FilterButton
                  $active={filter === 'unread'}
                  onClick={() => setFilter('unread')}
                >
                  Unread
                </FilterButton>
                <FilterButton
                  $active={filter === 'urgent'}
                  onClick={() => setFilter('urgent')}
                >
                  Urgent
                </FilterButton>
                <FilterButton
                  $active={filter === 'import_success'}
                  onClick={() => setFilter('import_success')}
                >
                  Success
                </FilterButton>
                <FilterButton
                  $active={filter === 'import_failed'}
                  onClick={() => setFilter('import_failed')}
                >
                  Failed
                </FilterButton>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                  <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                    Mark All Read
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClearAll}>
                    <Archive size={12} />
                  </Button>
                </div>
              </FilterBar>
            )}

            <NotificationList $maxHeight={400}>
              {filteredNotifications.length === 0 ? (
                <EmptyState>
                  <Bell size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <div>No notifications to display</div>
                </EmptyState>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    $priority={notification.priority}
                    $unread={notification.status === 'unread'}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <NotificationContent>
                      <NotificationIcon $type={notification.type}>
                        {getNotificationIcon(notification.type)}
                      </NotificationIcon>
                      <NotificationDetails>
                        <NotificationTitle>{notification.title}</NotificationTitle>
                        <NotificationMessage>{notification.message}</NotificationMessage>
                        <NotificationMeta>
                          <Clock size={10} />
                          {formatDate(notification.timestamp)}
                          {notification.data.portfolioId && (
                            <>
                              <span>•</span>
                              <span>{notification.data.portfolioId}</span>
                            </>
                          )}
                          {notification.data.processingTime && (
                            <>
                              <span>•</span>
                              <span>{notification.data.processingTime}ms</span>
                            </>
                          )}
                        </NotificationMeta>
                        {notification.actions && notification.actions.length > 0 && (
                          <NotificationActions>
                            {notification.actions.map((action, index) => (
                              <QuickAction
                                key={index}
                                $variant={action.type}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.action();
                                  onNotificationAction(notification.id, action.label);
                                }}
                              >
                                {action.label}
                              </QuickAction>
                            ))}
                          </NotificationActions>
                        )}
                      </NotificationDetails>
                    </NotificationContent>
                  </NotificationItem>
                ))
              )}
            </NotificationList>
          </>
        )}
      </NotificationPanel>
    </NotificationContainer>
  );
};

export default ImportStatusNotifications;