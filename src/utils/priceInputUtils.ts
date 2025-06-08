/**
 * Price Input Utilities - Task 4
 * Helper functions for price input validation and formatting
 */

import type { AssetType } from '../types/portfolio';

/**
 * Get decimal precision based on asset type
 */
export function getDecimalPrecision(assetType: AssetType): number {
  switch (assetType) {
    case 'crypto': return 8; // High precision for crypto
    case 'forex': return 6; // Medium-high precision for forex
    case 'option': return 4; // Standard precision for options
    case 'stock':
    case 'etf':
    case 'reit':
    default: return 4; // Standard precision for stocks
  }
}

/**
 * Get step value based on asset type
 */
export function getStepValue(assetType: AssetType): string {
  const precision = getDecimalPrecision(assetType);
  return (1 / Math.pow(10, precision)).toFixed(precision);
}

/**
 * Format price value with appropriate precision
 */
export function formatPriceValue(value: string | number, assetType: AssetType): string {
  if (!value && value !== 0) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  
  const precision = getDecimalPrecision(assetType);
  return numValue.toFixed(precision);
}

/**
 * Validate price input
 */
export function validatePriceInput(value: string, assetType: AssetType): string | null {
  if (!value) return null;
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return 'Please enter a valid number';
  }
  
  if (numValue < 0) {
    return 'Price cannot be negative';
  }
  
  if (numValue === 0) {
    return 'Price must be greater than 0';
  }
  
  const precision = getDecimalPrecision(assetType);
  const decimalPlaces = (value.split('.')[1] || '').length;
  
  if (decimalPlaces > precision) {
    return `Maximum ${precision} decimal places allowed for ${assetType}`;
  }
  
  // Check for reasonable maximum values
  const maxValues: Record<AssetType, number> = {
    stock: 999999999, option: 99999, crypto: 999999999,
    forex: 999, etf: 999999, reit: 999999
  };
  
  if (numValue > maxValues[assetType]) {
    return `Price too high for ${assetType}`;
  }
  
  return null;
}
