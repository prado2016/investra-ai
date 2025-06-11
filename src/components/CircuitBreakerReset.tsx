/**
 * Emergency Circuit Breaker Reset Button
 * For development debugging when circuit breaker is stuck open
 */

import React from 'react';
import styled from 'styled-components';
import { enhancedSupabase } from '../lib/enhancedSupabase';

const ResetButton = styled.button`
  position: fixed;
  bottom: 180px;
  right: 20px;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  z-index: 1001;
  box-shadow: var(--shadow-md);

  &:hover {
    background: var(--color-error-dark, #dc3545);
  }

  &:active {
    transform: translateY(1px);
  }
`;

interface Props {
  show?: boolean;
}

const CircuitBreakerReset: React.FC<Props> = ({ show = process.env.NODE_ENV === 'development' }) => {
  if (!show) return null;

  const handleReset = () => {
    enhancedSupabase.resetCircuitBreaker();
    
    // Also reload the page to clear any stuck states
    if (window.confirm('Circuit breaker reset! Reload page to clear stuck states?')) {
      window.location.reload();
    }
  };

  return (
    <ResetButton onClick={handleReset} title="Reset circuit breaker and reload page">
      🔄 Reset CB
    </ResetButton>
  );
};

export default CircuitBreakerReset;
