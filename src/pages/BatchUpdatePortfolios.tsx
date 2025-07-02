/**
 * Batch Update Portfolios Page
 * Allows admin users to run batch updates on transaction portfolio assignments
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertCircle, CheckCircle, RefreshCw, Database, Search, BarChart3 } from 'lucide-react';
import { batchUpdateTransactionPortfolios } from '../utils/batchUpdatePortfolios';
import { debugTransactionNotes } from '../utils/debugTransactionNotes';
import { analyzeAllTransactions } from '../utils/analyzeAllTransactions';
import { usePageTitle } from '../hooks/usePageTitle';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f1f5f9;
  }
`;

const PageDescription = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;

  [data-theme="dark"] & {
    color: #94a3b8;
  }
`;

const InfoCard = styled(Card)`
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  }
`;

const InfoTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f1f5f9;
  }
`;

const InfoText = styled.p`
  color: #475569;
  margin: 0 0 0.75rem 0;
  line-height: 1.6;

  [data-theme="dark"] & {
    color: #cbd5e1;
  }
`;

const ResultsContainer = styled.div`
  margin-top: 2rem;
`;

const ResultCard = styled(Card)<{ $type: 'success' | 'error' | 'info' }>`
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid ${props => {
    switch (props.$type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }};
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)';
      case 'error': return 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
      case 'info': return 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
      default: return 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
    }
  }};

  [data-theme="dark"] & {
    background: ${props => {
      switch (props.$type) {
        case 'success': return 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)';
        case 'error': return 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)';
        case 'info': return 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)';
        default: return 'linear-gradient(135deg, #374151 0%, #4b5563 100%)';
      }
    }};
  }
`;

const LogOutput = styled.pre`
  background: #1e293b;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  margin-top: 1rem;
`;

const LoadingSpinner = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default function BatchUpdatePortfolios() {
  usePageTitle('Batch Update Portfolios');
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Capture console.log output
  const originalConsoleLog = console.log;
  const captureLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    originalConsoleLog(message);
  };

  const runBatchUpdate = async () => {
    setIsRunning(true);
    setResults(null);
    setLogs([]);
    
    // Temporarily override console.log to capture output
    console.log = captureLog;
    
    try {
      captureLog('Starting batch update process...');
      const result = await batchUpdateTransactionPortfolios();
      setResults(result);
      captureLog(`Batch update completed. Success: ${result.success}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      captureLog(`Batch update failed: ${errorMsg}`);
      setResults({
        success: false,
        totalAnalyzed: 0,
        totalUpdated: 0,
        errors: [errorMsg],
        results: []
      });
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
      setIsRunning(false);
    }
  };

  const runDebugNotes = async () => {
    setLogs([]);
    
    // Temporarily override console.log to capture output
    console.log = captureLog;
    
    try {
      captureLog('Starting transaction notes debug...');
      await debugTransactionNotes();
      captureLog('Debug completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      captureLog(`Debug failed: ${errorMsg}`);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
  };

  const runAnalyzeAll = async () => {
    setLogs([]);
    
    // Temporarily override console.log to capture output
    console.log = captureLog;
    
    try {
      captureLog('Starting full transaction analysis...');
      await analyzeAllTransactions();
      captureLog('Analysis completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      captureLog(`Analysis failed: ${errorMsg}`);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Database />
          Batch Update Transaction Portfolios
        </PageTitle>
        <PageDescription>
          Fix existing transactions that were incorrectly assigned to TFSA portfolio by extracting the actual account type from raw email data.
        </PageDescription>
      </PageHeader>

      <InfoCard>
        <InfoTitle>
          <AlertCircle size={20} />
          What This Tool Does
        </InfoTitle>
        <InfoText>
          This utility analyzes all transactions that have raw email data in their notes field and extracts the actual account type (TFSA, RSP, MARGIN, etc.) to assign them to the correct portfolio.
        </InfoText>
        <InfoText>
          <strong>Process:</strong>
        </InfoText>
        <ul style={{ color: '#475569', marginLeft: '1.5rem', lineHeight: 1.6 }}>
          <li>Scans all transactions with email notes</li>
          <li>Extracts account type from patterns like "Account: *TFSA*"</li>
          <li>Maps account types to existing portfolios</li>
          <li>Updates transactions to use the correct portfolio</li>
        </ul>
      </InfoCard>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Button
          onClick={runAnalyzeAll}
          disabled={isRunning}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 2rem',
            background: '#06b6d4',
            borderColor: '#06b6d4'
          }}
        >
          <BarChart3 size={20} />
          Analyze All Transactions
        </Button>
        
        <Button
          onClick={runDebugNotes}
          disabled={isRunning}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 2rem',
            background: '#6366f1',
            borderColor: '#6366f1'
          }}
        >
          <Search size={20} />
          Debug Transaction Notes
        </Button>
        
        <Button
          onClick={runBatchUpdate}
          disabled={isRunning}
          style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}
        >
          {isRunning ? (
            <LoadingSpinner>
              <RefreshCw size={20} />
              Running Batch Update...
            </LoadingSpinner>
          ) : (
            <>
              <Database size={20} />
              Run Batch Update
            </>
          )}
        </Button>
      </div>

      {logs.length > 0 && (
        <LogOutput>
          {logs.join('\n')}
        </LogOutput>
      )}

      {results && (
        <ResultsContainer>
          <ResultCard $type={results.success ? 'success' : 'error'}>
            <InfoTitle>
              {results.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              Batch Update Results
            </InfoTitle>
            <InfoText>
              <strong>Total Analyzed:</strong> {results.totalAnalyzed} transactions<br />
              <strong>Total Updated:</strong> {results.totalUpdated} transactions<br />
              <strong>Errors:</strong> {results.errors.length}
            </InfoText>
            
            {results.errors.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong style={{ color: '#dc2626' }}>Errors:</strong>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {results.errors.map((error: string, index: number) => (
                    <li key={index} style={{ color: '#dc2626' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.results.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Sample Updates:</strong>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {results.results.slice(0, 5).map((update: any, index: number) => (
                    <li key={index} style={{ color: '#059669' }}>
                      Transaction {update.id.slice(0, 8)}... → {update.accountType} Portfolio
                    </li>
                  ))}
                  {results.results.length > 5 && (
                    <li style={{ color: '#6b7280' }}>
                      ... and {results.results.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </ResultCard>
        </ResultsContainer>
      )}
    </PageContainer>
  );
}