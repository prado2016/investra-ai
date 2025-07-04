/**
 * Batch Asset Classification Fixer Component
 * Allows admin users to scan and fix asset classification issues
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { AlertCircle, CheckCircle, RefreshCw, Tag, TrendingUp, AlertTriangle, Search, RotateCcw } from 'lucide-react';
import { detectAssetType, getAssetTypeWithOverride } from '../utils/assetCategorization';
import { supabase } from '../lib/supabase';

const ComponentContainer = styled.div`
  margin-top: 3rem;
`;

const ComponentHeader = styled.div`
  margin-bottom: 2rem;
`;

const ComponentTitle = styled.h2`
  font-size: 1.5rem;
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

const ComponentDescription = styled.p`
  font-size: 1rem;
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
  border-left: 4px solid #f59e0b;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
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

const ResultCard = styled(Card)<{ $type: 'success' | 'error' | 'warning' | 'info' }>`
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid ${props => {
    switch (props.$type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }};
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)';
      case 'error': return 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
      case 'warning': return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
      case 'info': return 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
      default: return 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
    }
  }};

  [data-theme="dark"] & {
    background: ${props => {
      switch (props.$type) {
        case 'success': return 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)';
        case 'error': return 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)';
        case 'warning': return 'linear-gradient(135deg, #92400e 0%, #d97706 100%)';
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

const IssuesTable = styled.div`
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-primary);
  margin-top: 1rem;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-primary);
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
  gap: 1rem;
  padding: 1rem;
  align-items: center;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-card);
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const StatusBadge = styled.span<{ type: 'correct' | 'incorrect' | 'manual' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.type) {
      case 'correct':
        return `
          background-color: var(--color-success-100);
          color: var(--color-success-700);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-success-500)/0.2);
            color: var(--color-success-300);
          }
        `;
      case 'incorrect':
        return `
          background-color: var(--color-danger-100);
          color: var(--color-danger-700);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-danger-500)/0.2);
            color: var(--color-danger-300);
          }
        `;
      case 'manual':
        return `
          background-color: var(--color-warning-100);
          color: var(--color-warning-700);
          
          [data-theme="dark"] & {
            background-color: hsla(var(--color-warning-500)/0.2);
            color: var(--color-warning-300);
          }
        `;
      default:
        return `
          background-color: var(--color-gray-100);
          color: var(--color-gray-700);
          
          [data-theme="dark"] & {
            background-color: var(--color-gray-700);
            color: var(--color-gray-200);
          }
        `;
    }
  }}
`;

interface AssetClassificationIssue {
  symbol: string;
  currentType: string;
  detectedType: string;
  transactionCount: number;
  status: 'correct' | 'incorrect' | 'manual';
  hasManualOverride: boolean;
}

interface ScanResults {
  totalAssets: number;
  totalIssues: number;
  fixedCount: number;
  issues: AssetClassificationIssue[];
}

const BatchAssetClassificationFixer: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const scanAssets = async () => {
    setIsScanning(true);
    setLogs([]);
    setScanResults(null);

    try {
      addLog('Starting asset classification scan...');

      // Get all unique assets from transactions
      const { data: assets, error } = await supabase
        .from('assets')
        .select('symbol, asset_type')
        .order('symbol');

      if (error) {
        throw new Error(`Failed to fetch assets: ${error.message}`);
      }

      addLog(`Found ${assets.length} assets to analyze`);

      const issues: AssetClassificationIssue[] = [];
      let processedCount = 0;

      for (const asset of assets) {
        const symbol = asset.symbol;
        const currentType = asset.asset_type;
        
        // Get automatic detection result
        const detectedType = detectAssetType(symbol);
        
        // Get manual override if exists
        const typeWithOverride = getAssetTypeWithOverride(symbol);
        const hasManualOverride = typeWithOverride !== detectedType;

        // Count transactions for this asset
        const { count: transactionCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('asset_symbol', symbol);

        // Determine status
        let status: 'correct' | 'incorrect' | 'manual' = 'correct';
        
        if (hasManualOverride) {
          status = 'manual';
          if (currentType !== typeWithOverride) {
            issues.push({
              symbol,
              currentType: currentType || 'unknown',
              detectedType: `${detectedType} → ${typeWithOverride} (manual)`,
              transactionCount: transactionCount || 0,
              status,
              hasManualOverride
            });
          }
        } else if (currentType !== detectedType) {
          status = 'incorrect';
          issues.push({
            symbol,
            currentType: currentType || 'unknown',
            detectedType: detectedType || 'unknown',
            transactionCount: transactionCount || 0,
            status,
            hasManualOverride
          });
        }

        processedCount++;
        if (processedCount % 50 === 0) {
          addLog(`Processed ${processedCount}/${assets.length} assets...`);
        }
      }

      const results: ScanResults = {
        totalAssets: assets.length,
        totalIssues: issues.length,
        fixedCount: 0,
        issues: issues.sort((a, b) => b.transactionCount - a.transactionCount)
      };

      setScanResults(results);
      addLog(`Scan completed. Found ${issues.length} classification issues.`);

      // Log specific issues for common problems
      const nvdlIssue = issues.find(issue => issue.symbol === 'NVDL');
      if (nvdlIssue) {
        addLog(`NVDL Issue: Currently ${nvdlIssue.currentType}, should be ${nvdlIssue.detectedType}`);
      }

      const leveragedETFs = issues.filter(issue => 
        issue.symbol.match(/[A-Z]{2,4}[LS]$/) || 
        ['NVDL', 'NVDU', 'NVDD', 'SOXL', 'SOXS', 'TQQQ', 'SQQQ', 'SPXL', 'SPXS'].includes(issue.symbol)
      );
      
      if (leveragedETFs.length > 0) {
        addLog(`Found ${leveragedETFs.length} potentially misclassified leveraged ETFs`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during scan';
      addLog(`Scan failed: ${errorMsg}`);
    } finally {
      setIsScanning(false);
    }
  };

  const fixClassifications = async () => {
    if (!scanResults || scanResults.issues.length === 0) {
      addLog('No issues to fix');
      return;
    }

    setIsFixing(true);
    
    try {
      addLog('Starting asset classification fixes...');
      
      let fixedCount = 0;
      const incorrectIssues = scanResults.issues.filter(issue => issue.status === 'incorrect');
      
      for (const issue of incorrectIssues) {
        try {
          const correctType = issue.detectedType;
          
          // Update the asset in database
          const { error } = await supabase
            .from('assets')
            .update({ asset_type: correctType })
            .eq('symbol', issue.symbol);

          if (error) {
            addLog(`Failed to fix ${issue.symbol}: ${error.message}`);
            continue;
          }

          addLog(`Fixed ${issue.symbol}: ${issue.currentType} → ${correctType}`);
          fixedCount++;
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Error fixing ${issue.symbol}: ${errorMsg}`);
        }
      }

      // Update results
      setScanResults(prev => prev ? { ...prev, fixedCount } : null);
      addLog(`Fix operation completed. Fixed ${fixedCount} assets.`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during fix';
      addLog(`Fix operation failed: ${errorMsg}`);
    } finally {
      setIsFixing(false);
    }
  };


  return (
    <ComponentContainer>
      <ComponentHeader>
        <ComponentTitle>
          <Tag />
          Asset Classification Fixer
        </ComponentTitle>
        <ComponentDescription>
          Scan and fix asset classification issues where symbols are incorrectly categorized (e.g., NVDL classified as option instead of ETF).
        </ComponentDescription>
      </ComponentHeader>

      <InfoCard>
        <InfoTitle>
          <AlertTriangle size={20} />
          Asset Classification Issues
        </InfoTitle>
        <InfoText>
          This tool scans all assets in the database and compares their current classification with the automatic detection logic.
        </InfoText>
        <InfoText>
          <strong>Common Issues:</strong>
        </InfoText>
        <ul style={{ color: '#475569', marginLeft: '1.5rem', lineHeight: 1.6 }}>
          <li><strong>Leveraged ETFs:</strong> NVDL, SOXL, TQQQ etc. may be classified as options</li>
          <li><strong>Symbol Patterns:</strong> Complex symbols may trigger wrong pattern matching</li>
          <li><strong>Manual Overrides:</strong> Assets with manual classification overrides</li>
          <li><strong>Database Inconsistency:</strong> Assets not updated after logic improvements</li>
        </ul>
      </InfoCard>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <Button
          onClick={scanAssets}
          disabled={isScanning || isFixing}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 2rem',
            background: '#3b82f6',
            borderColor: '#3b82f6'
          }}
        >
          {isScanning ? (
            <LoadingSpinner>
              <RefreshCw size={20} />
              Scanning Assets...
            </LoadingSpinner>
          ) : (
            <>
              <Search size={20} />
              Scan Asset Classifications
            </>
          )}
        </Button>

        {scanResults && scanResults.issues.length > 0 && (
          <Button
            onClick={fixClassifications}
            disabled={isScanning || isFixing}
            style={{ 
              fontSize: '1.1rem', 
              padding: '0.75rem 2rem',
              background: '#10b981',
              borderColor: '#10b981'
            }}
          >
            {isFixing ? (
              <LoadingSpinner>
                <RefreshCw size={20} />
                Fixing Classifications...
              </LoadingSpinner>
            ) : (
              <>
                <RotateCcw size={20} />
                Fix {scanResults.issues.filter(i => i.status === 'incorrect').length} Issues
              </>
            )}
          </Button>
        )}
      </div>

      {logs.length > 0 && (
        <LogOutput>
          {logs.join('\n')}
        </LogOutput>
      )}

      {scanResults && (
        <div style={{ marginTop: '2rem' }}>
          <ResultCard $type={scanResults.totalIssues === 0 ? 'success' : 'warning'}>
            <InfoTitle>
              {scanResults.totalIssues === 0 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              Scan Results
            </InfoTitle>
            <InfoText>
              <strong>Total Assets:</strong> {scanResults.totalAssets}<br />
              <strong>Classification Issues:</strong> {scanResults.totalIssues}<br />
              {scanResults.fixedCount > 0 && (
                <>
                  <strong>Fixed:</strong> {scanResults.fixedCount}<br />
                </>
              )}
              <strong>Remaining Issues:</strong> {scanResults.totalIssues - scanResults.fixedCount}
            </InfoText>
          </ResultCard>

          {scanResults.issues.length > 0 && (
            <IssuesTable>
              <TableHeader>
                <div>Symbol</div>
                <div>Current Type</div>
                <div>Detected Type</div>
                <div>Transactions</div>
                <div>Status</div>
              </TableHeader>
              
              {scanResults.issues.map((issue, index) => (
                <TableRow key={index}>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {issue.symbol}
                  </div>
                  <div>{issue.currentType}</div>
                  <div>{issue.detectedType}</div>
                  <div>{issue.transactionCount}</div>
                  <div>
                    <StatusBadge type={issue.status}>
                      {issue.status === 'correct' && <CheckCircle size={12} />}
                      {issue.status === 'incorrect' && <AlertCircle size={12} />}
                      {issue.status === 'manual' && <TrendingUp size={12} />}
                      {issue.status === 'correct' ? 'Correct' : 
                       issue.status === 'incorrect' ? 'Needs Fix' :
                       'Manual Override'}
                    </StatusBadge>
                  </div>
                </TableRow>
              ))}
            </IssuesTable>
          )}
        </div>
      )}
    </ComponentContainer>
  );
};

export default BatchAssetClassificationFixer;