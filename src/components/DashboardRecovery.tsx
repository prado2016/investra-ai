/**
 * Dashboard Recovery Component
 * Handles common dashboard errors and provides recovery options
 */

import React from 'react';
import styled from 'styled-components';
import { enhancedSupabase } from '../lib/enhancedSupabase';
import { emergencyStop } from '../utils/emergencyStop';
import { requestDebouncer } from '../utils/requestDebouncer';

const RecoveryContainer = styled.div`
  background: var(--bg-secondary);
  border: 2px solid var(--color-warning);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin: 20px;
  text-align: center;
`;

const RecoveryTitle = styled.h2`
  color: var(--color-warning);
  margin-bottom: 16px;
  font-size: 18px;
`;

const RecoveryButton = styled.button`
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  margin: 8px;
  cursor: pointer;
  font-weight: 600;
  
  &:hover {
    opacity: 0.8;
  }
  
  &.emergency {
    background: var(--color-error);
  }
`;

const StatusText = styled.p`
  color: var(--text-secondary);
  margin: 16px 0;
  font-size: 14px;
`;

interface Props {
  error?: string;
  onRecovery?: () => void;
}

const DashboardRecovery: React.FC<Props> = ({ error, onRecovery }) => {
  const handleFullReset = () => {
    console.log('🔧 Performing full system reset...');
    
    // Reset all systems
    enhancedSupabase.resetCircuitBreaker();
    requestDebouncer.clearAll();
    emergencyStop.deactivate();
    
    // Clear browser state
    if (typeof Storage !== 'undefined') {
      localStorage.removeItem('portfolios');
      localStorage.removeItem('transactions');
      sessionStorage.clear();
    }
    
    // Reload the page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleQuickFix = () => {
    console.log('⚡ Performing quick fix...');
    
    // Reset circuit breaker and debouncer
    enhancedSupabase.resetCircuitBreaker();
    requestDebouncer.clearAll();
    
    // Trigger recovery callback
    if (onRecovery) {
      setTimeout(onRecovery, 500);
    }
  };

  const handleEmergencyStop = () => {
    const status = emergencyStop.getStatus();
    if (status.isActive) {
      emergencyStop.deactivate();
    } else {
      emergencyStop.activate('Manual emergency stop from dashboard');
    }
  };

  return (
    <RecoveryContainer>
      <RecoveryTitle>⚠️ Dashboard Recovery</RecoveryTitle>
      
      {error && (
        <StatusText>
          <strong>Error:</strong> {error}
        </StatusText>
      )}
      
      <StatusText>
        The dashboard encountered an issue. Try one of these recovery options:
      </StatusText>
      
      <div>
        <RecoveryButton onClick={handleQuickFix}>
          🔧 Quick Fix
        </RecoveryButton>
        
        <RecoveryButton onClick={handleFullReset}>
          🔄 Full Reset & Reload
        </RecoveryButton>
        
        <RecoveryButton 
          className="emergency" 
          onClick={handleEmergencyStop}
        >
          🛑 Emergency Stop
        </RecoveryButton>
      </div>
      
      <StatusText>
        <small>
          Quick Fix: Resets connections and clears caches<br/>
          Full Reset: Reloads the entire application<br/>
          Emergency Stop: Halts all API requests
        </small>
      </StatusText>
    </RecoveryContainer>
  );
};

export default DashboardRecovery;
