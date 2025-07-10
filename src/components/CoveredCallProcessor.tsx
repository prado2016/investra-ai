import React, { useState } from 'react';
import { coveredCallProcessor } from '../utils/coveredCallProcessor';
import { AlertTriangle, CheckCircle, Play, RefreshCw } from 'lucide-react';

interface ProcessingResult {
  success: boolean;
  totalRulesCreated: number;
  portfoliosProcessed: number;
  errors: string[];
}

export const CoveredCallProcessor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runProcessor = async () => {
    setIsProcessing(true);
    setResult(null);
    setLogs([]);
    
    try {
      addLog('🚀 Starting covered call processor...');
      addLog('🔄 Running batch covered call processing...');
      
      const processingResult = await coveredCallProcessor.batchProcessAllPortfolios();
      
      if (processingResult.success) {
        addLog('✅ Batch processing completed successfully!');
        addLog(`📊 Portfolios processed: ${processingResult.portfoliosProcessed}`);
        addLog(`📊 Total rules created: ${processingResult.totalRulesCreated}`);
        
        if (processingResult.errors.length > 0) {
          addLog(`⚠️ ${processingResult.errors.length} errors encountered`);
        }
      } else {
        addLog('❌ Batch processing failed');
      }
      
      setResult(processingResult);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Script failed: ${errorMsg}`);
      setResult({
        success: false,
        totalRulesCreated: 0,
        portfoliosProcessed: 0,
        errors: [errorMsg]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Covered Call Processor</h2>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">What this does:</h3>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>• Analyzes all option transactions across your portfolios</li>
                <li>• Identifies covered call sells (option sells without sufficient underlying positions)</li>
                <li>• Tags transactions with <code className="bg-blue-100 px-1 rounded">strategy_type: 'covered_call'</code></li>
                <li>• Enables proper P&L calculation for covered call premiums</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={runProcessor}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Covered Call Processor
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
            <h3 className="text-xl font-bold text-gray-900">Processing Results</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{result.portfoliosProcessed}</div>
              <div className="text-sm text-gray-600">Portfolios Processed</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.totalRulesCreated}</div>
              <div className="text-sm text-gray-600">Rules Created</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
              <ul className="text-red-800 text-sm space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Logs Section */}
      {logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Processing Logs</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};