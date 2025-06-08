/**
 * Enhanced Symbol Input Component - Modern Financial UI 2024-2025
 * Fixed black box and invisible text issues with proper CSS variables
 */

import React from 'react';
import { Search } from 'lucide-react';
import { EnhancedSymbolInput } from './EnhancedSymbolInput';
import type { AssetType } from '../types/portfolio';
import type { SymbolLookupResult } from '../types/ai';
import { 
  getSymbolValidation, 
  validateSymbol, 
  formatSymbol 
} from '../utils/symbolInputUtils';

interface SymbolInputProps {
  label?: string;
  value: string;
  onChange: (value: string, metadata?: SymbolLookupResult) => void;
  onBlur?: () => void;
  onValidation?: (isValid: boolean, suggestion?: string) => void;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  assetType?: AssetType;
  placeholder?: string;
  className?: string;
  
  // AI Enhancement Options
  enableAI?: boolean;
  showAIButton?: boolean;
  showSuggestions?: boolean;
  showValidation?: boolean;
}

export const SymbolInput: React.FC<SymbolInputProps> = ({
  label = 'Symbol',
  value,
  onChange,
  onBlur,
  onValidation,
  error,
  required = false,
  disabled = false,
  assetType = 'stock',
  placeholder,
  className,
  
  // AI Enhancement Options
  enableAI = false,
  showAIButton = true,
  showSuggestions = true,
  showValidation = true
}) => {
  const validation = getSymbolValidation(assetType, enableAI);
  
  // If AI is enabled, use the enhanced component
  if (enableAI) {
    const getPlaceholder = () => {
      if (placeholder) return placeholder;
      return validation.examples[0];
    };

    return (
      <div className={`symbol-input-container ${className || ''}`}>
        {label && (
          <label className={`field-label ${required ? 'required' : ''} ${error ? 'error' : ''}`}>
            {label}
          </label>
        )}
        
        <EnhancedSymbolInput
          value={value}
          onChange={onChange}
          onValidation={onValidation}
          placeholder={getPlaceholder()}
          disabled={disabled}
          showAIButton={showAIButton}
          showSuggestions={showSuggestions}
          showValidation={showValidation}
          maxLength={validation.maxLength}
        />
        
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }
  
  // Traditional (non-AI) implementation with fixed styling
  const handleInputChange = (newValue: string) => {
    const formatted = formatSymbol(newValue, assetType, enableAI);
    onChange(formatted);
  };
  
  const validationError = validateSymbol(value, assetType, enableAI);
  const finalError = error || validationError;
  
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return validation.examples[0];
  };

  return (
    <div className={`symbol-input-container ${className || ''}`}>
      <div className="field-container">
        {label && (
          <label className={`field-label ${required ? 'required' : ''} ${finalError ? 'error' : ''}`}>
            {label}
          </label>
        )}
        
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={onBlur}
            placeholder={getPlaceholder()}
            disabled={disabled}
            maxLength={validation.maxLength}
            className={`symbol-input ${finalError ? 'error' : ''}`}
            aria-invalid={!!finalError}
            aria-describedby={finalError ? `${label}-error` : undefined}
            style={{
              textTransform: 'uppercase',
              fontWeight: '500'
            }}
          />
          
          <div className="symbol-search-icon">
            <Search size={16} />
          </div>
        </div>
        
        {finalError && (
          <div id={`${label}-error`} className="error-message" role="alert">
            {finalError}
          </div>
        )}
      </div>
    </div>
  );
};

export default SymbolInput;
