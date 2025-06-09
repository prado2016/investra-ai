import { useState, useCallback } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { useSymbolValidation } from '../hooks/useSymbolLookup';

interface SymbolInputWithAIProps {
  value: string;
  onChange: (value: string) => void;
  onValidSymbol?: (symbol: string, isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showValidation?: boolean;
  validateOnBlur?: boolean;
  autoComplete?: boolean;
}

export function SymbolInputWithAI({
  value,
  onChange,
  onValidSymbol,
  placeholder = "Enter symbol...",
  className = "",
  disabled = false,
  required = false,
  showValidation = true,
  validateOnBlur = true,
  autoComplete = true,
}: SymbolInputWithAIProps) {
  const [hasBlurred, setHasBlurred] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { validateSymbol, getSuggestions, isLoading, error } = useSymbolValidation();

  const handleValidation = useCallback(async (symbol: string) => {
    if (!symbol.trim()) {
      setValidationState('idle');
      setSuggestions([]);
      return;
    }

    setValidationState('validating');
    
    try {
      const isValid = await validateSymbol(symbol);
      setValidationState(isValid ? 'valid' : 'invalid');
      onValidSymbol?.(symbol, isValid);

      // Get suggestions if invalid and autoComplete is enabled
      if (!isValid && autoComplete) {
        const symbolSuggestions = await getSuggestions(symbol);
        setSuggestions(symbolSuggestions.slice(0, 3));
        setShowSuggestions(symbolSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch {
      setValidationState('invalid');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [validateSymbol, getSuggestions, onValidSymbol, autoComplete]);

  const handleInputChange = useCallback((newValue: string) => {
    // Allow natural language input - don't force uppercase for longer phrases
    const processedValue = newValue.length <= 10 ? newValue.toUpperCase() : newValue;
    onChange(processedValue);
    
    // Reset validation state when typing
    if (validationState !== 'idle') {
      setValidationState('idle');
      setShowSuggestions(false);
    }
  }, [onChange, validationState]);

  const handleBlur = useCallback(() => {
    setHasBlurred(true);
    setShowSuggestions(false);
    
    if (validateOnBlur && value.trim()) {
      handleValidation(value.trim());
    }
  }, [validateOnBlur, value, handleValidation]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setValidationState('valid');
    onValidSymbol?.(suggestion, true);
  }, [onChange, onValidSymbol]);

  const getInputClasses = () => {
    const baseClasses = `
      w-full px-3 py-2 border rounded-md transition-colors duration-200
      focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-100 disabled:cursor-not-allowed
    `;

    if (!showValidation || !hasBlurred) {
      return `${baseClasses} border-gray-300`;
    }

    switch (validationState) {
      case 'validating':
        return `${baseClasses} border-yellow-300 bg-yellow-50`;
      case 'valid':
        return `${baseClasses} border-green-300 bg-green-50`;
      case 'invalid':
        return `${baseClasses} border-red-300 bg-red-50`;
      default:
        return `${baseClasses} border-gray-300`;
    }
  };

  const getValidationIcon = () => {
    if (!showValidation || !hasBlurred) return null;

    switch (validationState) {
      case 'validating':
        return (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
          </div>
        );
      case 'valid':
        return (
          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
        );
      case 'invalid':
        return (
          <X className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
        );
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    if (!showValidation || !hasBlurred) return null;

    if (error) {
      return (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {error}
        </p>
      );
    }

    switch (validationState) {
      case 'validating':
        return <p className="mt-1 text-sm text-yellow-600">Validating symbol...</p>;
      case 'valid':
        return <p className="mt-1 text-sm text-green-600">Valid symbol</p>;
      case 'invalid':
        return <p className="mt-1 text-sm text-red-600">Invalid or unknown symbol</p>;
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          required={required}
          className={getInputClasses()}
          maxLength={100} // Increased for natural language input
        />
        {getValidationIcon()}
      </div>

      {/* Validation Message */}
      {getValidationMessage()}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-600">Did you mean:</p>
          </div>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 transition-colors"
            >
              <p className="font-medium text-gray-900">{suggestion}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SymbolInputWithAI;
