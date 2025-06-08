/**
 * AI Symbol Parser Demo
 * Test the enhanced natural language symbol parsing
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { EnhancedSymbolInput } from '../EnhancedSymbolInput';
import type { SymbolLookupResult } from '../../types/ai';

const DemoContainer = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
`;

const TestSection = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
`;

const Title = styled.h2`
  color: #1f2937;
  margin-bottom: 1rem;
`;

const ExampleQueries = styled.div`
  background: #f9fafb;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
`;

const QueryExample = styled.div`
  margin: 0.5rem 0;
  font-family: monospace;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const Result = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 0.875rem;
`;

const examples = [
  "SOXL Jun 6 $17 Call",
  "AAPL June 21 $200 Call", 
  "TSLA put $250 July 18",
  "SPY Dec 15 $500 Call",
  "QQQ Nov 30 $400 Put",
  "NVDA call $800 Aug 15",
  "MSFT"
];

export const AISymbolParserDemo: React.FC = () => {
  const [testValue, setTestValue] = useState('');
  const [lastResult, setLastResult] = useState<SymbolLookupResult | null>(null);

  const handleChange = (value: string, metadata?: SymbolLookupResult) => {
    setTestValue(value);
    setLastResult(metadata || null);
    console.log('Symbol changed:', { value, metadata });
  };

  const handleExampleClick = (example: string) => {
    setTestValue(example);
    setLastResult(null);
  };

  return (
    <DemoContainer>
      <Title>🧠 AI Symbol Parser Demo</Title>
      
      <TestSection>
        <h3>Try Natural Language Queries</h3>
        <p>Type or click an example below to test AI symbol parsing:</p>
        
        <ExampleQueries>
          <strong>Example queries:</strong>
          {examples.map((example, index) => (
            <QueryExample 
              key={index} 
              onClick={() => handleExampleClick(example)}
            >
              "{example}"
            </QueryExample>
          ))}
        </ExampleQueries>

        <EnhancedSymbolInput
          value={testValue}
          onChange={handleChange}
          placeholder="Type a natural language query..."
          showAIButton={true}
          showSuggestions={true}
          showValidation={true}
        />

        {lastResult && (
          <Result>
            <strong>AI Result:</strong>
            <pre>{JSON.stringify(lastResult, null, 2)}</pre>
          </Result>
        )}

        <Result>
          <strong>Current Value:</strong> "{testValue}"
        </Result>
      </TestSection>

      <TestSection>
        <h3>How It Works</h3>
        <ul>
          <li><strong>Natural Language Processing:</strong> Type queries like "AAPL Jun 21 $200 Call"</li>
          <li><strong>Yahoo Finance Format:</strong> Converts to proper Yahoo symbols (e.g., "AAPL250621C00200000")</li>
          <li><strong>Real-time Validation:</strong> Validates symbols against Yahoo Finance API</li>
          <li><strong>Auto-completion:</strong> Automatically fills the validated symbol</li>
          <li><strong>Visual Feedback:</strong> Shows processing and conversion results</li>
        </ul>
      </TestSection>
    </DemoContainer>
  );
};

export default AISymbolParserDemo;
