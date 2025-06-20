/**
 * Simple Notification List Component
 * Clean list of notifications without popups or sounds
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Info,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SimpleNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

const NotificationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const NotificationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
`;

const NotificationItem = styled(Card)<{ $type: 'success' | 'error' | 'warning' | 'info' }>`
  padding: 1rem;
  border-left: 4px solid ${props => {
    switch (props.$type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }};
  background: white;

  [data-theme="dark"] & {
    background: #374151;
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 0.5rem;
`;

const NotificationTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const NotificationMessage = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const NotificationTime = styled.div`
  color: #9ca3af;
  font-size: 0.75rem;

  [data-theme="dark"] & {
    color: #6b7280;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const SimpleNotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Load notifications (currently mock data)
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Mock notifications for now - replace with real API call
      const mockNotifications: SimpleNotification[] = [
        {
          id: '1',
          type: 'info',
          title: 'System Started',
          message: 'Email processing system is now running in manual review mode.',
          timestamp: new Date().toISOString()
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = () => {
    loadNotifications();
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getIcon = (type: SimpleNotification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} />;
      case 'error': return <AlertTriangle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'info': return <Info size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <NotificationContainer>
      <HeaderRow>
        <Title>Recent Activity</Title>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNotifications}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearNotifications}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </HeaderRow>

      <NotificationList>
        {loading ? (
          <EmptyState>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            Loading notifications...
          </EmptyState>
        ) : notifications.length === 0 ? (
          <EmptyState>
            <Info size={24} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            No recent activity
          </EmptyState>
        ) : (
          notifications.map((notification) => (
            <NotificationItem key={notification.id} $type={notification.type}>
              <NotificationHeader>
                <NotificationTitle>
                  {getIcon(notification.type)}
                  {notification.title}
                </NotificationTitle>
              </NotificationHeader>
              <NotificationMessage>{notification.message}</NotificationMessage>
              <NotificationTime>{formatTime(notification.timestamp)}</NotificationTime>
            </NotificationItem>
          ))
        )}
      </NotificationList>
    </NotificationContainer>
  );
};

export default SimpleNotificationList;