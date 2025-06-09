import React from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

const Container = styled.div<{ $position: NotificationPosition }>`
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  
  ${({ $position }) => {
    switch ($position) {
      case 'top-right':
        return `
          top: 1rem;
          right: 1rem;
        `;
      case 'top-left':
        return `
          top: 1rem;
          left: 1rem;
        `;
      case 'bottom-right':
        return `
          bottom: 1rem;
          right: 1rem;
        `;
      case 'bottom-left':
        return `
          bottom: 1rem;
          left: 1rem;
        `;
      case 'top-center':
        return `
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'bottom-center':
        return `
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
        `;
      default:
        return `
          top: 1rem;
          right: 1rem;
        `;
    }
  }}
  
  @media (max-width: 640px) {
    left: 1rem;
    right: 1rem;
    transform: none;
    
    ${({ $position }) => {
      if ($position.startsWith('top')) {
        return 'top: 1rem;';
      } else {
        return 'bottom: 1rem;';
      }
    }}
  }
`;

const NotificationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  pointer-events: auto;
  
  & > * {
    pointer-events: auto;
  }
`;

type NotificationPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'bottom-right' 
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

interface NotificationContainerProps {
  position?: NotificationPosition;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  position = 'top-right'
}) => {
  const { notifications, removeNotification } = useNotifications();

  // Render notifications in a portal to ensure they appear above everything
  return createPortal(
    <Container $position={position}>
      <NotificationList>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </NotificationList>
    </Container>,
    document.body
  );
};

export default NotificationContainer;
