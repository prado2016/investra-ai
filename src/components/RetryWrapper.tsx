import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import type { RetryOptions } from '../hooks/useRetry';
import { useRetry } from '../hooks/useRetry';

const RetryContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
`;

const RetryStatus = styled.div<{ $variant: 'retrying' | 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'retrying':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        `;
      case 'error':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #ef4444;
        `;
      case 'success':
        return `
          background: #dcfce7;
          color: #166534;
          border: 1px solid #22c55e;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const AbortButton = styled.button`
  padding: 0.5rem 1rem;
  background: none;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

interface RetryWrapperProps<T> {
  operation: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  retryOptions?: RetryOptions;
  children?: (data: {
    execute: () => void;
    isRetrying: boolean;
    currentAttempt: number;
    lastError: Error | null;
    result?: T;
  }) => React.ReactNode;
  fallback?: React.ReactNode;
  showRetryUI?: boolean;
}

export function RetryWrapper<T>({
  operation,
  onSuccess,
  onError,
  retryOptions = {},
  children,
  fallback,
  showRetryUI = true
}: RetryWrapperProps<T>) {
  const [result, setResult] = useState<T | undefined>();
  const [hasSucceeded, setHasSucceeded] = useState(false);
  
  const retry = useRetry({
    maxAttempts: 3,
    baseDelay: 1000,
    ...retryOptions,
    onRetryAttempt: (attempt, error) => {
      retryOptions.onRetryAttempt?.(attempt, error);
    },
    onMaxAttemptsReached: (error) => {
      onError?.(error as Error);
      retryOptions.onMaxAttemptsReached?.(error);
    }
  });

  const execute = useCallback(async () => {
    try {
      const data = await retry.executeWithRetry(operation);
      setResult(data);
      setHasSucceeded(true);
      onSuccess?.(data);
    } catch (error) {
      setHasSucceeded(false);
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      onError?.(errorInstance);
    }
  }, [operation, retry, onSuccess, onError]);

  if (children) {
    return (
      <>
        {children({
          execute,
          isRetrying: retry.isRetrying,
          currentAttempt: retry.currentAttempt,
          lastError: retry.lastError as Error | null,
          result
        })}
      </>
    );
  }

  if (!showRetryUI) {
    return fallback || null;
  }

  const getStatusInfo = () => {
    if (hasSucceeded) {
      return {
        variant: 'success' as const,
        icon: <CheckCircle size={16} />,
        message: 'Operation completed successfully'
      };
    } else if (retry.isRetrying) {
      return {
        variant: 'retrying' as const,
        icon: <RefreshCw size={16} className="animate-spin" />,
        message: `Retrying... (Attempt ${retry.currentAttempt})`
      };
    } else if (retry.lastError) {
      return {
        variant: 'error' as const,
        icon: <AlertCircle size={16} />,
        message: `Error: ${(retry.lastError as Error)?.message || 'Something went wrong'}`
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <RetryContainer>
      {statusInfo && (
        <RetryStatus $variant={statusInfo.variant}>
          {statusInfo.icon}
          {statusInfo.message}
        </RetryStatus>
      )}
      
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <RetryButton 
          onClick={execute}
          disabled={retry.isRetrying}
        >
          {retry.isRetrying ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              {retry.totalAttempts === 0 ? 'Start' : 'Retry'}
            </>
          )}
        </RetryButton>
        
        {retry.isRetrying && (
          <AbortButton onClick={retry.abort}>
            Cancel
          </AbortButton>
        )}
      </div>
      
      {retry.totalAttempts > 0 && (
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#6b7280', 
          textAlign: 'center' 
        }}>
          Total attempts: {retry.totalAttempts}
        </div>
      )}
    </RetryContainer>
  );
}

export default RetryWrapper;
