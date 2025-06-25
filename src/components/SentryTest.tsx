import React from 'react';
import { Button } from './ui';
import { captureError, addBreadcrumb, Sentry } from '../lib/sentry';

const SentryTest: React.FC = () => {
  const testError = () => {
    addBreadcrumb('User clicked test error button', 'user');
    captureError(new Error('Test error from frontend'), {
      component: 'SentryTest',
      action: 'manual_test',
      timestamp: new Date().toISOString()
    });
  };

  const testException = () => {
    addBreadcrumb('User clicked test exception button', 'user');
    // This will trigger the ErrorBoundary
    throw new Error('Test exception that should be caught by ErrorBoundary');
  };

  const testPerformance = () => {
    addBreadcrumb('User clicked test performance button', 'user');
    const transaction = Sentry.startTransaction({ name: 'test-transaction' });
    
    // Simulate some work
    setTimeout(() => {
      transaction.finish();
    }, 1000);
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', margin: '1rem' }}>
      <h3>Sentry Test Panel</h3>
      <p>Use these buttons to test Sentry error reporting:</p>
      
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button onClick={testError} variant="outline">
          Test Error Capture
        </Button>
        
        <Button onClick={testException} variant="outline">
          Test Error Boundary
        </Button>
        
        <Button onClick={testPerformance} variant="outline">
          Test Performance
        </Button>
      </div>
      
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
        Check your Sentry dashboard to see if errors are being captured.
      </p>
    </div>
  );
};

export default SentryTest;