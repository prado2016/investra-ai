/**
 * Quick AI Demo - Simple test component
 * Task 6: Gemini AI Service Layer verification
 */

import React, { useState } from 'react';
import { AIIntegrationService } from '../services/aiIntegrationService';

const QuickAIDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await AIIntegrationService.enhancedSymbolLookup(query);
      
      if (response.success) {
        setResults(response.results);
      } else {
        setError(response.error || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <h3>🧠 AI Symbol Lookup Demo</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for stocks (e.g., 'Apple', 'Microsoft', 'Tesla')"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '0.5rem'
          }}
        />
        
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          style={{
            padding: '0.5rem 1rem',
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          background: '#ffebee', 
          padding: '0.5rem', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          Error: {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h4>Results:</h4>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                background: '#f9f9f9'
              }}
            >
              <strong>{result.symbol}</strong> - {result.name}
              <br />
              <small>
                {result.exchange} | {result.assetType} | 
                Confidence: {Math.round(result.confidence * 100)}%
              </small>
              {result.description && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.9em' }}>
                  {result.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.8em', color: '#666' }}>
        💡 <strong>Tip:</strong> Make sure to add your Gemini API key in Settings first!
      </div>
    </div>
  );
};

export default QuickAIDemo;
