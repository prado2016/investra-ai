import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  ExternalLink
} from 'lucide-react';
// Import types directly to avoid any module resolution issues
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  createdAt: Date;
}

// Animations
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

// Styled components
const NotificationContainer = styled.div<{ 
  $type: NotificationType; 
  $isLeaving?: boolean;
}>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-width: 500px;
  position: relative;
  ${props => props.$isLeaving ? css`
    animation: ${slideOut} 0.3s ease-out;
  ` : css`
    animation: ${slideIn} 0.3s ease-out;
  `}
  border-left: 4px solid;
  
  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return `
          background: #f0fdf4;
          border-left-color: #22c55e;
          color: #166534;
        `;
      case 'error':
        return `
          background: #fef2f2;
          border-left-color: #ef4444;
          color: #991b1b;
        `;
      case 'warning':
        return `
          background: #fffbeb;
          border-left-color: #f59e0b;
          color: #92400e;
        `;
      case 'info':
      default:
        return `
          background: #eff6ff;
          border-left-color: #3b82f6;
          color: #1e40af;
        `;
    }
  }}
`;

const IconContainer = styled.div<{ $type: NotificationType }>`
  flex-shrink: 0;
  margin-top: 0.125rem;
  
  svg {
    width: 20px;
    height: 20px;
    ${({ $type }) => {
      switch ($type) {
        case 'success':
          return 'color: #22c55e;';
        case 'error':
          return 'color: #ef4444;';
        case 'warning':
          return 'color: #f59e0b;';
        case 'info':
        default:
          return 'color: #3b82f6;';
      }
    }}
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.25;
  margin-bottom: 0.25rem;
`;

const Message = styled.div`
  font-size: 0.875rem;
  line-height: 1.4;
  opacity: 0.9;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  align-items: center;
`;

const ActionButton = styled.button<{ $type: NotificationType }>`
  background: none;
  border: 1px solid;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return `
          border-color: #22c55e;
          color: #22c55e;
          &:hover {
            background: #22c55e;
            color: white;
          }
        `;
      case 'error':
        return `
          border-color: #ef4444;
          color: #ef4444;
          &:hover {
            background: #ef4444;
            color: white;
          }
        `;
      case 'warning':
        return `
          border-color: #f59e0b;
          color: #f59e0b;
          &:hover {
            background: #f59e0b;
            color: white;
          }
        `;
      case 'info':
      default:
        return `
          border-color: #3b82f6;
          color: #3b82f6;
          &:hover {
            background: #3b82f6;
            color: white;
          }
        `;
    }
  }}
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
  
  &:hover {
    opacity: 1;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProgressBar = styled.div<{ $duration: number; $type: NotificationType }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info':
      default: return '#3b82f6';
    }
  }};
  ${props => css`animation: shrink ${props.$duration}ms linear;`}
  transform-origin: left;
  
  @keyframes shrink {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }
`;

// Icon mapping
const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle />;
    case 'error':
      return <XCircle />;
    case 'warning':
      return <AlertTriangle />;
    case 'info':
    default:
      return <Info />;
  }
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300); // Match animation duration
  };

  const handleActionClick = () => {
    if (notification.action) {
      notification.action.onClick();
      handleRemove();
    }
  };

  return (
    <NotificationContainer $type={notification.type} $isLeaving={isLeaving}>
      <IconContainer $type={notification.type}>
        {getIcon(notification.type)}
      </IconContainer>
      
      <Content>
        <Title>{notification.title}</Title>
        {notification.message && (
          <Message>{notification.message}</Message>
        )}
        
        {notification.action && (
          <Actions>
            <ActionButton
              $type={notification.type}
              onClick={handleActionClick}
            >
              <ExternalLink size={12} />
              {notification.action.label}
            </ActionButton>
          </Actions>
        )}
      </Content>
      
      {notification.dismissible && (
        <CloseButton onClick={handleRemove}>
          <X />
        </CloseButton>
      )}
      
      {notification.duration && notification.duration > 0 && !isLeaving && (
        <ProgressBar 
          $duration={notification.duration} 
          $type={notification.type}
        />
      )}
    </NotificationContainer>
  );
};

export default NotificationItem;
