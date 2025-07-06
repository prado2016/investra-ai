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
import { debug } from '../utils/debug';
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
  inputId?: string;
  onReset?: React.MutableRefObject<(() => void) | null>; // Changed to ref for direct access
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
  'data-testid': testId,
  inputId,
  onReset
}) => {
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<string>('');
  
  // Add cleanup flag to prevent updates after reset
  const isCleanedUpRef = useRef(false);

  // Implement reset function to clear AI processing state
  const resetInternalState = useCallback(() => {
    debug.info('Resetting EnhancedSymbolInput state', undefined, 'EnhancedSymbolInput');
    
    // Set cleanup flag to prevent any pending async operations from updating state
    isCleanedUpRef.current = true;
    
    // Clear all state variables in the correct order
    setIsAIProcessing(false);
    setProcessedResult('');
    setValidationStatus('idle');
    setErrorMessage('');
    setSuggestion('');
    setShowSuggestionsList(false);
    setHighlightedIndex(-1);
    setIsFocused(false);
    
    // Clear any pending timeouts that might cause state updates after reset
    // Note: We can't access timeoutId here, but React will clean up effects
    
    // Force focus out to ensure clean state
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Reset cleanup flag after a brief delay to allow for new operations
    setTimeout(() => {
      isCleanedUpRef.current = false;
    }, 200); // Increased to 200ms for better reliability
  }, []);
  
  // Call parent reset callback when triggered
  useEffect(() => {
    if (onReset) {
      onReset.current = resetInternalState;
    }
  }, [onReset, resetInternalState]);

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
      newValue: value 
    }, 'EnhancedSymbolInput');
  }, [value]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { validateSymbol } = useAISymbolLookup();

  // Natural language detection removed - now manual AI processing only

  // Automatic AI processing removed - now manual-only via AI button

  // Debounced validation
  useEffect(() => {
    if (!showValidation || !value.trim() || value.length < 1 || isCleanedUpRef.current) {
      setValidationStatus('idle');
      setErrorMessage('');
      setSuggestion('');
      onValidation?.(false);
      return;
    }

    // For basic symbols, don't show invalid status so aggressively
    if (value.length < 3) {
      setValidationStatus('idle');
      return;
    }

    setValidationStatus('validating');
    
    const timeoutId = setTimeout(async () => {
      // Check cleanup flag before proceeding
      if (isCleanedUpRef.current) return;
      
      try {
        const trimmedValue = value.trim().toUpperCase();
        
        // For simple stock symbols (1-5 letters), be more lenient
        if (/^[A-Z]{1,5}$/.test(trimmedValue)) {
          if (!isCleanedUpRef.current) {
            setValidationStatus('valid');
            setErrorMessage('');
            setSuggestion('');
            onValidation?.(true);
          }
          return;
        }
        
        // For more complex symbols, try validation
        const response = await validateSymbol(trimmedValue);
        
        // Check cleanup flag before updating state
        if (isCleanedUpRef.current) return;
        
        if (response.success && response.data) {
          const isValid = response.data.isValid;
          setValidationStatus(isValid ? 'valid' : 'invalid');
          
          if (!isValid && response.data.suggestion) {
            setSuggestion(response.data.suggestion);
            setErrorMessage(`Did you mean "${response.data.suggestion}"?`);
          } else if (!isValid) {
            setErrorMessage('Symbol not recognized - but you can still continue');
          } else {
            setErrorMessage('');
            setSuggestion('');
          }
          
          onValidation?.(isValid, response.data.suggestion);
        } else {
          // If validation service fails, don't show as invalid
          if (!isCleanedUpRef.current) {
            setValidationStatus('idle');
            setErrorMessage('');
            setSuggestion('');
            onValidation?.(true); // Allow to continue
          }
        }
      } catch {
        // On validation errors, don't block the user
        if (!isCleanedUpRef.current) {
          setValidationStatus('idle');
          setErrorMessage('');
          setSuggestion('');
          onValidation?.(true); // Allow to continue
        }
      }
    }, 800); // Increased delay to reduce API calls

    return () => clearTimeout(timeoutId);
  }, [value, showValidation, validateSymbol, onValidation]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Apply consistent input cleaning for all input
    const cleanValue = newValue.toUpperCase().replace(/[^A-Z0-9.\-: $]/g, '');
    
    onChange(cleanValue);
    
    // Show suggestions when typing
    if (showSuggestions && cleanValue.length >= 2) {
      setShowSuggestionsList(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestionsList(false);
    }
  }, [onChange, showSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((symbol: string, metadata?: SymbolLookupResult) => {
    onChange(symbol, metadata);
    setShowSuggestionsList(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle AI search - directly call EnhancedAISymbolParser
  const handleAISearch = useCallback(async () => {
    if (!value.trim()) return;
    
    console.log('🔧 AI button clicked - manually triggering AI processing for:', value);
    console.log('🔧 AI button - current component state:', { 
      value, 
      isAIProcessing, 
      processedResult 
    });
    setIsAIProcessing(true);
    setProcessedResult('');
    
    try {
      // Directly call the AI parser
      console.log('🔧 About to call EnhancedAISymbolParser.parseQuery with value:', value);
      const result = await EnhancedAISymbolParser.parseQuery(value);
      console.log('🔧 AI parser returned result:', result);
      
      if (result.confidence > 0.6 && result.parsedSymbol !== value.trim()) {
        // Validate with Yahoo Finance (with fallback)
        const validation = await YahooFinanceValidator.validateSymbolWithFallback(result.parsedSymbol);
        
        if (validation.isValid) {
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
            assetType: mapToAssetType(result.type),
            confidence: result.confidence
          });
          
          setProcessedResult(`✨ Converted "${value}" → ${result.parsedSymbol}${validation.name ? ` (${validation.name})` : ''}`);
        } else {
          setProcessedResult(`⚠️ Unable to validate symbol "${result.parsedSymbol}"`);
        }
      } else {
        setProcessedResult(`🤔 Couldn't parse "${value}" - confidence too low (${Math.round(result.confidence * 100)}%)`);
      }
    } catch (error) {
      console.error('❌ Manual AI processing failed:', error);
      setProcessedResult(`⚠️ Processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAIProcessing(false);
    }
  }, [value, onChange, isAIProcessing, processedResult]);

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
          id={inputId}
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
            onClick={() => {
              console.log('🔧 AILookupButton onClick directly called!');
              console.log('🔧 Button state check:', { disabled, isAIProcessing, value });
              handleAISearch();
            }}
            variant="secondary"
            size="small"
            showText={false}
            disabled={disabled || isAIProcessing}
            tooltip="Search symbols with AI"
          />
        )}
      </InputWrapper>

      {/* Suggestions dropdown - only show if not processing and no error messages */}
      {showSuggestions && !isAIProcessing && !errorMessage && (
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

      {/* AI Processing Indicator - highest priority */}
      <AIProcessingIndicator $visible={isAIProcessing}>
        <Wand2 size={16} />
        Processing "{value}" with AI...
      </AIProcessingIndicator>

      {/* AI Processed Result - show only if not processing and no suggestions/errors */}
      <ProcessedResult $visible={!!processedResult && !isAIProcessing && !showSuggestionsList && !errorMessage}>
        {processedResult}
      </ProcessedResult>

      {/* Error message - only show if not processing and no suggestions dropdown */}
      {errorMessage && validationStatus === 'invalid' && !isAIProcessing && !showSuggestionsList && (
        <ErrorMessage onClick={suggestion ? handleSuggestionClick : undefined}>
          {errorMessage}
        </ErrorMessage>
      )}

      {/* Suggestion text - only show if error message is showing and there's a suggestion */}
      {suggestion && validationStatus === 'invalid' && !isAIProcessing && !showSuggestionsList && errorMessage && (
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
