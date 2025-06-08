import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Globe,
  Settings,
  Smartphone,
  Router
} from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';
import { useNotify } from '../hooks/useNotify';

// Animations
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
  min-height: 400px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  ${css`animation: ${fadeIn} 0.5s ease-out;`}
`;

const IconContainer = styled.div<{ $status: 'offline' | 'slow' | 'connecting' }>`
  margin-bottom: 2rem;
  
  svg {
    width: 64px;
    height: 64px;
    color: ${({ $status }) => {
      switch ($status) {
        case 'offline': return '#ef4444';
        case 'slow': return '#f59e0b';
        case 'connecting': return '#3b82f6';
        default: return '#6b7280';
      }
    }};
    
    ${({ $status }) => $status === 'connecting' && css`
      animation: ${pulse} 2s infinite;
    `}
  }
`;

const Title = styled.h2<{ $status: 'offline' | 'slow' | 'connecting' }>`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${({ $status }) => {
    switch ($status) {
      case 'offline': return '#991b1b';
      case 'slow': return '#92400e';
      case 'connecting': return '#1e40af';
      default: return '#374151';
    }
  }};
`;

const Description = styled.p`
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 500px;
`;

const StatusInfo = styled.div`
  background: #f3f4f6;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: #4b5563;
  border-left: 4px solid #d1d5db;
`;

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 160px;
  justify-content: center;
  
  ${({ variant }) => variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    border: none;
    
    &:hover {
      background: #2563eb;
    }
    
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    
    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `}
`;

const SuggestionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  text-align: left;
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const SuggestionIcon = styled.div`
  flex-shrink: 0;
  color: #6b7280;
  margin-top: 0.125rem;
`;

const SuggestionContent = styled.div``;

const SuggestionTitle = styled.div`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
`;

const SuggestionText = styled.div`
  color: #6b7280;
  font-size: 0.8rem;
  line-height: 1.4;
`;

interface NetworkErrorProps {
  type?: 'offline' | 'slow' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
  showSuggestions?: boolean;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  type = 'offline',
  title,
  message,
  onRetry,
  showSuggestions = true,
  className
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const network = useNetwork();
  const notify = useNotify();

  const getStatusInfo = () => {
    switch (type) {
      case 'offline':
        return {
          icon: <WifiOff />,
          title: title || 'No Internet Connection',
          description: message || 'It looks like you\'re not connected to the internet. Please check your connection and try again.',
          status: 'offline' as const
        };
      case 'slow':
        return {
          icon: <Wifi />,
          title: title || 'Slow Connection Detected',
          description: message || 'Your internet connection appears to be slow. Some features may not work properly.',
          status: 'slow' as const
        };
      case 'error':
        return {
          icon: <AlertTriangle />,
          title: title || 'Network Error',
          description: message || 'A network error occurred while loading data. Please try again.',
          status: 'offline' as const
        };
      default:
        return {
          icon: <WifiOff />,
          title: 'Connection Issue',
          description: 'There seems to be a problem with your connection.',
          status: 'offline' as const
        };
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry behavior
        const isConnected = await network.attemptReconnect();
        if (isConnected) {
          notify.success('Connection Restored', 'You\'re back online!');
        } else {
          notify.error('Still Offline', 'Unable to establish connection. Please try again.');
        }
      }
    } catch (error) {
      notify.apiError(error, 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const statusInfo = getStatusInfo();

  const suggestions = [
    {
      icon: <Wifi size={16} />,
      title: 'Check Wi-Fi Connection',
      text: 'Make sure you\'re connected to a working Wi-Fi network or mobile data.'
    },
    {
      icon: <Router size={16} />,
      title: 'Restart Router',
      text: 'Try unplugging your router for 30 seconds, then plug it back in.'
    },
    {
      icon: <Smartphone size={16} />,
      title: 'Check Other Devices',
      text: 'See if other devices can connect to the internet on the same network.'
    },
    {
      icon: <Settings size={16} />,
      title: 'Network Settings',
      text: 'Check your device\'s network settings or contact your internet provider.'
    }
  ];

  return (
    <Container className={className}>
      <IconContainer $status={statusInfo.status}>
        {isRetrying ? <RefreshCw className="animate-spin" /> : statusInfo.icon}
      </IconContainer>
      
      <Title $status={statusInfo.status}>
        {statusInfo.title}
      </Title>
      
      <Description>
        {statusInfo.description}
      </Description>

      {network.reconnectAttempts > 0 && (
        <StatusInfo>
          Reconnection attempts: {network.reconnectAttempts}
          {network.lastOnlineTime && (
            <div>Last online: {network.lastOnlineTime.toLocaleTimeString()}</div>
          )}
        </StatusInfo>
      )}

      <ActionContainer>
        <Button 
          variant="primary" 
          onClick={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Try Again
            </>
          )}
        </Button>
        
        <Button onClick={handleRefreshPage}>
          <Globe size={16} />
          Refresh Page
        </Button>
      </ActionContainer>

      {showSuggestions && type === 'offline' && (
        <>
          <Description style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            Here are some things you can try:
          </Description>
          
          <SuggestionList>
            {suggestions.map((suggestion, index) => (
              <SuggestionItem key={index}>
                <SuggestionIcon>
                  {suggestion.icon}
                </SuggestionIcon>
                <SuggestionContent>
                  <SuggestionTitle>{suggestion.title}</SuggestionTitle>
                  <SuggestionText>{suggestion.text}</SuggestionText>
                </SuggestionContent>
              </SuggestionItem>
            ))}
          </SuggestionList>
        </>
      )}
    </Container>
  );
};

export default NetworkError;
