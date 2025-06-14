/**
 * AI Lookup Button Component
 * Task 8: AI-powered symbol lookup button with loading states and error handling
 */

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Brain, AlertCircle, Loader } from 'lucide-react';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const ButtonContainer = styled.button<{ 
  $variant?: 'primary' | 'secondary' | 'minimal';
  $size?: 'small' | 'medium' | 'large';
  $isLoading?: boolean;
  $hasError?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
  font-family: var(--font-family-base);
  flex-shrink: 0;
  /* Fix tab navigation and positioning */
  margin-left: var(--space-1);
  outline: none;
  
  &:focus-visible {
    box-shadow: 0 0 0 2px var(--color-teal-500);
    outline: 2px solid transparent;
  }
  
  ${({ $size = 'medium' }) => {
    switch ($size) {
      case 'small':
        return `
          padding: var(--space-2);
          font-size: var(--text-xs);
          min-width: 32px;
          height: 32px;
        `;
      case 'large':
        return `
          padding: var(--space-3) var(--space-6);
          font-size: var(--text-base);
          min-width: 48px;
          height: 48px;
        `;
      default:
        return `
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          min-width: 40px;
          height: var(--input-height);
        `;
    }
  }}
  
  ${({ $variant = 'primary', $hasError }) => {
    if ($hasError) {
      return `
        background: var(--color-danger-50);
        color: var(--color-danger-700);
        border: 1px solid var(--color-danger-200);
        
        [data-theme="dark"] & {
          background: rgba(239, 68, 68, 0.2);
          color: var(--color-danger-400);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        &:hover { 
          background: var(--color-danger-100);
          
          [data-theme="dark"] & {
            background: rgba(239, 68, 68, 0.3);
          }
        }
      `;
    }
    
    switch ($variant) {
      case 'primary':
        return `
          background: var(--gradient-primary);
          color: var(--text-inverse);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-teal-600);
          
          [data-theme="dark"] & {
            background: var(--gradient-primary);
            color: var(--text-inverse);
            border-color: var(--color-teal-400);
          }
          
          &:hover:not(:disabled) { 
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
            background: linear-gradient(135deg, var(--color-teal-700) 0%, var(--color-primary-700) 100%);
            
            [data-theme="dark"] & {
              background: linear-gradient(135deg, var(--color-teal-400) 0%, var(--color-primary-400) 100%);
            }
          }
          &:active { transform: translateY(0); }
        `;
      case 'secondary':
        return `
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-primary);
          
          [data-theme="dark"] & {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border-color: var(--border-primary);
          }
          
          &:hover { 
            background: var(--bg-secondary);
            border-color: var(--border-secondary);
          }
        `;
      case 'minimal':
        return `
          background: transparent;
          color: var(--color-teal-600);
          border: 1px solid transparent;
          
          [data-theme="dark"] & {
            color: var(--color-teal-400);
          }
          border: 1px solid transparent;
          &:hover { 
            background: #f0f9ff;
            border-color: #93c5fd;
          }
        `;
    }
  }}
  
  ${({ $isLoading }) => $isLoading && css`
    animation: ${pulse} 2s infinite;
    cursor: not-allowed;
    pointer-events: none;
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const IconWrapper = styled.div<{ $isLoading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  
  ${({ $isLoading }) => $isLoading && css`
    animation: ${spin} 1s linear infinite;
  `}
`;

const LoadingOverlay = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.2s ease;
  pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'};
`;

const LoadingIcon = styled(Loader).withConfig({
  shouldForwardProp: (prop) => prop !== 'size'
})<{ size?: number }>`
  ${css`animation: ${spin} 1s linear infinite;`}
`;

const Tooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
  z-index: 1000;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1f2937;
  }
`;

interface AILookupButtonProps {
  onClick?: () => void;
  onSearchStart?: () => void;
  onSearchComplete?: (results: unknown) => void;
  onError?: (error: string) => void;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  showText?: boolean;
  tooltip?: string;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export const AILookupButton: React.FC<AILookupButtonProps> = ({
  onClick,
  onSearchStart,
  onSearchComplete,
  onError,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  showText = true,
  tooltip,
  children,
  className,
  'data-testid': testId,
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled) return;
    
    try {
      setHasError(false);
      onSearchStart?.();
      await onClick?.();
      onSearchComplete?.(null); // Placeholder for actual results
    } catch (error) {
      setHasError(true);
      const errorMessage = error instanceof Error ? error.message : 'AI lookup failed';
      onError?.(errorMessage);
      
      // Clear error state after 3 seconds
      setTimeout(() => setHasError(false), 3000);
    }
  };

  const getIcon = () => {
    if (hasError) return <AlertCircle size={16} />;
    if (isLoading) return <Loader size={16} />;
    return <Brain size={16} />;
  };

  const getText = () => {
    if (hasError) return 'Error';
    if (isLoading) return 'Searching...';
    return 'AI Search';
  };

  const getTooltipText = () => {
    if (tooltip) return tooltip;
    if (hasError) return 'AI search failed - click to retry';
    if (isLoading) return 'Searching for symbols...';
    if (disabled) return 'AI search not available';
    return 'Search for symbols using AI';
  };

  return (
    <ButtonContainer
      $variant={variant}
      $size={size}
      $isLoading={isLoading}
      $hasError={hasError}
      disabled={disabled || isLoading}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={className}
      data-testid={testId}
      {...props}
    >
      <IconWrapper $isLoading={isLoading}>
        {getIcon()}
      </IconWrapper>
      
      {showText && size !== 'small' && (
        <span>{children || getText()}</span>
      )}
      
      <LoadingOverlay $visible={isLoading && variant === 'primary'}>
        <LoadingIcon size={14} />
      </LoadingOverlay>
      
      <Tooltip $visible={showTooltip}>
        {getTooltipText()}
      </Tooltip>
    </ButtonContainer>
  );
};

export default AILookupButton;
