import React from 'react';
import styled from 'styled-components';
import { Cloud, CloudOff, Activity } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

const StatusBar = styled.div<{ $isOnline: boolean; $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  padding: 0.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  transform: translateY(${props => props.$isVisible ? '0' : '-100%'});
  
  ${({ $isOnline }) => $isOnline ? `
    background: #059669;
    color: white;
  ` : `
    background: #ef4444;
    color: white;
  `}
`;

const StatusContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const ConnectionInfo = styled.span`
  opacity: 0.9;
  font-size: 0.8rem;
`;

interface OfflineIndicatorProps {
  showWhenOnline?: boolean;
  autoHideDelay?: number; // ms
  showConnectionInfo?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showWhenOnline = false,
  autoHideDelay = 3000,
  showConnectionInfo = false
}) => {
  const network = useNetwork();
  const [wasOffline, setWasOffline] = React.useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = React.useState(false);

  // Track offline/online transitions
  React.useEffect(() => {
    if (!network.isOnline) {
      setWasOffline(true);
      setShowOnlineMessage(false);
    } else if (wasOffline && network.isOnline) {
      setShowOnlineMessage(true);
      
      if (autoHideDelay > 0) {
        const timer = setTimeout(() => {
          setShowOnlineMessage(false);
          setWasOffline(false);
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [network.isOnline, wasOffline, autoHideDelay]);

  const shouldShow = !network.isOnline || (showWhenOnline && showOnlineMessage);

  const getStatusMessage = () => {
    if (!network.isOnline) {
      return {
        icon: <CloudOff size={16} />,
        message: 'You are currently offline',
        info: network.reconnectAttempts > 0 ? 
          `Reconnection attempts: ${network.reconnectAttempts}` : 
          'Check your internet connection'
      };
    } else if (showOnlineMessage) {
      return {
        icon: <Cloud size={16} />,
        message: 'Connection restored',
        info: network.effectiveType ? 
          `Connection: ${network.effectiveType.toUpperCase()}` : 
          'You are back online'
      };
    }
    return null;
  };

  const statusInfo = getStatusMessage();
  if (!statusInfo) return null;

  return (
    <StatusBar $isOnline={network.isOnline} $isVisible={shouldShow}>
      <StatusContent>
        {statusInfo.icon}
        <span>{statusInfo.message}</span>
        {showConnectionInfo && statusInfo.info && (
          <ConnectionInfo>• {statusInfo.info}</ConnectionInfo>
        )}
      </StatusContent>
    </StatusBar>
  );
};

// Network status indicator for navigation/header
const NavIndicator = styled.div<{ $isOnline: boolean; $isSlowConnection: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  
  ${({ $isOnline, $isSlowConnection }) => {
    if (!$isOnline) {
      return `
        background: #fee2e2;
        color: #991b1b;
      `;
    } else if ($isSlowConnection) {
      return `
        background: #fef3c7;
        color: #92400e;
      `;
    } else {
      return `
        background: #dcfce7;
        color: #166534;
      `;
    }
  }}
`;

interface NetworkStatusIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showLabel = true,
  className
}) => {
  const network = useNetwork();

  const getStatusInfo = () => {
    if (!network.isOnline) {
      return {
        icon: <CloudOff size={12} />,
        label: 'Offline',
        color: 'offline' as const
      };
    } else if (network.isSlowConnection) {
      return {
        icon: <Activity size={12} />,
        label: 'Slow',
        color: 'slow' as const
      };
    } else {
      return {
        icon: <Cloud size={12} />,
        label: 'Online',
        color: 'online' as const
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <NavIndicator 
      $isOnline={network.isOnline}
      $isSlowConnection={network.isSlowConnection}
      className={className}
      title={`Network Status: ${statusInfo.label}${
        network.effectiveType ? ` (${network.effectiveType.toUpperCase()})` : ''
      }`}
    >
      {statusInfo.icon}
      {showLabel && <span>{statusInfo.label}</span>}
    </NavIndicator>
  );
};

export default OfflineIndicator;
