import React, { useState } from 'react';
// Temporarily comment out the import to test if it's an import issue
// import { validateSymbolStandalone, testSOXLValidation } from '../../utils/symbolValidationTest';
import { EnhancedAISymbolParser } from '../../services/ai/enhancedSymbolParser';
import { YahooFinanceValidator } from '../../services/yahooFinanceValidator';

export const SymbolValidationTest: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    console.log('🚀 Starting validation test for query:', query);
    setResult(null);
    setError(null);
    setIsLoading(true);
    
    try {
      // Inline validation logic to test without import issues
      if (!query.trim()) {
        setError('Query cannot be empty');
        return;
      }

      // Parse the query using AI symbol parser
      const parseResult = await EnhancedAISymbolParser.parseQuery(query.trim());
      console.log('Parse result:', parseResult);
      
      if (!parseResult.parsedSymbol) {
        setError('Could not parse symbol from query');
        return;
      }

      // Validate the parsed symbol with Yahoo Finance
      const validationResult = await YahooFinanceValidator.validateSymbol(parseResult.parsedSymbol);
      console.log('Validation result:', validationResult);
      
      if (!validationResult.isValid) {
        setError(validationResult.error || 'Symbol validation failed');
        setResult(`❌ INVALID - Error: ${validationResult.error}`);
        return;
      }

      setResult(`✅ VALID - Parsed as: ${parseResult.parsedSymbol}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
      setResult(`❌ ERROR - ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    setResult('Suggestions feature coming soon...');
  };

  const handleTestSOXL = async () => {
    setResult(null);
    setError(null);
    setIsLoading(true);
    
    try {
      console.log('🧪 Testing SOXL Jun 6 $17 Call validation...');
      
      const query = 'SOXL Jun 6 $17 Call';
      
      // Inline the SOXL test logic
      const parseResult = await EnhancedAISymbolParser.parseQuery(query);
      console.log('📊 Parse Result:', parseResult);
      
      if (!parseResult.parsedSymbol) {
        setError('Could not parse SOXL symbol');
        setResult('❌ SOXL parsing failed');
        return;
      }

      const validationResult = await YahooFinanceValidator.validateSymbol(parseResult.parsedSymbol);
      console.log('📊 Validation Result:', validationResult);
      
      if (validationResult.isValid) {
        console.log('✅ SOXL VALIDATION PASSED!');
        console.log(`🎯 Parsed Symbol: ${parseResult.parsedSymbol}`);
        setResult(`✅ SOXL test PASSED! Parsed as: ${parseResult.parsedSymbol}`);
      } else {
        console.log('❌ SOXL VALIDATION FAILED!');
        console.log(`💥 Error: ${validationResult.error}`);
        setError(validationResult.error || 'SOXL validation failed');
        setResult('❌ SOXL test failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SOXL test failed';
      console.error('SOXL test error:', err);
      setError(errorMessage);
      setResult('❌ SOXL test error');
    } finally {
      setIsLoading(false);
    }
  };

  const testQueries = [
    'SOXL Jun 6 $17 Call',
    'AAPL',
    'TSLA Jul 15 $250 Put',
    'NVDA',
    'SPY Mar 21 $400 Call'
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Symbol Validation Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter symbol or natural language query"
          style={{ 
            width: '100%', 
            padding: '8px', 
            marginBottom: '10px',
            fontSize: '16px'
          }}
        />
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button 
            onClick={handleTest} 
            disabled={isLoading || !query.trim()}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Validating...' : 'Validate Symbol'}
          </button>
          
          <button 
            onClick={handleGetSuggestions} 
            disabled={isLoading || !query.trim()}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            Get Suggestions
          </button>
          
          <button 
            onClick={handleTestSOXL} 
            disabled={isLoading}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Test SOXL
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Quick Test Queries:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {testQueries.map((testQuery) => (
            <button
              key={testQuery}
              onClick={() => setQuery(testQuery)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {testQuery}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724',
          borderRadius: '4px'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h3>How it works:</h3>
        <ol>
          <li>Natural language queries (like "SOXL Jun 6 $17 Call") are parsed by the AI Symbol Parser</li>
          <li>The parser converts them to standardized option symbols (like "SOXL250606C00017000")</li>
          <li>The standardized symbol is then validated against Yahoo Finance patterns</li>
          <li>Valid symbols return true, invalid ones return false with an error message</li>
        </ol>
        
        <h3>🧪 Testing:</h3>
        <ul>
          <li><strong>Validate Symbol:</strong> Test any query you enter in the input field</li>
          <li><strong>Get Suggestions:</strong> Get parsing suggestions for your query</li>
          <li><strong>🧪 Test SOXL:</strong> Run the specific "SOXL Jun 6 $17 Call" test case that was originally failing</li>
        </ul>
      </div>
    </div>
  );
};
