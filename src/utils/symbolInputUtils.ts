/**
 * Symbol Input Utilities - Task 5
 */

import type { AssetType } from '../types/portfolio';

export function getSymbolValidation(assetType: AssetType, allowNaturalLanguage: boolean = false) {
  const validations = {
    stock: {
      pattern: /^[A-Z]{1,5}$/,
      maxLength: allowNaturalLanguage ? 200 : 5,
      description: 'Stock symbols (1-5 letters)',
      examples: ['AAPL', 'GOOGL', 'MSFT', 'TSLA']
    },
    option: {
      pattern: /^[A-Z]{2,6}\d{6}[CP]\d{8}$/,
      maxLength: allowNaturalLanguage ? 200 : 25,
      description: 'Option symbols (Yahoo Finance format)',
      examples: ['AAPL250117C00190000', 'SOXL250530C00016000']
    },
    crypto: {
      pattern: /^[A-Z]{2,10}(-[A-Z]{2,10})?$/,
      maxLength: allowNaturalLanguage ? 200 : 15,
      description: 'Crypto symbols',
      examples: ['BTC-USD', 'ETH-USD', 'SOL-USD']
    },
    forex: {
      pattern: /^[A-Z]{3}[A-Z]{3}=X$/,
      maxLength: allowNaturalLanguage ? 200 : 8,
      description: 'Forex pairs',
      examples: ['EURUSD=X', 'GBPUSD=X']
    },
    etf: {
      pattern: /^[A-Z]{2,5}$/,
      maxLength: allowNaturalLanguage ? 200 : 5,
      description: 'ETF symbols',
      examples: ['SPY', 'QQQ', 'IWM', 'VTI']
    },
    reit: {
      pattern: /^[A-Z]{2,5}$/,
      maxLength: allowNaturalLanguage ? 200 : 5,
      description: 'REIT symbols',
      examples: ['VNQ', 'REALTY', 'O', 'SPG']
    }
  };
  
  return validations[assetType];
}

/**
 * Validate symbol format
 */
export function validateSymbol(symbol: string, assetType: AssetType, allowNaturalLanguage: boolean = false): string | null {
  if (!symbol) return null;
  
  const validation = getSymbolValidation(assetType, allowNaturalLanguage);
  const upperSymbol = symbol.toUpperCase();
  
  if (upperSymbol.length > validation.maxLength) {
    return `Symbol too long (max ${validation.maxLength} characters)`;
  }
  
  // If natural language is allowed and input is longer than traditional symbol length, skip pattern validation
  if (allowNaturalLanguage && symbol.length > 10) {
    return null; // Let AI process natural language
  }
  
  if (!validation.pattern.test(upperSymbol)) {
    return `Invalid ${assetType} symbol format. Expected: ${validation.description}`;
  }
  
  return null;
}

/**
 * Format and clean symbol input - now more permissive for natural language queries
 */
export function formatSymbol(symbol: string, assetType: AssetType, allowNaturalLanguage: boolean = false): string {
  // If allowing natural language, be more permissive
  if (allowNaturalLanguage && symbol.length > 10) {
    return symbol; // Keep original for natural language processing
  }
  
  let cleaned = symbol.replace(/\s/g, '').toUpperCase();
  
  switch (assetType) {
    case 'option':
      cleaned = cleaned.replace(/[^A-Z0-9CP]/g, '');
      break;
    case 'crypto':
      cleaned = cleaned.replace(/[^A-Z-]/g, '');
      break;
    case 'forex':
      cleaned = cleaned.replace(/[^A-Z=X]/g, '');
      break;
    default:
      cleaned = cleaned.replace(/[^A-Z]/g, '');
  }
  
  return cleaned;
}
