import React from 'react';

/**
 * AI Symbol Input Test Component - Simplified for Production Build
 * This is a placeholder component to avoid build errors.
 */
const AISymbolInputTest: React.FC = () => {
  return (
    <div style={{
      padding: 'var(--space-8)',
      textAlign: 'center',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-primary)'
    }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
        AI Symbol Input Test
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        This testing component is currently disabled for production builds.
      </p>
      <div style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        background: 'var(--color-primary-50)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-primary-700)'
      }}>
        💡 <strong>Development Note:</strong> The full AI symbol testing interface will be available in development mode.
      </div>
    </div>
  );
};

export default AISymbolInputTest;
