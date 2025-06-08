/**
 * AI Symbol Lookup API Test Component
 * Task 7: Test component for AI Symbol Lookup API endpoints
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Search, Check, AlertCircle, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { useAISymbolLookup } from '../hooks/useAISymbolLookup';
import type { 
  SymbolLookupResponse, 
  SymbolSuggestionResponse, 
  SymbolValidationResponse, 
  BatchSymbolLookupResponse, 
  SymbolInsightsResponse,
  SymbolLookupResult 
} from '../types/ai';

// Interface for provider status in health check
interface ProviderStatus {
  available: boolean;
  latency?: number;
  error?: string;
}

const TestContainer = styled.div`
  max-width: 900px;
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
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
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
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

const ResultCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
`;

const StatusBadge = styled.span<{ $status: 'success' | 'error' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  
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

const AISymbolLookupAPITest: React.FC = () => {
  const {
    searchSymbols,
    isSearching,
    getSuggestions,
    isLoadingSuggestions,
    validateSymbol,
    isValidating,
    batchLookup,
    isBatchProcessing,
    getMarketInsights,
    isAnalyzing,
    getHealthStatus,
    clearCache,
    lastError,
    clearError
  } = useAISymbolLookup();

  // State for test inputs
  const [searchQuery, setSearchQuery] = useState('Apple');
  const [suggestionQuery, setSuggestionQuery] = useState('AAPL');
  const [validationSymbol, setValidationSymbol] = useState('AAPL');
  const [batchQueries, setBatchQueries] = useState('Apple,Microsoft,Google');
  const [insightsSymbol, setInsightsSymbol] = useState('AAPL');

  // State for results
  const [searchResults, setSearchResults] = useState<SymbolLookupResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SymbolSuggestionResponse | null>(null);
  const [validation, setValidation] = useState<SymbolValidationResponse | null>(null);
  const [batchResults, setBatchResults] = useState<BatchLookupResponse | null>(null);
  const [insights, setInsights] = useState<MarketInsightsResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<Record<string, unknown> | null>(null);

  // Test functions
  const handleSearch = async () => {
    const response = await searchSymbols(searchQuery, { maxResults: 5 });
    setSearchResults(response);
  };

  const handleSuggestions = async () => {
    const response = await getSuggestions(suggestionQuery, { limit: 3 });
    setSuggestions(response);
  };

  const handleValidation = async () => {
    const response = await validateSymbol(validationSymbol);
    setValidation(response);
  };

  const handleBatchLookup = async () => {
    const queries = batchQueries.split(',').map(q => q.trim()).filter(q => q);
    const response = await batchLookup(queries, { maxResultsPerQuery: 2 });
    setBatchResults(response);
  };

  const handleInsights = async () => {
    const response = await getMarketInsights(insightsSymbol, { analysisType: 'trend' });
    setInsights(response);
  };

  const handleHealthCheck = async () => {
    const response = await getHealthStatus();
    setHealthStatus(response);
  };

  const handleClearCache = () => {
    const result = clearCache();
    alert(`Cleared ${result.cleared} cache entries`);
  };

  return (
    <TestContainer>
      <Title>
        <Zap size={24} />
        AI Symbol Lookup API Test
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

      {/* Symbol Search */}
      <Section>
        <SectionTitle>
          <Search size={20} />
          Symbol Search
        </SectionTitle>
        
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter company name or description"
        />
        
        <Button 
          $variant="primary"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search Symbols'}
        </Button>

        {searchResults && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Results:</strong>
            {searchResults.success ? (
              searchResults.data?.results?.map((result: SymbolLookupResult, index: number) => (
                <ResultCard key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{result.symbol}</strong> - {result.name}
                      <br />
                      <small>{result.exchange} | {result.assetType}</small>
                    </div>
                    <StatusBadge $status={result.confidence > 0.8 ? 'success' : 'warning'}>
                      {Math.round(result.confidence * 100)}%
                    </StatusBadge>
                  </div>
                </ResultCard>
              ))
            ) : (
              <div style={{ color: '#991b1b' }}>Error: {searchResults.error?.message}</div>
            )}
          </div>
        )}
      </Section>

      {/* Symbol Suggestions */}
      <Section>
        <SectionTitle>
          <BarChart3 size={20} />
          Symbol Suggestions
        </SectionTitle>
        
        <Input
          value={suggestionQuery}
          onChange={(e) => setSuggestionQuery(e.target.value)}
          placeholder="Type partial symbol or company name"
        />
        
        <Button 
          $variant="primary"
          onClick={handleSuggestions}
          disabled={isLoadingSuggestions}
        >
          {isLoadingSuggestions ? 'Loading...' : 'Get Suggestions'}
        </Button>

        {suggestions && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Suggestions:</strong>
            {suggestions.success ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {suggestions.data?.suggestions?.map((symbol: string, index: number) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#e0f2fe',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: '#991b1b' }}>Error: {suggestions.error?.message}</div>
            )}
          </div>
        )}
      </Section>

      {/* Symbol Validation */}
      <Section>
        <SectionTitle>
          <Check size={20} />
          Symbol Validation
        </SectionTitle>
        
        <Input
          value={validationSymbol}
          onChange={(e) => setValidationSymbol(e.target.value)}
          placeholder="Enter symbol to validate"
        />
        
        <Button 
          $variant="primary"
          onClick={handleValidation}
          disabled={isValidating}
        >
          {isValidating ? 'Validating...' : 'Validate Symbol'}
        </Button>

        {validation && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Validation Result:</strong>
            {validation.success ? (
              <ResultCard>
                <StatusBadge $status={validation.data?.isValid ? 'success' : 'error'}>
                  {validation.data?.isValid ? 'Valid' : 'Invalid'}
                </StatusBadge>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Symbol:</strong> {validation.data?.symbol}<br />
                  <strong>Confidence:</strong> {Math.round((validation.data?.confidence || 0) * 100)}%
                  {validation.data?.suggestion && (
                    <>
                      <br />
                      <strong>Suggestion:</strong> {validation.data.suggestion}
                    </>
                  )}
                </div>
              </ResultCard>
            ) : (
              <div style={{ color: '#991b1b' }}>Error: {validation.error?.message}</div>
            )}
          </div>
        )}
      </Section>

      {/* Batch Lookup */}
      <Section>
        <SectionTitle>
          <BarChart3 size={20} />
          Batch Lookup
        </SectionTitle>
        
        <Input
          value={batchQueries}
          onChange={(e) => setBatchQueries(e.target.value)}
          placeholder="Enter multiple queries separated by commas"
        />
        
        <Button 
          $variant="primary"
          onClick={handleBatchLookup}
          disabled={isBatchProcessing}
        >
          {isBatchProcessing ? 'Processing...' : 'Batch Lookup'}
        </Button>

        {batchResults && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Batch Results:</strong>
            {batchResults.success ? (
              <>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0' }}>
                  {batchResults.data?.successfulQueries} of {batchResults.data?.totalQueries} successful
                </div>
                {batchResults.data?.results?.map((result: SymbolLookupResult, index: number) => (
                  <ResultCard key={index}>
                    <strong>Query:</strong> {result.query}
                    <StatusBadge $status={result.success ? 'success' : 'error'}>
                      {result.success ? 'Success' : 'Failed'}
                    </StatusBadge>
                    {result.success && (
                      <div style={{ marginTop: '0.5rem' }}>
                        {result.symbols?.map((symbol: SymbolLookupResult, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.875rem' }}>
                            {symbol.symbol} - {symbol.name} ({Math.round(symbol.confidence * 100)}%)
                          </div>
                        ))}
                      </div>
                    )}
                    {!result.success && result.error && (
                      <div style={{ color: '#991b1b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {result.error}
                      </div>
                    )}
                  </ResultCard>
                ))}
              </>
            ) : (
              <div style={{ color: '#991b1b' }}>Error: {batchResults.error?.message}</div>
            )}
          </div>
        )}
      </Section>

      {/* Market Insights */}
      <Section>
        <SectionTitle>
          <TrendingUp size={20} />
          Market Insights
        </SectionTitle>
        
        <Input
          value={insightsSymbol}
          onChange={(e) => setInsightsSymbol(e.target.value)}
          placeholder="Enter symbol for market insights"
        />
        
        <Button 
          $variant="primary"
          onClick={handleInsights}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Get Insights'}
        </Button>

        {insights && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Market Insights:</strong>
            {insights.success ? (
              <ResultCard>
                <h4>{insights.data?.symbol}</h4>
                <div style={{ marginBottom: '1rem' }}>
                  <StatusBadge $status={
                    insights.data?.insights?.sentiment === 'bullish' ? 'success' :
                    insights.data?.insights?.sentiment === 'bearish' ? 'error' : 'warning'
                  }>
                    {insights.data?.insights?.sentiment}
                  </StatusBadge>
                  <StatusBadge $status={
                    insights.data?.insights?.riskLevel === 'low' ? 'success' :
                    insights.data?.insights?.riskLevel === 'high' ? 'error' : 'warning'
                  }>
                    Risk: {insights.data?.insights?.riskLevel}
                  </StatusBadge>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Summary:</strong>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                    {insights.data?.insights?.summary}
                  </p>
                </div>
                {insights.data?.recommendations?.length > 0 && (
                  <div>
                    <strong>Recommendations:</strong>
                    <ul style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                      {insights.data.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </ResultCard>
            ) : (
              <div style={{ color: '#991b1b' }}>Error: {insights.error?.message}</div>
            )}
          </div>
        )}
      </Section>

      {/* Health Status & Cache */}
      <Section>
        <SectionTitle>
          <Check size={20} />
          System Status
        </SectionTitle>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <Button onClick={handleHealthCheck}>
            Check Health
          </Button>
          <Button onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>

        {healthStatus && (
          <div>
            <strong>Health Status:</strong>
            {healthStatus.success ? (
              <ResultCard>
                <StatusBadge $status={
                  healthStatus.data?.status === 'healthy' ? 'success' :
                  healthStatus.data?.status === 'degraded' ? 'warning' : 'error'
                }>
                  {healthStatus.data?.status}
                </StatusBadge>
                <div style={{ marginTop: '1rem' }}>
                  <strong>Providers:</strong>
                  {Object.entries(healthStatus.data?.providers || {}).map(([provider, status]: [string, ProviderStatus]) => (
                    <div key={provider} style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                      <strong>{provider}:</strong>{' '}
                      <StatusBadge $status={status.available ? 'success' : 'error'}>
                        {status.available ? 'Available' : 'Unavailable'}
                      </StatusBadge>
                      {status.latency && <span> ({status.latency}ms)</span>}
                    </div>
                  ))}
                </div>
              </ResultCard>
            ) : (
              <div style={{ color: '#991b1b' }}>Error: {healthStatus.error?.message}</div>
            )}
          </div>
        )}
      </Section>
    </TestContainer>
  );
};

export default AISymbolLookupAPITest;
