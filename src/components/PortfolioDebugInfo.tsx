import React from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { useAuth } from '../contexts/AuthProvider';

/**
 * Portfolio Debug Component
 * Shows current portfolio state for debugging purposes
 */
export const PortfolioDebugInfo: React.FC = () => {
  const { user } = useAuth();
  const { portfolios, activePortfolio, loading, error } = usePortfolios();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>📊 Portfolio Debug</h4>
      <div>User ID: {user?.id || 'Not logged in'}</div>
      <div>Loading: {loading ? '⏳ Yes' : '✅ No'}</div>
      <div>Error: {error || 'None'}</div>
      <div>Portfolios: {portfolios.length}</div>
      <div>Active: {activePortfolio?.name || 'None'}</div>
      <div>Active ID: {activePortfolio?.id || 'None'}</div>
      <hr style={{ margin: '10px 0', opacity: 0.3 }} />
      <div style={{ fontSize: '10px', opacity: 0.7 }}>
        Page: {window.location.pathname}
      </div>
    </div>
  );
};

export default PortfolioDebugInfo;
