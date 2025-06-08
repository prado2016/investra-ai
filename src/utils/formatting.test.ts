import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatCompactNumber,
  formatPriceChange,
  formatPercentageChange,
  formatDate,
  formatDateTime,
  formatDuration
} from '../utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format different currencies', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-0.01)).toBe('-$0.01');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(15.25)).toBe('15.25%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(100)).toBe('100.00%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-5.75)).toBe('-5.75%');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with default locale', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(0)).toBe('0');
    });

    it('should respect decimal places', () => {
      expect(formatNumber(1234.5678, 'en-US', 2)).toBe('1,234.57');
      expect(formatNumber(1234.5678, 'en-US', 0)).toBe('1,235');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format compact numbers correctly', () => {
      expect(formatCompactNumber(1234)).toBe('1.2K');
      expect(formatCompactNumber(1234567)).toBe('1.2M');
      expect(formatCompactNumber(1234567890)).toBe('1.2B');
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should handle zero and negative numbers', () => {
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(-1234567)).toBe('-1.2M');
    });
  });

  describe('formatPriceChange', () => {
    it('should format positive price changes', () => {
      expect(formatPriceChange(15.25)).toBe('+$15.25');
      expect(formatPriceChange(0.01)).toBe('+$0.01');
    });

    it('should format negative price changes', () => {
      expect(formatPriceChange(-15.25)).toBe('-$15.25');
      expect(formatPriceChange(-0.01)).toBe('-$0.01');
    });

    it('should handle zero change', () => {
      expect(formatPriceChange(0)).toBe('+$0.00');
    });
  });

  describe('formatPercentageChange', () => {
    it('should format positive percentage changes', () => {
      expect(formatPercentageChange(5.25)).toBe('+5.25%');
      expect(formatPercentageChange(0.01)).toBe('+0.01%');
    });

    it('should format negative percentage changes', () => {
      expect(formatPercentageChange(-5.25)).toBe('-5.25%');
      expect(formatPercentageChange(-0.01)).toBe('-0.01%');
    });

    it('should handle zero change', () => {
      expect(formatPercentageChange(0)).toBe('+0.00%');
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      expect(formatDate(date)).toBe('Mar 15, 2024');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-03-15T12:00:00Z');
      expect(result).toMatch(/Mar 1[45], 2024/); // Account for timezone differences
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      // Note: Time will vary by timezone, so we test the structure
      const result = formatDateTime(date);
      expect(result).toContain('Mar 15, 2024');
      expect(result).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(45)).toBe('45s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(90)).toBe('2m');
      expect(formatDuration(300)).toBe('5m');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3660)).toBe('1h');
      expect(formatDuration(7200)).toBe('2h');
    });

    it('should format days correctly', () => {
      expect(formatDuration(86400)).toBe('1d');
      expect(formatDuration(172800)).toBe('2d');
    });
  });
});
