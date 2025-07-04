/**
 * Utility functions for formatting numbers, currencies, and percentages
 */

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(
  value: number, 
  locale: string = 'en-US',
  decimals: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format a number with comma separators
 */
export function formatNumber(
  value: number, 
  locale: string = 'en-US',
  decimals?: number
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompactNumber(
  value: number, 
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Format a number as a price change (+ or - prefix)
 */
export function formatPriceChange(
  change: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string {
  const formatted = formatCurrency(Math.abs(change), currency, locale);
  return change >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format a percentage change (+ or - prefix)
 */
export function formatPercentageChange(
  change: number, 
  locale: string = 'en-US',
  decimals: number = 2
): string {
  const formatted = formatPercentage(Math.abs(change), locale, decimals);
  return change >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format a date in a readable format
 */
export function formatDate(
  date: Date | string, 
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Parse a date string from the database to ensure proper local timezone handling
 * This prevents timezone issues where dates appear one day off
 */
export function parseDatabaseDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // If the date string is in YYYY-MM-DD format (common from database)
  // Parse it as local time to avoid timezone issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }
  
  // If it includes time or is in another format, use regular Date parsing
  return new Date(dateString);
}

/**
 * Format a date and time
 */
export function formatDateTime(
  date: Date | string, 
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a time duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.round(seconds / 3600)}h`;
  } else {
    return `${Math.round(seconds / 86400)}d`;
  }
}

/**
 * Format transaction amount for display (includes fee calculation for options)
 * For options: shows Total - Fees ($0.75 per contract)
 * For other assets: shows full Total
 */
export function formatTransactionAmount(
  amount: number, 
  currency: string = 'USD',
  assetType?: string | null,
  quantity?: number,
  fees?: number | null
): string {
  // Import here to avoid circular dependencies
  const { getTransactionDisplayAmount } = require('./feeCalculations');
  
  const displayAmount = getTransactionDisplayAmount(
    amount, 
    fees, 
    assetType, 
    quantity || 0
  );
  
  return formatCurrency(displayAmount, currency);
}
