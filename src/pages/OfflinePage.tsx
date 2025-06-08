import React from 'react';
import styled from 'styled-components';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
`;

const BackgroundPattern = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  background-image: 
    radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, white 2px, transparent 2px);
  background-size: 100px 100px;
  background-position: 0 0, 50px 50px;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  z-index: 1;
`;

const OfflineCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 2rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 40px;
    height: 40px;
    color: white;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
  
  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: center;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  
  ${({ variant }) => variant === 'primary' ? `
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  ` : `
    background: white;
    color: #374151;
    border: 2px solid #e5e7eb;
    
    &:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }
  `}
`;

const Footer = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
`;

const TipSection = styled.div`
  margin-top: 2rem;
  padding: 1rem;
  background: #eff6ff;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
`;

const TipTitle = styled.div`
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const TipText = styled.div`
  color: #1e40af;
  font-size: 0.8rem;
  line-height: 1.4;
`;

interface OfflinePageProps {
  onRetry?: () => void;
  showReturnHome?: boolean;
}

export const OfflinePage: React.FC<OfflinePageProps> = ({
  onRetry,
  showReturnHome = true
}) => {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const network = useNetwork();

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      if (onRetry) {
        await onRetry();
      } else {
        await network.attemptReconnect();
        
        if (network.isOnline) {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const formatUptime = (date: Date | null) => {
    if (!date) return 'Unknown';
    
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  return (
    <PageContainer>
      <BackgroundPattern />
      
      <Content>
        <OfflineCard>
          <IconWrapper>
            <WifiOff />
          </IconWrapper>
          
          <Title>You're Offline</Title>
          
          <Subtitle>
            It looks like you've lost your internet connection. 
            Don't worry, you can try reconnecting or check back later.
          </Subtitle>

          {(network.reconnectAttempts > 0 || network.lastOnlineTime) && (
            <StatsContainer>
              {network.reconnectAttempts > 0 && (
                <StatItem>
                  <StatValue>{network.reconnectAttempts}</StatValue>
                  <StatLabel>Reconnect Attempts</StatLabel>
                </StatItem>
              )}
              
              {network.lastOnlineTime && (
                <StatItem>
                  <StatValue>{formatUptime(network.lastOnlineTime)}</StatValue>
                  <StatLabel>Last Online</StatLabel>
                </StatItem>
              )}
              
              <StatItem>
                <StatValue>{network.isOnline ? 'Online' : 'Offline'}</StatValue>
                <StatLabel>Current Status</StatLabel>
              </StatItem>
            </StatsContainer>
          )}

          <ActionButtons>
            <Button 
              variant="primary" 
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Try Again
                </>
              )}
            </Button>
            
            {showReturnHome && (
              <Button onClick={handleGoHome}>
                <Home size={16} />
                Go Home
              </Button>
            )}
          </ActionButtons>

          <TipSection>
            <TipTitle>💡 Pro Tip</TipTitle>
            <TipText>
              This page works offline! You can still view previously loaded data 
              and the app will automatically reconnect when your internet returns.
            </TipText>
          </TipSection>
        </OfflineCard>
      </Content>

      <Footer>
        <div>Your data is safe and will sync when connection is restored</div>
        <div style={{ marginTop: '0.5rem', opacity: 0.7 }}>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </Footer>
    </PageContainer>
  );
};

export default OfflinePage;
