import React from 'react';
import styled from 'styled-components';
import { Spinner } from './ui';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  blur?: boolean;
  className?: string;
}

const OverlayContainer = styled.div`
  position: relative;
  display: contents;
`;

const Overlay = styled.div<{ $isVisible: boolean; $blur: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: ${props => props.$blur ? 'blur(2px)' : 'none'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: ${props => props.$isVisible ? 1 : 0};
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  border-radius: inherit;
`;

const LoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
`;

const LoadingMessage = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: inherit;
`;

const ContentWrapper = styled.div<{ $isLoading: boolean; $blur: boolean }>`
  transition: filter 0.2s ease;
  filter: ${props => props.$isLoading && props.$blur ? 'blur(1px)' : 'none'};
  pointer-events: ${props => props.$isLoading ? 'none' : 'auto'};
`;

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  blur = false,
  className
}) => {
  return (
    <OverlayContainer className={className}>
      <ContentWrapper $isLoading={isLoading} $blur={blur}>
        {children}
      </ContentWrapper>
      
      <Overlay $isVisible={isLoading} $blur={blur}>
        <LoadingContent>
          <Spinner size="lg" />
          {message && <LoadingMessage>{message}</LoadingMessage>}
        </LoadingContent>
      </Overlay>
    </OverlayContainer>
  );
};

// Full-screen loading overlay
const FullScreenOverlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: ${props => props.$isVisible ? 1 : 0};
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const FullScreenContent = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid ${props => props.theme.colors.border};
  max-width: 400px;
  margin: 2rem;
`;

const FullScreenMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  text-align: center;
`;

const FullScreenSubMessage = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  text-align: center;
  margin-top: -0.5rem;
`;

interface FullScreenLoadingProps {
  isLoading: boolean;
  message?: string;
  subMessage?: string;
}

export const FullScreenLoading: React.FC<FullScreenLoadingProps> = ({
  isLoading,
  message = 'Loading...',
  subMessage
}) => {
  return (
    <FullScreenOverlay $isVisible={isLoading}>
      <FullScreenContent>
        <Spinner size="lg" />
        <FullScreenMessage>{message}</FullScreenMessage>
        {subMessage && <FullScreenSubMessage>{subMessage}</FullScreenSubMessage>}
      </FullScreenContent>
    </FullScreenOverlay>
  );
};

// Inline loading component for smaller areas
const InlineContainer = styled.div<{ $height?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: ${props => props.$height || 'auto'};
  gap: 1rem;
`;

const InlineMessage = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  text-align: center;
`;

interface InlineLoadingProps {
  message?: string;
  height?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Loading...',
  height,
  size = 'md',
  className
}) => {
  return (
    <InlineContainer $height={height} className={className}>
      <Spinner size={size} />
      <InlineMessage>{message}</InlineMessage>
    </InlineContainer>
  );
};

// Loading state for tables and lists
const TableLoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 2rem;
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

interface TableLoadingProps {
  rows?: number;
  message?: string;
}

export const TableLoading: React.FC<TableLoadingProps> = ({
  message = 'Loading data...'
}) => {
  return (
    <TableLoadingContainer>
      <InlineLoading message={message} size="md" />
    </TableLoadingContainer>
  );
};

// Skeleton loading for consistent placeholder content
const SkeletonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
`;

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.border} 25%,
    ${props => props.theme.colors.surface} 50%,
    ${props => props.theme.colors.border} 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  height: ${props => props.$height || '1rem'};
  width: ${props => props.$width || '100%'};
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

interface SkeletonLoadingProps {
  lines?: number;
  heights?: string[];
  widths?: string[];
}

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  lines = 3,
  heights = [],
  widths = []
}) => {
  return (
    <SkeletonContainer>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLine
          key={index}
          $height={heights[index] || '1rem'}
          $width={widths[index] || (index === 0 ? '60%' : index === lines - 1 ? '40%' : '80%')}
        />
      ))}
    </SkeletonContainer>
  );
};

export default LoadingOverlay;
