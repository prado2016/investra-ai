/**
 * Enhanced Symbol Input Component
 * Task 9: AI-integrated symbol input with suggestions, validation, and lookup
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Check, AlertCircle, Loader, Wand2 } from 'lucide-react';
import { AILookupButton } from './AILookupButton';
import { SymbolSuggestions } from './SymbolSuggestions';

import { useAISymbolLookup } from '../hooks/useAISymbolLookup';
import { EnhancedAISymbolParser } from '../services/ai/enhancedSymbolParser';
import { YahooFinanceValidator } from '../services/yahooFinanceValidator';
import { debug, PerformanceTracker } from '../utils/debug';
import type { SymbolLookupResult } from '../types/ai';
import type { AssetType } from '../types/portfolio';

const InputContainer = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div<{ $hasError?: boolean; $isValid?: boolean }>`
  display: flex;
  align-items: center;
  border: 1px solid ${({ $hasError, $isValid }) => 
    $hasError ? 'var(--color-danger-500)' : 
    $isValid ? 'var(--color-success-500)' : 'var(--border-primary)'
  };
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  transition: all var(--transition-fast);
  min-height: var(--input-height);
  overflow: visible;
  position: relative;
  width: 100%;
  max-width: 100%;
  
  [data-theme="dark"] & {
    background: var(--form-bg, var(--bg-tertiary));
    border-color: ${({ $hasError, $isValid }) => 
      $hasError ? 'var(--color-danger-400)' : 
      $isValid ? 'var(--color-success-400)' : 'var(--form-border, var(--border-primary))'
    };
  }
  
  &:focus-within {
    border-color: ${({ $hasError, $isValid }) => 
      $hasError ? 'var(--color-danger-500)' : 
      $isValid ? 'var(--color-success-500)' : 'var(--border-focus)'
    };
    box-shadow: 0 0 0 3px ${({ $hasError, $isValid }) => 
      $hasError ? 'rgba(239, 68, 68, 0.15)' : 
      $isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(94, 234, 212, 0.15)'
    };
    
    [data-theme="dark"] & {
      border-color: ${({ $hasError, $isValid }) => 
        $hasError ? 'var(--color-danger-400)' : 
        $isValid ? 'var(--color-success-400)' : 'var(--color-teal-400)'
      };
      box-shadow: 0 0 0 3px ${({ $hasError, $isValid }) => 
        $hasError ? 'rgba(239, 68, 68, 0.25)' : 
        $isValid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(94, 234, 212, 0.25)'
      };
    }
  }
`;

const StyledInput = styled.input`
  flex: 1;
  padding: var(--space-3);
  border: none;
  outline: none;
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: transparent;
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
  
  [data-theme="dark"] & {
    color: var(--form-text, var(--text-primary));
  }
  
  &::placeholder {
    color: var(--text-muted);
    text-transform: none;
    font-family: inherit;
    opacity: 0.7;
    
    [data-theme="dark"] & {
      color: var(--text-muted);
      opacity: 0.8;
    }
  }
`;

const ValidationIndicator = styled.div<{ $status: 'validating' | 'valid' | 'invalid' | 'idle' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-right: var(--space-2);
  flex-shrink: 0;
  
  ${({ $status }) => {
    switch ($status) {
      case 'validating':
        return `
          color: var(--text-muted);
          animation: spin 1s linear infinite;
        `;
      case 'valid':
        return `color: var(--color-success-600);`;
      case 'invalid':
        return `color: var(--color-danger-600);`;
      default:
        return `color: var(--text-muted);`;
    }
  }}
  
  [data-theme="dark"] & {
    ${({ $status }) => {
      switch ($status) {
        case 'valid':
          return `color: var(--color-success-400);`;
        case 'invalid':
          return `color: var(--color-danger-400);`;
        default:
          return `color: var(--text-muted);`;
      }
    }}
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const AIProcessingIndicator = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #f0f9ff;
  color: #1e40af;
  padding: 0.75rem 1rem;
  border-radius: 0 0 8px 8px;
  font-size: 0.875rem;
  border: 1px solid #93c5fd;
  border-top: none;
  z-index: 999;
  display: ${({ $visible }) => $visible ? 'flex' : 'none'};
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

const ProcessedResult = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ecfdf5;
  color: #065f46;
  padding: 0.75rem 1rem;
  border-radius: 0 0 8px 8px;
  font-size: 0.875rem;
  border: 1px solid #a7f3d0;
  border-top: none;
  z-index: 999;
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fee2e2;
  color: #991b1b;
  padding: 0.5rem 0.75rem;
  border-radius: 0 0 6px 6px;
  font-size: 0.75rem;
  border: 1px solid #fca5a5;
  border-top: none;
  z-index: 999;
`;

const SuggestionText = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #f0f9ff;
  color: #1e40af;
  padding: 0.5rem 0.75rem;
  border-radius: 0 0 6px 6px;
  font-size: 0.75rem;
  border: 1px solid #93c5fd;
  border-top: none;
  z-index: 999;
`;

interface EnhancedSymbolInputProps {
  value: string;
  onChange: (value: string, metadata?: SymbolLookupResult) => void;
  onValidation?: (isValid: boolean, suggestion?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showAIButton?: boolean;
  showSuggestions?: boolean;
  showValidation?: boolean;
  maxLength?: number;
  className?: string;
  'data-testid'?: string;
}

export const EnhancedSymbolInput: React.FC<EnhancedSymbolInputProps> = ({
  value,
  onChange,
  onValidation,
  placeholder = "Enter symbol or try: 'AAPL Jun 21 $200 Call'",
  disabled = false,
  showAIButton = true,
  showSuggestions = true,
  showValidation = true,
  maxLength = 200, // Increased to allow natural language queries
  className,
  'data-testid': testId
}) => {
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<string>('');
  const [lastProcessedQuery, setLastProcessedQuery] = useState('');

  // Debug component lifecycle
  useEffect(() => {
    debug.info('EnhancedSymbolInput mounted', { 
      initialValue: value, 
      showAIButton, 
      showSuggestions, 
      showValidation 
    }, 'EnhancedSymbolInput');
    
    return () => {
      debug.info('EnhancedSymbolInput unmounted', undefined, 'EnhancedSymbolInput');
    };
  }, [showAIButton, showSuggestions, showValidation, value]);

  // Debug value changes
  useEffect(() => {
    debug.debug('EnhancedSymbolInput value changed', { 
      oldValue: lastProcessedQuery, 
      newValue: value 
    }, 'EnhancedSymbolInput');
  }, [value, lastProcessedQuery]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { validateSymbol } = useAISymbolLookup();

  // Check if input looks like a natural language query that needs AI processing
  const needsAIProcessing = useCallback((inputValue: string): boolean => {
    const trimmed = inputValue.trim().toLowerCase();
    
    // Skip if too short or already processed - reduced minimum length for better UX
    if (trimmed.length < 3 || trimmed === lastProcessedQuery) return false;
    
    // Check for natural language patterns - made more inclusive
    const nlPatterns = [
      /\b(call|put)\b/i,
      /\$\d+.*\b(call|put)\b/i,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d+/i,
      /\d{1,2}\/\d{1,2}/i,
      /\b(option|options)\b/i,
      /\b(strike|expir)/i,
      /(\s+\$\d+\s+)|(\s+\d+\s+\$)/i, // Money amounts with spaces
      /\b(apple|microsoft|tesla|google|amazon|meta|nvidia|amd)\b/i, // Common company names
      /\b\w+\s+(inc|corp|company|ltd)\b/i, // Company suffixes
      /\s+and\s+|\s+or\s+|\s+stock\s+|\s+shares\s+/i // Natural language indicators
    ];
    
    return nlPatterns.some(pattern => pattern.test(trimmed));
  }, [lastProcessedQuery]);

  // AI Processing for natural language queries
  useEffect(() => {
    if (!value.trim() || !needsAIProcessing(value)) {
      setIsAIProcessing(false);
      setProcessedResult('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (value.trim() === lastProcessedQuery) return;
      
      debug.info('Starting AI processing', { query: value }, 'EnhancedSymbolInput');
      PerformanceTracker.mark('ai-processing-start');
      
      setIsAIProcessing(true);
      setProcessedResult('');
      
      try {
        debug.debug('Processing AI query', { query: value }, 'EnhancedSymbolInput');
        const result = await EnhancedAISymbolParser.parseQuery(value);
        
        debug.info('AI processing result', { 
          query: value, 
          result: result.parsedSymbol, 
          confidence: result.confidence 
        }, 'EnhancedSymbolInput');
        
        if (result.confidence > 0.6 && result.parsedSymbol !== value.trim()) {
          // Validate with Yahoo Finance (with fallback)
          debug.debug('Validating AI result with Yahoo Finance (with fallback)', { symbol: result.parsedSymbol }, 'EnhancedSymbolInput');
          const validation = await YahooFinanceValidator.validateSymbolWithFallback(result.parsedSymbol);
          
          if (validation.isValid) {
            debug.info('AI symbol validation successful', { 
              originalQuery: value,
              parsedSymbol: result.parsedSymbol,
              validatedName: validation.name 
            }, 'EnhancedSymbolInput');
            
            // Map AI parser types to our AssetType
            const mapToAssetType = (type: string): AssetType => {
              switch (type) {
                case 'option': return 'option';
                case 'etf': return 'etf';
                case 'stock':
                case 'index':
                default: return 'stock';
              }
            };
            
            // Auto-fill with the validated symbol
            onChange(result.parsedSymbol, {
              symbol: result.parsedSymbol,
              name: validation.name || result.parsedSymbol,
              exchange: 'UNKNOWN',
              assetType: mapToAssetType(result.type), // Use AI-detected asset type with mapping
              confidence: result.confidence
            });
            
            setProcessedResult(`✨ Converted "${value}" → ${result.parsedSymbol}${validation.name ? ` (${validation.name})` : ''}`);
            setLastProcessedQuery(value.trim());
          } else {
            debug.warn('AI symbol validation failed', { 
              originalQuery: value,
              parsedSymbol: result.parsedSymbol,
              validationError: validation.error,
              validationDetails: validation
            }, 'EnhancedSymbolInput');
            
            // More helpful error message based on the actual error
            const errorMsg = validation.error?.includes('Too Many Requests') || validation.error?.includes('429')
              ? `⏳ Rate limited - try again in a moment`
              : validation.error?.includes('CORS') || validation.error?.includes('network')
              ? `🌐 Network issue - check connection`
              : `⚠️ Unable to validate symbol "${result.parsedSymbol}"`;
              
            setProcessedResult(errorMsg);
          }
        } else {
          debug.warn('AI parsing confidence too low', { 
            query: value,
            confidence: result.confidence,
            threshold: 0.6 
          }, 'EnhancedSymbolInput');
          setProcessedResult(`🤔 Couldn't parse "${value}" - try: "AAPL Jun 21 $200 Call"`);
        }
      } catch (error) {
        debug.error('AI processing failed', error, 'EnhancedSymbolInput');
        setProcessedResult(`⚠️ Processing failed - you can still enter symbols manually`);
      } finally {
        setIsAIProcessing(false);
        PerformanceTracker.measure('ai-processing', 'ai-processing-start');
      }
    }, 1500); // Wait 1.5 seconds for user to finish typing

    return () => clearTimeout(timeoutId);
  }, [value, onChange, needsAIProcessing, lastProcessedQuery]);

  // Debounced validation
  useEffect(() => {
    if (!showValidation || !value.trim() || value.length < 2) {
      setValidationStatus('idle');
      setErrorMessage('');
      setSuggestion('');
      onValidation?.(false);
      return;
    }

    setValidationStatus('validating');
    
    const timeoutId = setTimeout(async () => {
      try {
        const response = await validateSymbol(value.trim().toUpperCase());
        
        if (response.success && response.data) {
          const isValid = response.data.isValid;
          setValidationStatus(isValid ? 'valid' : 'invalid');
          
          if (!isValid && response.data.suggestion) {
            setSuggestion(response.data.suggestion);
            setErrorMessage(`Did you mean "${response.data.suggestion}"?`);
          } else {
            setErrorMessage('');
            setSuggestion('');
          }
          
          onValidation?.(isValid, response.data.suggestion);
        } else {
          setValidationStatus('invalid');
          setErrorMessage('Validation failed');
          setSuggestion('');
          onValidation?.(false);
        }
      } catch {
        setValidationStatus('idle');
        setErrorMessage('');
        setSuggestion('');
        onValidation?.(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, showValidation, validateSymbol, onValidation]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // For natural language queries, allow more characters and be more permissive
    const cleanValue = needsAIProcessing(newValue) 
      ? newValue // Keep original for AI processing - allow spaces, punctuation, etc.
      : newValue.toUpperCase().replace(/[^A-Z0-9.\-: $]/g, ''); // More permissive cleaning for symbols
    
    onChange(cleanValue);
    
    // Show suggestions when typing (but not during AI processing)
    if (showSuggestions && cleanValue.length >= 2 && !needsAIProcessing(cleanValue)) {
      setShowSuggestionsList(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestionsList(false);
    }
  }, [onChange, showSuggestions, needsAIProcessing]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((symbol: string, metadata?: SymbolLookupResult) => {
    onChange(symbol, metadata);
    setShowSuggestionsList(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle AI search - inline processing without modal popup
  const handleAISearch = useCallback(() => {
    // Instead of opening modal, trigger AI processing on current input
    if (value.trim()) {
      setIsAIProcessing(true);
      setProcessedResult('');
      // The AI processing effect will handle the actual processing
    }
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestionsList(false);
        setHighlightedIndex(-1);
      }
    };

    if (showSuggestionsList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestionsList]);

  // Handle suggestion click
  const handleSuggestionClick = () => {
    if (suggestion) {
      onChange(suggestion);
      setSuggestion('');
      setErrorMessage('');
      inputRef.current?.focus();
    }
  };

  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader size={16} />;
      case 'valid':
        return <Check size={16} />;
      case 'invalid':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  return (
    <InputContainer ref={containerRef} className={className}>
      <InputWrapper
        $hasError={validationStatus === 'invalid'}
        $isValid={validationStatus === 'valid'}
      >
        <StyledInput
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (showSuggestions && value.length >= 2) {
              setShowSuggestionsList(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          data-testid={testId}
        />
        
        {showValidation && (
          <ValidationIndicator $status={validationStatus}>
            {getValidationIcon()}
          </ValidationIndicator>
        )}
        
        {showAIButton && (
          <AILookupButton
            onClick={handleAISearch}
            variant="secondary"
            size="small"
            showText={false}
            disabled={disabled}
            tooltip="Search symbols with AI"
          />
        )}
      </InputWrapper>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <SymbolSuggestions
          query={value}
          isVisible={showSuggestionsList && isFocused}
          onSelectSuggestion={handleSelectSuggestion}
          onOpenSearch={handleAISearch}
          maxSuggestions={5}
          highlightedIndex={highlightedIndex}
          onHighlightChange={setHighlightedIndex}
        />
      )}

      {/* AI Processing Indicator */}
      <AIProcessingIndicator $visible={isAIProcessing && !showSuggestionsList}>
        <Wand2 size={16} />
        Processing "{value}" with AI...
      </AIProcessingIndicator>

      {/* AI Processed Result */}
      <ProcessedResult $visible={!!processedResult && !isAIProcessing && !showSuggestionsList}>
        {processedResult}
      </ProcessedResult>

      {/* Error message */}
      {errorMessage && validationStatus === 'invalid' && (
        <ErrorMessage onClick={suggestion ? handleSuggestionClick : undefined}>
          {errorMessage}
        </ErrorMessage>
      )}

      {/* Suggestion text */}
      {suggestion && validationStatus === 'invalid' && (
        <SuggestionText onClick={handleSuggestionClick}>
          Click to use "{suggestion}" instead
        </SuggestionText>
      )}

      {/* AI Search Modal - Disabled to fix popup issues */}
      {/* 
      <SymbolSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectSymbol={handleModalSelection}
        initialQuery={value}
      />
      */}
    </InputContainer>
  );
};

export default EnhancedSymbolInput;
