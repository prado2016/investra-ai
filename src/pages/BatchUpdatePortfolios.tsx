/**
 * Batch Update Portfolios Page
 * Allows admin users to run batch updates on transaction portfolio assignments
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertCircle, CheckCircle, RefreshCw, Database, Search, BarChart3, Target, TrendingUp, Mail, Inbox, FileText } from 'lucide-react';
import { batchUpdateTransactionPortfolios } from '../utils/batchUpdatePortfolios';
import { debugTransactionNotes } from '../utils/debugTransactionNotes';
import { analyzeAllTransactions } from '../utils/analyzeAllTransactions';
import { batchUpdateCoveredCalls, detectCoveredCallOpportunities } from '../utils/batchUpdateCoveredCalls';
import { SupabaseService } from '../services/supabaseService';
import { usePageTitle } from '../hooks/usePageTitle';
import ManualReassignmentTool from '../components/ManualReassignmentTool';
import BatchPositionManager from '../components/BatchPositionManager';
import BatchAssetClassificationFixer from '../components/BatchAssetClassificationFixer';

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
  
  // Email tables state
  const [inboxEmails, setInboxEmails] = useState<any[]>([]);
  const [processedEmails, setProcessedEmails] = useState<any[]>([]);
  const [emailStats, setEmailStats] = useState<any>(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailTablesVisible, setEmailTablesVisible] = useState(false);

  // Load email tables data
  const loadEmailTables = async () => {
    setLoadingEmails(true);
    try {
      const [inboxResult, processedResult, statsResult] = await Promise.all([
        SupabaseService.email.getImapInboxEmails(),
        SupabaseService.email.getProcessedEmails(),
        SupabaseService.email.getEmailTableStats()
      ]);

      if (inboxResult.success) {
        setInboxEmails(inboxResult.data);
      }
      if (processedResult.success) {
        setProcessedEmails(processedResult.data);
      }
      if (statsResult.success) {
        setEmailStats(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to load email tables:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Load email data when tables become visible
  useEffect(() => {
    if (emailTablesVisible) {
      loadEmailTables();
    }
  }, [emailTablesVisible]);

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

  const runCoveredCallDetection = async () => {
    setLogs([]);
    
    // Temporarily override console.log to capture output
    console.log = captureLog;
    
    try {
      captureLog('Starting covered call detection...');
      const result = await detectCoveredCallOpportunities();
      
      if (result.success) {
        captureLog(`Found ${result.potentialCoveredCalls.length} potential covered call transactions`);
        result.potentialCoveredCalls.forEach(cc => {
          captureLog(`  - ${cc.portfolioName}: ${cc.symbol} on ${cc.transactionDate} (Premium: $${cc.premiumReceived})`);
        });
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => captureLog(`ERROR: ${error}`));
      }
      
      captureLog('Detection completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      captureLog(`Detection failed: ${errorMsg}`);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
  };

  const runCoveredCallBatchUpdate = async () => {
    setIsRunning(true);
    setResults(null);
    setLogs([]);
    
    // Temporarily override console.log to capture output
    console.log = captureLog;
    
    try {
      captureLog('Starting covered call batch update...');
      const result = await batchUpdateCoveredCalls();
      setResults(result);
      captureLog(`Batch update completed. Success: ${result.success}`);
      captureLog(`Portfolios processed: ${result.portfoliosProcessed}`);
      captureLog(`Covered calls found: ${result.coveredCallsFound}`);
      captureLog(`Transactions tagged: ${result.totalTagged}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      captureLog(`Covered call batch update failed: ${errorMsg}`);
      setResults({
        success: false,
        totalAnalyzed: 0,
        totalTagged: 0,
        coveredCallsFound: 0,
        orphanSellsFound: 0,
        portfoliosProcessed: 0,
        errors: [errorMsg],
        results: []
      });
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
      setIsRunning(false);
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
          Fix existing transactions that were incorrectly assigned to TFSA portfolio and identify covered call transactions for proper P/L calculation.
        </PageDescription>
      </PageHeader>

      <InfoCard>
        <InfoTitle>
          <AlertCircle size={20} />
          What This Tool Does
        </InfoTitle>
        <InfoText>
          This utility analyzes all transactions to fix portfolio assignments and identify covered call options for proper P/L calculation.
        </InfoText>
        <InfoText>
          <strong>Available Operations:</strong>
        </InfoText>
        <ul style={{ color: '#475569', marginLeft: '1.5rem', lineHeight: 1.6 }}>
          <li><strong>Portfolio Assignment:</strong> Extracts account types from email notes and assigns to correct portfolios</li>
          <li><strong>Covered Call Detection:</strong> Identifies option sells without sufficient underlying stock positions</li>
          <li><strong>Covered Call Tagging:</strong> Tags covered call transactions for proper P/L calculation</li>
          <li><strong>P/L Optimization:</strong> Ensures covered call premiums and buybacks are calculated correctly</li>
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
          onClick={runCoveredCallDetection}
          disabled={isRunning}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 2rem',
            background: '#f59e0b',
            borderColor: '#f59e0b'
          }}
        >
          <Target size={20} />
          Detect Covered Calls
        </Button>
        
        <Button
          onClick={runCoveredCallBatchUpdate}
          disabled={isRunning}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 2rem',
            background: '#10b981',
            borderColor: '#10b981'
          }}
        >
          {isRunning ? (
            <LoadingSpinner>
              <RefreshCw size={20} />
              Processing Covered Calls...
            </LoadingSpinner>
          ) : (
            <>
              <TrendingUp size={20} />
              Tag Covered Calls
            </>
          )}
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
              Run Portfolio Update
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
              <strong>Total Updated:</strong> {results.totalUpdated || results.totalTagged} transactions<br />
              {results.coveredCallsFound !== undefined && (
                <>
                  <strong>Covered Calls Found:</strong> {results.coveredCallsFound}<br />
                  <strong>Portfolios Processed:</strong> {results.portfoliosProcessed}<br />
                </>
              )}
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

            {results.results && results.results.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>
                  {results.coveredCallsFound !== undefined ? 'Portfolio Analysis:' : 'Sample Updates:'}
                </strong>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {results.coveredCallsFound !== undefined ? (
                    // Covered call results
                    results.results.slice(0, 5).map((result: any, index: number) => (
                      <li key={index} style={{ color: '#059669' }}>
                        {result.portfolioName}: {result.analysis.newRules.length} covered calls found
                      </li>
                    ))
                  ) : (
                    // Regular portfolio update results
                    results.results.slice(0, 5).map((update: any, index: number) => (
                      <li key={index} style={{ color: '#059669' }}>
                        Transaction {update.id?.slice(0, 8) || 'Unknown'}... → {update.accountType} Portfolio
                      </li>
                    ))
                  )}
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

      {/* Email Tables Section */}
      <InfoCard style={{ marginTop: '3rem' }}>
        <InfoTitle>
          <Mail size={24} />
          Email Tables Monitoring
        </InfoTitle>
        <InfoText>
          View the contents of both imap_inbox and processed_email tables to verify that emails are properly moving between tables.
        </InfoText>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button
            onClick={() => setEmailTablesVisible(!emailTablesVisible)}
            style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}
          >
            {emailTablesVisible ? 'Hide Email Tables' : 'Show Email Tables'}
          </Button>
          
          {emailTablesVisible && (
            <Button
              onClick={loadEmailTables}
              disabled={loadingEmails}
              style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}
            >
              {loadingEmails ? (
                <LoadingSpinner>
                  <RefreshCw size={16} />
                  Loading...
                </LoadingSpinner>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Refresh
                </>
              )}
            </Button>
          )}
        </div>
      </InfoCard>

      {emailTablesVisible && (
        <>
          {/* Email Statistics */}
          {emailStats && (
            <ResultCard $type="info" style={{ marginBottom: '2rem' }}>
              <InfoTitle>
                <BarChart3 size={20} />
                Email Tables Summary
              </InfoTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>📥 IMAP Inbox:</strong>
                  <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                    Total: {emailStats.inbox.count}<br />
                    Pending: {emailStats.inbox.pending}<br />
                    Processing: {emailStats.inbox.processing}<br />
                    Error: {emailStats.inbox.error}
                  </div>
                </div>
                <div>
                  <strong>📤 Processed:</strong>
                  <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                    Total: {emailStats.processed.count}<br />
                    Approved: {emailStats.processed.approved}<br />
                    Rejected: {emailStats.processed.rejected}
                  </div>
                </div>
              </div>
            </ResultCard>
          )}

          {/* IMAP Inbox Table */}
          <Card style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <InfoTitle>
              <Inbox size={20} />
              IMAP Inbox Table ({inboxEmails.length} emails)
            </InfoTitle>
            {inboxEmails.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>From</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboxEmails.slice(0, 10).map((email) => (
                      <tr key={email.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>
                          {email.id.toString().slice(0, 8)}...
                        </td>
                        <td style={{ padding: '0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {email.subject || 'No Subject'}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{email.from_email}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: email.status === 'pending' ? '#fef3c7' : 
                                           email.status === 'processing' ? '#dbeafe' :
                                           email.status === 'error' ? '#fee2e2' : '#f3f4f6',
                            color: email.status === 'pending' ? '#92400e' :
                                  email.status === 'processing' ? '#1e40af' :
                                  email.status === 'error' ? '#991b1b' : '#374151'
                          }}>
                            {email.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                          {new Date(email.received_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inboxEmails.length > 10 && (
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    Showing first 10 of {inboxEmails.length} emails
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No emails in inbox</p>
            )}
          </Card>

          {/* Processed Emails Table */}
          <Card style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <InfoTitle>
              <FileText size={20} />
              Processed Emails Table ({processedEmails.length} emails)
            </InfoTitle>
            {processedEmails.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>From</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Result</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Transaction ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedEmails.slice(0, 10).map((email) => (
                      <tr key={email.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>
                          {email.id.toString().slice(0, 8)}...
                        </td>
                        <td style={{ padding: '0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {email.subject || 'No Subject'}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{email.from_email}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: email.processing_result === 'approved' ? '#d1fae5' : 
                                           email.processing_result === 'rejected' ? '#fee2e2' : '#f3f4f6',
                            color: email.processing_result === 'approved' ? '#065f46' :
                                  email.processing_result === 'rejected' ? '#991b1b' : '#374151'
                          }}>
                            {email.processing_result}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {email.transaction_id ? email.transaction_id.toString().slice(0, 8) + '...' : 'None'}
                        </td>
                        <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                          {new Date(email.processed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {processedEmails.length > 10 && (
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    Showing first 10 of {processedEmails.length} emails
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No processed emails</p>
            )}
          </Card>
        </>
      )}

      <ManualReassignmentTool />
      
      <BatchPositionManager />
      
      <BatchAssetClassificationFixer />
    </PageContainer>
  );
}