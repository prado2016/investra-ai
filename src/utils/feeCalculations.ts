/**
 * Fee Calculation Utilities
 * Handles fee calculations for different asset types and transaction display
 */

import type { AssetType } from './assetCategorization';

// Fee constants
export const OPTION_FEE_PER_CONTRACT = 0.75;

/**
 * Calculate fees for a transaction based on asset type and quantity
 * For options: quantity represents shares, but fees are per contract (100 shares = 1 contract)
 */
export function calculateTransactionFees(
  assetType: AssetType | string | null,
  quantity: number
): number {
  switch (assetType) {
    case 'option':
      // Options: quantity is in shares, but fees are per contract (100 shares = 1 contract)
      const contracts = Math.abs(quantity) / 100;
      return contracts * OPTION_FEE_PER_CONTRACT;
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
 * For option transactions, this represents the net cash flow (what you actually received/paid)
 */
export function getTransactionDisplayAmount(
  amount: number,
  fees: number | null | undefined,
  assetType: AssetType | string | null,
  quantity: number = 0
): number {
  // For non-option assets, return full amount (no fees)
  if (assetType !== 'option') {
    return amount;
  }
  
  // For options, calculate net cash flow
  const actualFees = fees && fees > 0 ? fees : calculateTransactionFees(assetType, Math.abs(quantity));
  
  // Net cash flow = amount - fees
  // For sells: positive amount - fees = net proceeds (can be negative if fees > premium)
  // For buys: negative amount - fees = total cost (more negative)
  const netAmount = amount - actualFees;
  
  return netAmount;
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
    const contracts = Math.abs(quantity) / 100; // Convert shares to contracts
    return `Fee: $${actualFees.toFixed(2)} (${contracts} contracts × $${OPTION_FEE_PER_CONTRACT})`;
  }
  
  return `Fee: $${actualFees.toFixed(2)}`;
}

/**
 * Check if an option transaction results in a net loss due to fees exceeding premium
 */
export function isOptionNetLoss(
  amount: number,
  fees: number | null | undefined,
  assetType: AssetType | string | null,
  quantity: number = 0
): boolean {
  if (assetType !== 'option') {
    return false;
  }
  
  const actualFees = getTransactionFees(fees, assetType, quantity);
  const netAmount = amount - actualFees;
  
  // For sells (positive amount), net loss if fees exceed premium
  // For buys (negative amount), this check doesn't apply
  return amount > 0 && netAmount < 0;
}