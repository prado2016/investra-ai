/**
 * AI Services Test Component
 * Task 6: Gemini AI Service Layer Integration Test
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Search, TestTube, Brain, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAIServices } from '../hooks/useAIServices';
import type { SymbolLookupRequest, SymbolLookupResult } from '../types/ai';

const TestContainer = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: #1f2937;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
`;

const SectionTitle = styled.h3`
  color: #374151;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'test' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  
  ${({ $variant = 'secondary' }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
          &:disabled { background: #94a3b8; cursor: not-allowed; }
        `;
      case 'test':
        return `
          background: #059669;
          color: white;
          &:hover { background: #047857; }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          &:hover { background: #e5e7eb; }
        `;
    }
  }}
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const StatusBadge = styled.div<{ $status: 'success' | 'error' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 0.5rem;
  
  ${({ $status }) => {
    switch ($status) {
      case 'success':
        return `
          background: #dcfce7;
          color: #166534;
        `;
      case 'error':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'warning':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
    }
  }}
`;

const ResultCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
`;

const AIServicesTest: React.FC = () => {
  const {
    isInitialized,
    availableProviders,
    activeProvider,
    lookupSymbols,
    isLookingUp,
    testConnection,
    healthStatus,
    refreshHealthStatus,
    lastError,
    clearError
  } = useAIServices();

  const [testQuery, setTestQuery] = useState('Apple stock');
  const [testResults, setTestResults] = useState<SymbolLookupResult[]>([]);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; error?: string; latency?: number }>>({});

  const handleSymbolLookup = async () => {
    if (!testQuery.trim()) return;

    const request: SymbolLookupRequest = {
      query: testQuery,
      maxResults: 5,
      includeAnalysis: false
    };

    const response = await lookupSymbols(request);
    
    if (response.success) {
      setTestResults(response.results);
    } else {
      setTestResults([]);
    }
  };

  const handleTestConnection = async () => {
    const result = await testConnection();
    setConnectionResults({ [activeProvider || 'unknown']: result });
  };

  const renderHealthStatus = () => {
    return Object.entries(healthStatus).map(([provider, status]) => (
      <div key={provider} style={{ marginBottom: '0.5rem' }}>
        <strong>{provider.toUpperCase()}:</strong>{' '}
        <StatusBadge $status={status.available ? 'success' : 'error'}>
          {status.available ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {status.available ? 'Available' : 'Unavailable'}
        </StatusBadge>
        {status.latency && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          ({status.latency}ms)
        </span>}
      </div>
    ));
  };

  const renderResults = () => {
    if (testResults.length === 0) return null;

    return testResults.map((result, index) => (
      <ResultCard key={index}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
              {result.symbol} - {result.name}
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
              {result.exchange} • {result.assetType.toUpperCase()}
            </p>
            {result.description && (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                {result.description}
              </p>
            )}
          </div>
          <StatusBadge $status={result.confidence > 0.8 ? 'success' : result.confidence > 0.5 ? 'warning' : 'error'}>
            {Math.round(result.confidence * 100)}%
          </StatusBadge>
        </div>
      </ResultCard>
    ));
  };

  return (
    <TestContainer>
      <Title>
        <Brain size={24} />
        AI Services Test Dashboard
      </Title>

      {lastError && (
        <Section style={{ background: '#fee2e2', borderColor: '#f87171' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
            <AlertCircle size={16} />
            <strong>Error:</strong> {lastError}
            <Button onClick={clearError} style={{ marginLeft: 'auto' }}>
              Clear
            </Button>
          </div>
        </Section>
      )}

      {/* Service Status */}
      <Section>
        <SectionTitle>
          <CheckCircle size={20} />
          Service Status
        </SectionTitle>
        
        <div style={{ marginBottom: '1rem' }}>
          <StatusBadge $status={isInitialized ? 'success' : 'warning'}>
            {isInitialized ? 'Initialized' : 'Initializing...'}
          </StatusBadge>
          
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Active Provider: {activeProvider || 'None'} | 
            Available: {availableProviders.join(', ') || 'None'}
          </span>
        </div>

        <Button onClick={refreshHealthStatus}>
          <RefreshCw size={16} />
          Refresh Status
        </Button>

        <div style={{ marginTop: '1rem' }}>
          {renderHealthStatus()}
        </div>
      </Section>

      {/* Connection Test */}
      <Section>
        <SectionTitle>
          <TestTube size={20} />
          Connection Test
        </SectionTitle>

        <Button 
          $variant="test" 
          onClick={handleTestConnection}
          disabled={!activeProvider}
        >
          <TestTube size={16} />
          Test Connection
        </Button>

        {Object.entries(connectionResults).map(([provider, result]) => (
          <div key={provider} style={{ marginTop: '1rem' }}>
            <strong>{provider}:</strong>{' '}
            <StatusBadge $status={result.success ? 'success' : 'error'}>
              {result.success ? 'Success' : 'Failed'}
            </StatusBadge>
            {result.latency && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              ({result.latency}ms)
            </span>}
            {result.error && (
              <div style={{ fontSize: '0.875rem', color: '#991b1b', marginTop: '0.25rem' }}>
                {result.error}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* Symbol Lookup Test */}
      <Section>
        <SectionTitle>
          <Search size={20} />
          Symbol Lookup Test
        </SectionTitle>

        <Input
          type="text"
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="Enter company name or description (e.g., 'Apple stock', 'Microsoft')"
        />

        <Button 
          $variant="primary" 
          onClick={handleSymbolLookup}
          disabled={isLookingUp || !activeProvider || !testQuery.trim()}
        >
          {isLookingUp ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
          {isLookingUp ? 'Looking up...' : 'Lookup Symbols'}
        </Button>

        <div style={{ marginTop: '1rem' }}>
          {renderResults()}
        </div>
      </Section>
    </TestContainer>
  );
};

export default AIServicesTest;
