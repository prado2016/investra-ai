import React from 'react';

/**
 * Service Layer Test Component - Simplified for Production Build
 */
const ServiceLayerTest: React.FC = () => {
  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-primary)'
    }}>
      <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        Service Layer Test
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
        Service layer testing is disabled in production builds.
      </p>
    </div>
  );
};

export default ServiceLayerTest;
