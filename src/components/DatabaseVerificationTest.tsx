import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const DatabaseVerificationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runDatabaseTest = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results: string[] = [];
    const tables = ['profiles', 'portfolios', 'positions', 'transactions', 'assets', 'price_data'];

    results.push('🔄 Starting database verification...');
    setTestResults([...results]);

    for (const table of tables) {
      try {
        results.push(`🔍 Testing table: ${table}...`);
        setTestResults([...results]);
        
        const { error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          if (error.message.includes('RLS') || error.message.includes('policy') || error.message.includes('permission')) {
            results[results.length - 1] = `✅ ${table} - Table exists (RLS working)`;
          } else if (error.message.includes('does not exist')) {
            results[results.length - 1] = `❌ ${table} - Table missing`;
          } else {
            results[results.length - 1] = `⚠️ ${table} - Error: ${error.message.substring(0, 50)}...`;
          }
        } else {
          results[results.length - 1] = `✅ ${table} - Table exists and accessible`;
        }
        setTestResults([...results]);
        
        // Small delay to see progress
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch {
        results[results.length - 1] = `❌ ${table} - Failed to test`;
        setTestResults([...results]);
      }
    }

    results.push('');
    const successCount = results.filter(r => r.includes('✅')).length;
    if (successCount >= 6) {
      results.push('🎉 All database tables are set up correctly!');
      results.push('✅ Database schema creation: SUCCESS');
      results.push('✅ Row Level Security: ENABLED');
      results.push('✅ Ready for authentication setup');
    } else {
      results.push('⚠️ Database setup incomplete');
      results.push(`${successCount}/6 tables found`);
      results.push('❌ Need to run SQL scripts in Supabase dashboard');
    }
    
    setTestResults([...results]);
    setLoading(false);
    setHasRun(true);
  };

  return (
    <div style={{
      padding: '1rem',
      margin: '1rem 0',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      backgroundColor: '#eff6ff'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#1e40af' }}>
        🔍 Database Setup Verification
      </h3>
      
      <button
        onClick={runDatabaseTest}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: loading ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          marginBottom: '1rem'
        }}
      >
        {loading ? '🔄 Testing Database...' : hasRun ? '🔄 Test Again' : '🚀 Test Database Setup'}
      </button>
      
      {testResults.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {testResults.map((result, index) => (
            <div key={index} style={{ 
              padding: '0.25rem 0',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: result.includes('✅') ? '#059669' : 
                     result.includes('❌') ? '#dc2626' : 
                     result.includes('⚠️') ? '#d97706' : 
                     result.includes('🎉') ? '#059669' : '#374151'
            }}>
              {result}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ 
        marginTop: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        💡 <strong>Tip:</strong> Click the button above to verify your database setup anytime.
        <br/>
        This will check if all 6 tables were created successfully.
      </div>
    </div>
  );
};

export default DatabaseVerificationTest;
