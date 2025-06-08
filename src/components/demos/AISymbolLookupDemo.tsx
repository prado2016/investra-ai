import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Zap,
  BarChart3
} from 'lucide-react';
import SymbolLookupComponent from '../SymbolLookupComponent';
import SymbolInputWithAI from '../SymbolInputWithAI';
import SymbolLookupMonitoring from '../SymbolLookupMonitoring';
import { useSymbolLookup, useSymbolValidation } from '../../hooks/useSymbolLookup';
import type { SymbolMatch } from '../../services/endpoints/symbolLookupEndpoint';

export function AISymbolLookupDemo() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
  const [manualInput, setManualInput] = useState('');
  
  const { 
    data: lookupData, 
    isLoading: lookupLoading, 
    error: lookupError,
    rateLimitInfo,
    lookupSymbol,
    clearError
  } = useSymbolLookup({
    onSuccess: (response) => {
      console.log('Lookup successful:', response);
    },
    retryOnFailure: true,
    maxRetries: 3
  });

  const {
    validateSymbol,
    getSuggestions,
    isLoading: validationLoading,
    error: validationError
  } = useSymbolValidation();

  const handleSymbolSelect = (symbol: string, match: SymbolMatch) => {
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols(prev => [...prev, symbol]);
    }
  };

  const handleManualValidation = async () => {
    if (!manualInput.trim()) return;
    
    const isValid = await validateSymbol(manualInput.trim());
    setValidationResults(prev => ({
      ...prev,
      [manualInput.trim()]: isValid
    }));
  };

  const handleGetSuggestions = async () => {
    if (!manualInput.trim()) return;
    
    const suggestions = await getSuggestions(manualInput.trim());
    console.log('Suggestions for', manualInput, ':', suggestions);
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  };

  const clearAll = () => {
    setSelectedSymbols([]);
    setValidationResults({});
    setManualInput('');
    clearError();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Symbol Lookup System Demo
        </h1>
        <p className="text-gray-600">
          Intelligent stock symbol validation, lookup, and suggestion powered by AI
        </p>
      </div>

      <Tabs defaultValue="lookup" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lookup">Symbol Lookup</TabsTrigger>
          <TabsTrigger value="validation">Symbol Validation</TabsTrigger>
          <TabsTrigger value="components">UI Components</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Symbol Lookup Tab */}
        <TabsContent value="lookup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Intelligent Symbol Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SymbolLookupComponent
                onSymbolSelect={handleSymbolSelect}
                placeholder="Search for stocks (e.g., AAPL, Apple Inc., technology stocks)..."
                showSuggestions={true}
                className="w-full"
              />

              {/* Rate Limit Info */}
              {rateLimitInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Rate Limit Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Remaining Requests:</span>
                      <span className="font-medium ml-2">{rateLimitInfo.remainingRequests}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Reset Time:</span>
                      <span className="font-medium ml-2">{rateLimitInfo.resetTime}</span>
                    </div>
                  </div>
                  {(rateLimitInfo.hourlyLimitReached || rateLimitInfo.dailyLimitReached) && (
                    <div className="mt-2 text-yellow-700">
                      ⚠️ {rateLimitInfo.dailyLimitReached ? 'Daily' : 'Hourly'} rate limit reached
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {lookupError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h4 className="font-medium text-red-900">Error</h4>
                  </div>
                  <p className="text-red-700 mt-1">{lookupError.message}</p>
                  {lookupError.details?.userMessage && (
                    <p className="text-red-600 text-sm mt-1">{lookupError.details.userMessage}</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearError}
                    className="mt-2"
                  >
                    Clear Error
                  </Button>
                </div>
              )}

              {/* Loading State */}
              {lookupLoading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                    <span className="text-yellow-700">Searching symbols...</span>
                  </div>
                </div>
              )}

              {/* Results */}
              {lookupData?.success && (
                <div className="space-y-4">
                  {/* Matches */}
                  {lookupData.data.matches.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Exact Matches ({lookupData.data.matches.length})
                      </h4>
                      <div className="grid gap-2">
                        {lookupData.data.matches.map((match, index) => (
                          <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-green-900">{match.symbol}</span>
                                <span className="text-green-700 ml-2">{match.companyName}</span>
                                <div className="text-sm text-green-600 mt-1">
                                  {match.exchange} • {match.currency}
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {Math.round(match.confidence * 100)}% confident
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {lookupData.data.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Zap className="w-4 h-4 text-blue-500 mr-2" />
                        AI Suggestions ({lookupData.data.suggestions.length})
                      </h4>
                      <div className="grid gap-2">
                        {lookupData.data.suggestions.map((suggestion, index) => (
                          <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-blue-900">{suggestion.symbol}</span>
                                <div className="text-sm text-blue-700 mt-1">{suggestion.reason}</div>
                              </div>
                              <Badge variant="outline">
                                {Math.round(suggestion.confidence * 100)}% match
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">Response Metadata</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>Provider: <span className="font-medium">{lookupData.metadata.provider}</span></div>
                      <div>Processing Time: <span className="font-medium">{lookupData.metadata.processingTime}ms</span></div>
                      <div>Cached: <span className="font-medium">{lookupData.metadata.cached ? 'Yes' : 'No'}</span></div>
                      <div>Request ID: <span className="font-medium text-xs">{lookupData.metadata.requestId}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Symbol Validation Tab */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Symbol Validation & Suggestions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  placeholder="Enter symbol to validate..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  onClick={handleManualValidation}
                  disabled={validationLoading || !manualInput.trim()}
                >
                  {validationLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Validate'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGetSuggestions}
                  disabled={validationLoading || !manualInput.trim()}
                >
                  Get Suggestions
                </Button>
              </div>

              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{validationError.message}</p>
                </div>
              )}

              {Object.keys(validationResults).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Validation Results</h4>
                  <div className="space-y-2">
                    {Object.entries(validationResults).map(([symbol, isValid]) => (
                      <div key={symbol} className={`flex items-center space-x-2 p-2 rounded ${
                        isValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {isValid ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="font-medium">{symbol}</span>
                        <span>{isValid ? 'Valid' : 'Invalid'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Smart Input Component */}
            <Card>
              <CardHeader>
                <CardTitle>Smart Symbol Input</CardTitle>
              </CardHeader>
              <CardContent>
                <SymbolInputWithAI
                  value={manualInput}
                  onChange={setManualInput}
                  onValidSymbol={(symbol, isValid) => {
                    console.log(`${symbol} is ${isValid ? 'valid' : 'invalid'}`);
                  }}
                  placeholder="Enter symbol with AI validation..."
                  showValidation
                  validateOnBlur
                  autoComplete
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Selected Symbols */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Selected Symbols</span>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSymbols.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Use the symbol lookup above to add symbols
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedSymbols.map((symbol) => (
                      <div key={symbol} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="font-medium">{symbol}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSymbol(symbol)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>System Monitoring</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SymbolLookupMonitoring refreshInterval={30000} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AISymbolLookupDemo;
