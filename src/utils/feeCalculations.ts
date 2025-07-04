/**
 * Fee Calculation Utilities
 * Handles fee calculations for different asset types and transaction display
 */

import type { AssetType } from './assetCategorization';

// Fee constants
export const OPTION_FEE_PER_CONTRACT = 0.75;

/**
 * Calculate fees for a transaction based on asset type and quantity
 */
export function calculateTransactionFees(
  assetType: AssetType | string | null,
  quantity: number
): number {
  switch (assetType) {
    case 'option':
      return quantity * OPTION_FEE_PER_CONTRACT;
    case 'stock':
    case 'etf':
    case 'reit':
    case 'crypto':
    case 'forex':
    default:
      return 0; // No fees for stocks, ETFs, REITs, crypto, forex
  }
}

/**
 * Get the display amount for a transaction (Total - Fees for options, Total for others)
 * This is what should be shown to the user in transaction lists
 */
export function getTransactionDisplayAmount(
  amount: number,
  fees: number | null | undefined,
  assetType: AssetType | string | null,
  quantity: number = 0
): number {
  // If fees are explicitly provided, use them
  if (fees && fees > 0) {
    return amount - fees;
  }
  
  // Calculate fees based on asset type
  const calculatedFees = calculateTransactionFees(assetType, Math.abs(quantity));
  
  // For options, subtract fees from amount for display
  if (assetType === 'option' && calculatedFees > 0) {
    return amount - calculatedFees;
  }
  
  // For other assets, return full amount
  return amount;
}

/**
 * Get the fees for a transaction (either from the transaction or calculated)
 */
export function getTransactionFees(
  fees: number | null | undefined,
  assetType: AssetType | string | null,
  quantity: number = 0
): number {
  // If fees are explicitly provided, use them
  if (fees && fees > 0) {
    return fees;
  }
  
  // Calculate fees based on asset type
  return calculateTransactionFees(assetType, Math.abs(quantity));
}

/**
 * Check if an asset type has fees
 */
export function assetTypeHasFees(assetType: AssetType | string | null): boolean {
  return assetType === 'option';
}

/**
 * Format fee information for display
 */
export function formatFeeInfo(
  fees: number | null | undefined,
  assetType: AssetType | string | null,
  quantity: number = 0
): string {
  const actualFees = getTransactionFees(fees, assetType, quantity);
  
  if (actualFees === 0) {
    return '';
  }
  
  if (assetType === 'option') {
    const contracts = Math.abs(quantity);
    return `Fee: $${actualFees.toFixed(2)} (${contracts} contracts × $${OPTION_FEE_PER_CONTRACT})`;
  }
  
  return `Fee: $${actualFees.toFixed(2)}`;
}