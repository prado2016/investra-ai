/**
 * Basic Symbol Input Test
 * Test component that works without AI features
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { SymbolInput } from './SymbolInput';

const TestContainer = styled.div`
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const TestGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
`;

const BasicSymbolTest: React.FC = () => {
  const [symbol1, setSymbol1] = useState('');
  const [symbol2, setSymbol2] = useState('');

  return (
    <TestContainer>
      <h2>Basic Symbol Input Test (No AI)</h2>
      <p>This test works without AI services enabled:</p>
      
      <TestGroup>
        <Label>Traditional Symbol Input</Label>
        <SymbolInput
          value={symbol1}
          onChange={setSymbol1}
          placeholder="Enter stock symbol"
          enableAI={false}
        />
      </TestGroup>
      
      <TestGroup>
        <Label>Symbol Input with AI Disabled</Label>
        <SymbolInput
          value={symbol2}
          onChange={setSymbol2}
          placeholder="Another symbol input"
          enableAI={false}
          assetType="stock"
        />
      </TestGroup>
      
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '6px' }}>
        <strong>Values:</strong>
        <br />
        Symbol 1: {symbol1 || '(empty)'}
        <br />
        Symbol 2: {symbol2 || '(empty)'}
      </div>
    </TestContainer>
  );
};

export default BasicSymbolTest;
