import React from 'react';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { OfflineProvider } from './contexts/OfflineContext';
import NotificationContainer from './components/NotificationContainer';
import SupabaseConnectionTest from './components/SupabaseConnectionTest';
import DatabaseVerificationTest from './components/DatabaseVerificationTest';
import AuthComponent from './components/auth/AuthComponent';
import ServiceLayerTest from './components/testing/ServiceLayerTest';
import SampleDataControl from './components/testing/SampleDataControl';
import RealtimeStatusComponent from './components/testing/RealtimeStatusComponent';
import OfflineStatusComponent from './components/testing/OfflineStatusComponent';
import PortfolioDemo from './components/demos/PortfolioDemo';
import RealtimePortfolioDemo from './components/demos/RealtimePortfolioDemo';
import DataMigrationComponent from './components/migration/DataMigrationComponent';

function TestComponent() {
  const { success, error, warning, info, clearAll } = useNotifications();

  const buttonStyle = {
    margin: '5px',
    padding: '10px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold' as const
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 Stock Tracker - Minimal Test</h1>
      <p>✅ React is working!</p>
      <p>✅ TypeScript is working!</p>
      <p>✅ Vite dev server is working!</p>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #0066cc' }}>
        <strong>Success!</strong> The basic app structure is loading correctly.
      </div>

      <SupabaseConnectionTest />

      <DatabaseVerificationTest />

      <ServiceLayerTest />

      <SampleDataControl />

      <RealtimeStatusComponent />

      <OfflineStatusComponent />

      <PortfolioDemo />

      <RealtimePortfolioDemo />

      <DataMigrationComponent />

      <AuthComponent />

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🔔 Notification System Test</h2>
        <p>Test the notification functionality that we just fixed:</p>
        
        <div style={{ marginTop: '15px' }}>
          <button 
            style={{ ...buttonStyle, backgroundColor: '#28a745', color: 'white' }}
            onClick={() => success('Success!', 'This is a success notification')}
          >
            Test Success
          </button>
          
          <button 
            style={{ ...buttonStyle, backgroundColor: '#dc3545', color: 'white' }}
            onClick={() => error('Error!', 'This is an error notification')}
          >
            Test Error
          </button>
          
          <button 
            style={{ ...buttonStyle, backgroundColor: '#ffc107', color: 'black' }}
            onClick={() => warning('Warning!', 'This is a warning notification')}
          >
            Test Warning
          </button>
          
          <button 
            style={{ ...buttonStyle, backgroundColor: '#17a2b8', color: 'white' }}
            onClick={() => info('Info!', 'This is an info notification')}
          >
            Test Info
          </button>
          
          <button 
            style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white' }}
            onClick={() => clearAll()}
          >
            Clear All
          </button>
        </div>
        
        <p style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
          ✅ If you can see these buttons and click them without console errors, 
          the NotificationContext import issue is completely resolved!
        </p>
        
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
          <strong>Success!</strong> NotificationContext is working! Click the buttons to see beautiful notifications appear in the top-right corner.
        </div>
      </div>
    </div>
  );
}

function MinimalApp() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <RealtimeProvider>
          <NotificationProvider maxNotifications={5} defaultDuration={5000}>
            <TestComponent />
            <NotificationContainer position="top-right" />
          </NotificationProvider>
        </RealtimeProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

export default MinimalApp;
