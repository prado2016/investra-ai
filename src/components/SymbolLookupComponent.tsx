import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useSymbolLookup } from '../hooks/useSymbolLookup';
import type { SymbolLookupResult } from '../types/ai';

interface SymbolLookupComponentProps {
  onSymbolSelect?: (symbol: string, match: SymbolLookupResult) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  showValidation?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function SymbolLookupComponent({
  onSymbolSelect,
  placeholder = "Enter stock symbol (e.g., AAPL, Apple Inc.)...",
  className = "",
  autoFocus = false,
  disabled = false,
}: SymbolLookupComponentProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const symbolLookup = useSymbolLookup({
    onSuccess: () => {
      setShowResults(true);
      setSelectedIndex(-1);
    },
    onError: (error) => {
      console.error('Symbol lookup error:', error);
    },
  });

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setShowResults(false);
    
    if (value.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        symbolLookup.lookupSymbol({
          query: value.trim(),
          maxResults: 10,
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [symbolLookup]);

  const handleSymbolSelect = useCallback((symbol: string, match: SymbolLookupResult) => {
    setQuery(symbol);
    setShowResults(false);
    onSymbolSelect?.(symbol, match);
  }, [onSymbolSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const options = symbolLookup.data?.data?.results || [];
    if (!showResults || options.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && options[selectedIndex]) {
          const selected = options[selectedIndex];
          handleSymbolSelect(selected.symbol, selected);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showResults, selectedIndex, handleSymbolSelect, symbolLookup.data?.data?.results]);

  // Hide results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowResults(false);
    if (showResults) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showResults]);

  // Helper functions for confidence display
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Input Field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled || symbolLookup.isLoading}
          className={`
            w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors duration-200
            ${symbolLookup.error ? 'border-red-500' : ''}
          `}
        />
        
        {/* Loading Spinner */}
        {symbolLookup.isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {symbolLookup.error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800 font-medium">{symbolLookup.error}</p>
          </div>
        </div>
      )}

      {/* Rate Limit Warning */}
      {symbolLookup.isRateLimited && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <p className="text-yellow-800">
              Rate limit reached. Please try again later.
            </p>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && symbolLookup.data?.success && symbolLookup.data.data && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Results */}
          {symbolLookup.data.data.results.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Symbol Results
                </p>
              </div>
              
              {symbolLookup.data.data.results.map((result: SymbolLookupResult, index: number) => (
                <button
                  key={`result-${index}`}
                  onClick={() => handleSymbolSelect(result.symbol, result)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50
                    border-b border-gray-100 last:border-b-0 transition-colors
                    ${selectedIndex === index ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{result.symbol}</p>
                      <p className="text-sm text-gray-600">{result.name}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">{result.exchange}</span>
                        <span className="text-xs text-gray-500">{result.assetType}</span>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 ${getConfidenceColor(result.confidence)}`}>
                      {getConfidenceIcon(result.confidence)}
                      <span className="text-sm font-medium">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {symbolLookup.data.data.results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No symbols found for "{query}"</p>
              <p className="text-sm text-gray-500 mt-1">
                Try searching with a company name or different symbol
              </p>
            </div>
          )}

          {/* Metadata Footer */}
          {symbolLookup.data.metadata && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Response time: {symbolLookup.data.metadata.processingTime}ms</span>
                <span>
                  Requests remaining: {symbolLookup.data.metadata.rateLimit.remaining || 0}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SymbolLookupComponent;