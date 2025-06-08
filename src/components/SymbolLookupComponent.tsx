import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, CheckCircle, Clock, Zap, TrendingUp } from 'lucide-react';
import { useSymbolLookup } from '../hooks/useSymbolLookup';
import type { SymbolMatch } from '../services/endpoints/symbolLookupEndpoint';

interface SymbolLookupComponentProps {
  onSymbolSelect?: (symbol: string, match: SymbolMatch) => void;
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
  showSuggestions = true,
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
          options: {
            includeAlternatives: true,
            maxSuggestions: showSuggestions ? 8 : 3,
          },
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [symbolLookup, showSuggestions]);

  const handleSymbolSelect = useCallback((symbol: string, match: SymbolMatch) => {
    setQuery(symbol);
    setShowResults(false);
    onSymbolSelect?.(symbol, match);
  }, [onSymbolSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || !symbolLookup.data?.success) return;

    const allOptions = [
      ...symbolLookup.data.data.matches,
      ...symbolLookup.data.data.suggestions,
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allOptions[selectedIndex]) {
          const selected = allOptions[selectedIndex];
          const match = 'companyName' in selected ? selected : {
            symbol: selected.symbol,
            companyName: selected.reason || '',
            confidence: 0.8,
            exchange: '',
            currency: 'USD',
          };
          handleSymbolSelect(selected.symbol, match);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showResults, symbolLookup.data, selectedIndex, handleSymbolSelect]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.symbol-lookup-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.7) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className={`symbol-lookup-container relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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

      {/* Error Message */}
      {symbolLookup.error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-red-800 font-medium">{symbolLookup.error.message}</p>
              {symbolLookup.error.details?.userMessage && (
                <p className="text-red-600 text-sm mt-1">
                  {symbolLookup.error.details.userMessage}
                </p>
              )}
            </div>
          </div>
          
          {symbolLookup.canRetry && (
            <button
              onClick={() => symbolLookup.lookupSymbol({ query: query.trim() })}
              className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded transition-colors"
            >
              Retry ({symbolLookup.retryCount}/{3})
            </button>
          )}
        </div>
      )}

      {/* Rate Limit Warning */}
      {symbolLookup.rateLimitInfo?.hourlyLimitReached && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <p className="text-yellow-800">
              Hourly rate limit reached. Try again after {symbolLookup.rateLimitInfo.resetTime}.
            </p>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && symbolLookup.data?.success && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Exact Matches */}
          {symbolLookup.data.data.matches.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Exact Matches
                </p>
              </div>
              {symbolLookup.data.data.matches.map((match, index) => (
                <button
                  key={`match-${index}`}
                  onClick={() => handleSymbolSelect(match.symbol, match)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50
                    border-b border-gray-100 last:border-b-0 transition-colors
                    ${selectedIndex === index ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{match.symbol}</p>
                      <p className="text-sm text-gray-600">{match.companyName}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">{match.exchange}</span>
                        <span className="text-xs text-gray-500">{match.currency}</span>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 ${getConfidenceColor(match.confidence)}`}>
                      {getConfidenceIcon(match.confidence)}
                      <span className="text-sm font-medium">
                        {Math.round(match.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && symbolLookup.data.data.suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-blue-500" />
                  Suggestions
                </p>
              </div>
              {symbolLookup.data.data.suggestions.map((suggestion, index) => {
                const adjustedIndex = symbolLookup.data!.data.matches.length + index;
                return (
                  <button
                    key={`suggestion-${index}`}
                    onClick={() => handleSymbolSelect(suggestion.symbol, {
                      symbol: suggestion.symbol,
                      companyName: suggestion.reason || '',
                      confidence: suggestion.confidence,
                      exchange: '',
                      currency: 'USD',
                    })}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50
                      border-b border-gray-100 last:border-b-0 transition-colors
                      ${selectedIndex === adjustedIndex ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{suggestion.symbol}</p>
                        <p className="text-sm text-gray-600">{suggestion.reason}</p>
                      </div>
                      <div className={`flex items-center space-x-1 ${getConfidenceColor(suggestion.confidence)}`}>
                        {getConfidenceIcon(suggestion.confidence)}
                        <span className="text-sm font-medium">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {symbolLookup.data.data.matches.length === 0 && symbolLookup.data.data.suggestions.length === 0 && (
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
                  Requests remaining: {symbolLookup.data.metadata.rateLimitRemaining || 0}
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
