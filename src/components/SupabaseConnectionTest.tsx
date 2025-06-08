import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const SupabaseConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection by getting the current user (will be null if not authenticated, but connection works)
        const { data, error } = await supabase.auth.getUser();
        
        if (error && error.message !== 'JWT expired') {
          throw error;
        }
        
        setConnectionStatus('connected');
        console.log('✅ Supabase connection successful!', { user: data.user });
      } catch (err) {
        console.error('❌ Supabase connection failed:', err);
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return '🔄';
      case 'connected': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing Supabase connection...';
      case 'connected': return 'Supabase connected successfully!';
      case 'error': return `Connection failed: ${error}`;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return '#f59e0b';
      case 'connected': return '#10b981';
      case 'error': return '#ef4444';
    }
  };

  return (
    <div style={{
      padding: '1rem',
      margin: '1rem 0',
      border: '2px solid',
      borderColor: getStatusColor(),
      borderRadius: '8px',
      backgroundColor: `${getStatusColor()}10`
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: getStatusColor() }}>
        {getStatusIcon()} Supabase Connection Status
      </h3>
      <p style={{ margin: 0, color: getStatusColor(), fontWeight: 500 }}>
        {getStatusText()}
      </p>
      {connectionStatus === 'connected' && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <p>🌐 Project URL: {import.meta.env.VITE_SUPABASE_URL}</p>
          <p>🔑 API Key configured: ✅</p>
        </div>
      )}
    </div>
  );
};

export default SupabaseConnectionTest;
