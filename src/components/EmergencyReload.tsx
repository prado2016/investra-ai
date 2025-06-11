/**
 * Emergency Page Reload Button
 * Quick fix button for when the page is broken
 */

import React from 'react';
import styled from 'styled-components';

const EmergencyButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  font-weight: bold;
  cursor: pointer;
  z-index: 9999;
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

interface Props {
  show?: boolean;
}

const EmergencyReload: React.FC<Props> = ({ show = true }) => {
  if (!show) return null;

  const handleEmergencyReload = () => {
    // Clear all state and reload
    if (typeof Storage !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    // Reset any global state
    (window as any).__authCallCount = 0;
    
    // Force reload
    window.location.reload();
  };

  return (
    <EmergencyButton onClick={handleEmergencyReload}>
      🚨 Emergency Reload
    </EmergencyButton>
  );
};

export default EmergencyReload;
