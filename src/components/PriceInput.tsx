/**
 * Enhanced Price Input Component - Task 4
 */

import React from 'react';
import styled from 'styled-components';
import { DollarSign } from 'lucide-react';
import { InputField } from './FormFields';
import type { AssetType } from '../types/portfolio';
import { 
  getDecimalPrecision, 
  getStepValue, 
  validatePriceInput 
} from '../utils/priceInputUtils';

const PriceInputContainer = styled.div`
  position: relative;
`;

const CurrencyIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  z-index: 10;
  pointer-events: none;
  
  [data-theme="dark"] & {
    color: var(--text-muted);
  }
`;

const StyledPriceInput = styled(InputField)`
  input {
    padding-left: 2.5rem;
    padding-right: 0.75rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    letter-spacing: 0.5px;
    font-variant-numeric: tabular-nums;
    text-align: right; /* Right-align numbers for better readability */
    min-width: 140px; /* Ensure enough space for decimal values */
    
    /* Enhanced styling for better number input */
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    &[type=number] {
      -moz-appearance: textfield;
    }
  }
`;

interface PriceInputProps {
  id?: string;
  name?: string;
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  assetType?: AssetType;
  placeholder?: string;
  className?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  id,
  name,
  label = 'Price',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  assetType = 'stock',
  placeholder,
  className
}) => {
  const precision = getDecimalPrecision(assetType);
  const step = getStepValue(assetType);
  
  // Handle input change with validation
  const handleInputChange = (newValue: string) => {
    if (!newValue) {
      onChange('');
      return;
    }
    
    // Remove any non-numeric characters except decimal point
    const cleanValue = newValue.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    
    // Limit decimal places
    if (parts[1] && parts[1].length > precision) return;
    
    onChange(cleanValue);
  };
  
  // Get placeholder based on asset type
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    const samples = {
      stock: '150.25', option: '16.5999', crypto: '0.00001234',
      forex: '1.234567', etf: '45.67', reit: '89.12'
    };
    return samples[assetType];
  };
  
  const validationError = validatePriceInput(value.toString(), assetType);
  const finalError = error || validationError;
  
  return (
    <PriceInputContainer className={className}>
      <CurrencyIcon>
        <DollarSign size={16} />
      </CurrencyIcon>
      
      <StyledPriceInput
        id={id}
        name={name}
        label={label}
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={onBlur}
        error={finalError}
        placeholder={getPlaceholder()}
        required={required}
        disabled={disabled}
        min={0}
        step={parseFloat(step)}
      />
    </PriceInputContainer>
  );
};

export default PriceInput;
