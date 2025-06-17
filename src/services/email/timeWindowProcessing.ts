/**
 * Time Window Processing Service
 * Task 5.3: Calculate time windows for transaction differentiation
 */

import type { WealthsimpleEmailData } from './wealthsimpleEmailParser';

export interface TimeWindowConfig {
  // Basic time windows
  sameSecond: number;     // 1000ms
  sameMinute: number;     // 60 * 1000ms
  sameHour: number;       // 60 * 60 * 1000ms
  sameDay: number;        // 24 * 60 * 60 * 1000ms
  sameWeek: number;       // 7 * 24 * 60 * 60 * 1000ms
  
  // Advanced windows for different scenarios
  rapidTrading: number;   // 5 * 1000ms - for HFT detection
  partialFill: number;    // 30 * 60 * 1000ms - for partial fill detection
  splitOrder: number;     // 2 * 60 * 60 * 1000ms - for split order detection
  settlement: number;     // 3 * 24 * 60 * 60 * 1000ms - for settlement-related duplicates
}

export interface TimeWindowAnalysis {
  // Basic timing
  timeDifferenceMs: number;
  timeDifferenceFormatted: string;
  
  // Window classifications
  withinWindows: {
    sameSecond: boolean;
    sameMinute: boolean;
    sameHour: boolean;
    sameDay: boolean;
    sameWeek: boolean;
    rapidTrading: boolean;
    partialFill: boolean;
    splitOrder: boolean;
    settlement: boolean;
  };
  
  // Confidence scores for each window
  confidenceScores: {
    sameSecond: number;
    sameMinute: number;
    sameHour: number;
    sameDay: number;
    rapidTrading: number;
    partialFill: number;
    splitOrder: number;
  };
  
  // Risk assessment
  duplicateRisk: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: string[];
  
  // Market context
  marketContext: {
    isMarketHours: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    marketSession: 'pre-market' | 'regular' | 'after-hours' | 'closed';
  };
  
  // Timezone information
  timezoneInfo: {
    email1Timezone: string;
    email2Timezone?: string;
    normalizedTimezone: string;
    timezoneOffset: number;
  };
}

export interface RapidTradingPattern {
  isRapidTrading: boolean;
  transactionCount: number;
  averageInterval: number;
  pattern: 'burst' | 'systematic' | 'random' | 'none';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PartialFillAnalysis {
  isPotentialPartialFill: boolean;
  totalQuantityPattern: number[];
  priceConsistency: boolean;
  timeSpread: number;
  confidence: number;
  suggestedAction: 'group' | 'separate' | 'review';
}

export interface SplitOrderAnalysis {
  isPotentialSplitOrder: boolean;
  orderSizePattern: number[];
  executionTiming: number[];
  priceVariation: number;
  confidence: number;
  suggestedGrouping: string[];
}

/**
 * Time Window Processing Service
 */
export class TimeWindowProcessing {
  // Default configuration for time windows
  private static readonly DEFAULT_CONFIG: TimeWindowConfig = {
    sameSecond: 1000,                    // 1 second
    sameMinute: 60 * 1000,               // 1 minute
    sameHour: 60 * 60 * 1000,            // 1 hour
    sameDay: 24 * 60 * 60 * 1000,        // 1 day
    sameWeek: 7 * 24 * 60 * 60 * 1000,   // 1 week
    rapidTrading: 5 * 1000,              // 5 seconds for HFT
    partialFill: 30 * 60 * 1000,         // 30 minutes for partial fills
    splitOrder: 2 * 60 * 60 * 1000,      // 2 hours for split orders
    settlement: 3 * 24 * 60 * 60 * 1000  // 3 days for settlement
  };

  // Market hours configuration (EST/EDT)
  private static readonly MARKET_HOURS = {
    preMarketStart: 4,   // 4:00 AM EST
    regularStart: 9.5,   // 9:30 AM EST
    regularEnd: 16,      // 4:00 PM EST
    afterHoursEnd: 20    // 8:00 PM EST
  };

  // US market holidays (simplified)
  private static readonly MARKET_HOLIDAYS_2025 = [
    '2025-01-01', // New Year's Day
    '2025-01-20', // MLK Day
    '2025-02-17', // Presidents Day
    '2025-04-18', // Good Friday
    '2025-05-26', // Memorial Day
    '2025-07-03', // Independence Day (observed)
    '2025-09-01', // Labor Day
    '2025-11-27', // Thanksgiving
    '2025-12-25'  // Christmas
  ];

  /**
   * Analyze time windows between two emails
   */
  static analyzeTimeWindows(
    email1: WealthsimpleEmailData,
    email2: WealthsimpleEmailData,
    config: Partial<TimeWindowConfig> = {}
  ): TimeWindowAnalysis {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Parse dates with timezone handling
    const date1 = this.parseEmailDate(email1);
    const date2 = this.parseEmailDate(email2);
    
    const timeDifferenceMs = Math.abs(date1.getTime() - date2.getTime());
    const timeDifferenceFormatted = this.formatTimeDifference(timeDifferenceMs);
    
    // Check which windows the transactions fall within
    const withinWindows = {
      sameSecond: timeDifferenceMs <= finalConfig.sameSecond,
      sameMinute: timeDifferenceMs <= finalConfig.sameMinute,
      sameHour: timeDifferenceMs <= finalConfig.sameHour,
      sameDay: timeDifferenceMs <= finalConfig.sameDay,
      sameWeek: timeDifferenceMs <= finalConfig.sameWeek,
      rapidTrading: timeDifferenceMs <= finalConfig.rapidTrading,
      partialFill: timeDifferenceMs <= finalConfig.partialFill,
      splitOrder: timeDifferenceMs <= finalConfig.splitOrder,
      settlement: timeDifferenceMs <= finalConfig.settlement
    };
    
    // Calculate confidence scores
    const confidenceScores = this.calculateTimeConfidenceScores(timeDifferenceMs, finalConfig);
    
    // Assess duplicate risk
    const { duplicateRisk, riskFactors } = this.assessTimeBasedRisk(withinWindows, email1, email2);
    
    // Analyze market context
    const marketContext = this.analyzeMarketContext(date1);
    
    // Handle timezone information
    const timezoneInfo = this.analyzeTimezones(email1, email2);
    
    return {
      timeDifferenceMs,
      timeDifferenceFormatted,
      withinWindows,
      confidenceScores,
      duplicateRisk,
      riskFactors,
      marketContext,
      timezoneInfo
    };
  }

  /**
   * Detect rapid trading patterns
   */
  static detectRapidTradingPattern(
    emails: WealthsimpleEmailData[],
    symbol?: string,
    timeWindowMs: number = 30 * 60 * 1000 // 30 minutes
  ): RapidTradingPattern {
    // Filter emails by symbol if provided
    const filteredEmails = symbol 
      ? emails.filter(email => email.symbol === symbol)
      : emails;
    
    if (filteredEmails.length < 2) {
      return {
        isRapidTrading: false,
        transactionCount: filteredEmails.length,
        averageInterval: 0,
        pattern: 'none',
        confidence: 0,
        riskLevel: 'low'
      };
    }
    
    // Sort by transaction date
    const sortedEmails = filteredEmails
      .map(email => ({
        email,
        date: this.parseEmailDate(email)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < sortedEmails.length; i++) {
      const interval = sortedEmails[i].date.getTime() - sortedEmails[i - 1].date.getTime();
      intervals.push(interval);
    }
    
    // Check if transactions are within the time window
    const rapidTransactions = intervals.filter(interval => interval <= timeWindowMs);
    const isRapidTrading = rapidTransactions.length >= 2;
    
    const averageInterval = intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;
    
    // Determine pattern
    let pattern: 'burst' | 'systematic' | 'random' | 'none' = 'none';
    if (isRapidTrading) {
      const variance = this.calculateVariance(intervals);
      const mean = averageInterval;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      
      if (coefficientOfVariation < 0.2) {
        pattern = 'systematic'; // Very regular intervals
      } else if (rapidTransactions.length >= 3 && rapidTransactions.length === intervals.length) {
        pattern = 'burst'; // All transactions in rapid succession
      } else {
        pattern = 'random'; // Mixed intervals
      }
    }
    
    // Calculate confidence
    const confidence = isRapidTrading 
      ? Math.min(0.9, (rapidTransactions.length / intervals.length) * 0.8 + 0.2)
      : 0;
    
    // Assess risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (isRapidTrading) {
      if (pattern === 'burst' && rapidTransactions.length >= 5) {
        riskLevel = 'high';
      } else if (pattern === 'systematic' || rapidTransactions.length >= 3) {
        riskLevel = 'medium';
      }
    }
    
    return {
      isRapidTrading,
      transactionCount: filteredEmails.length,
      averageInterval,
      pattern,
      confidence,
      riskLevel
    };
  }

  /**
   * Analyze potential partial fills
   */
  static analyzePartialFills(
    emails: WealthsimpleEmailData[],
    symbol: string,
    targetQuantity?: number
  ): PartialFillAnalysis {
    const symbolEmails = emails.filter(email => 
      email.symbol === symbol && 
      email.transactionType === 'buy' || email.transactionType === 'sell'
    );
    
    if (symbolEmails.length < 2) {
      return {
        isPotentialPartialFill: false,
        totalQuantityPattern: symbolEmails.map(e => e.quantity),
        priceConsistency: true,
        timeSpread: 0,
        confidence: 0,
        suggestedAction: 'separate'
      };
    }
    
    // Sort by transaction date
    const sortedEmails = symbolEmails
      .map(email => ({ email, date: this.parseEmailDate(email) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const quantities = sortedEmails.map(item => item.email.quantity);
    const prices = sortedEmails.map(item => item.email.price);
    
    // Check price consistency (partial fills usually have same or very similar prices)
    const priceVariance = this.calculateVariance(prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceConsistency = (Math.sqrt(priceVariance) / avgPrice) < 0.05; // 5% tolerance
    
    // Calculate time spread
    const firstDate = sortedEmails[0].date.getTime();
    const lastDate = sortedEmails[sortedEmails.length - 1].date.getTime();
    const timeSpread = lastDate - firstDate;
    
    // Check if this could be partial fills
    const totalQuantity = quantities.reduce((sum, qty) => sum + qty, 0);
    const withinPartialFillWindow = timeSpread <= this.DEFAULT_CONFIG.partialFill;
    
    let isPotentialPartialFill = false;
    let confidence = 0;
    
    if (priceConsistency && withinPartialFillWindow && symbolEmails.length >= 2) {
      isPotentialPartialFill = true;
      confidence = 0.7;
      
      // Higher confidence if we have a target quantity that matches the total
      if (targetQuantity && Math.abs(totalQuantity - targetQuantity) < 0.01) {
        confidence = 0.9;
      }
      
      // Higher confidence if quantities look like partial fills (not round numbers)
      const hasPartialQuantities = quantities.some(qty => qty % 1 !== 0 || qty % 10 !== 0);
      if (hasPartialQuantities) {
        confidence += 0.1;
      }
    }
    
    // Suggest action
    let suggestedAction: 'group' | 'separate' | 'review' = 'separate';
    if (isPotentialPartialFill) {
      suggestedAction = confidence >= 0.8 ? 'group' : 'review';
    }
    
    return {
      isPotentialPartialFill,
      totalQuantityPattern: quantities,
      priceConsistency,
      timeSpread,
      confidence: Math.min(confidence, 1.0),
      suggestedAction
    };
  }

  /**
   * Analyze potential split orders
   */
  static analyzeSplitOrders(
    emails: WealthsimpleEmailData[],
    symbol: string
  ): SplitOrderAnalysis {
    const symbolEmails = emails.filter(email => email.symbol === symbol);
    
    if (symbolEmails.length < 2) {
      return {
        isPotentialSplitOrder: false,
        orderSizePattern: symbolEmails.map(e => e.quantity),
        executionTiming: [],
        priceVariation: 0,
        confidence: 0,
        suggestedGrouping: []
      };
    }
    
    // Sort by transaction date
    const sortedEmails = symbolEmails
      .map(email => ({ email, date: this.parseEmailDate(email) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const quantities = sortedEmails.map(item => item.email.quantity);
    const prices = sortedEmails.map(item => item.email.price);
    const executionTiming = sortedEmails.map(item => item.date.getTime());
    
    // Calculate price variation
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceVariation = Math.max(...prices) - Math.min(...prices);
    const priceVariationPercent = priceVariation / avgPrice;
    
    // Check timing patterns for split orders
    const timeIntervals = [];
    for (let i = 1; i < executionTiming.length; i++) {
      timeIntervals.push(executionTiming[i] - executionTiming[i - 1]);
    }
    
    const withinSplitOrderWindow = timeIntervals.every(interval => 
      interval <= this.DEFAULT_CONFIG.splitOrder
    );
    
    // Analyze quantity patterns (split orders often have similar sizes)
    const quantityVariance = this.calculateVariance(quantities);
    const avgQuantity = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length;
    const quantityConsistency = (Math.sqrt(quantityVariance) / avgQuantity) < 0.3; // 30% tolerance
    
    let isPotentialSplitOrder = false;
    let confidence = 0;
    
    if (withinSplitOrderWindow && priceVariationPercent < 0.1 && quantities.length >= 2) {
      isPotentialSplitOrder = true;
      confidence = 0.6;
      
      // Higher confidence for consistent quantities
      if (quantityConsistency) {
        confidence += 0.2;
      }
      
      // Higher confidence for systematic timing
      const avgInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
      const intervalVariance = this.calculateVariance(timeIntervals);
      const intervalConsistency = (Math.sqrt(intervalVariance) / avgInterval) < 0.5;
      
      if (intervalConsistency) {
        confidence += 0.2;
      }
    }
    
    // Generate suggested grouping
    const suggestedGrouping = isPotentialSplitOrder 
      ? [`split-order-${symbol}-${Date.now()}`]
      : [];
    
    return {
      isPotentialSplitOrder,
      orderSizePattern: quantities,
      executionTiming,
      priceVariation,
      confidence: Math.min(confidence, 1.0),
      suggestedGrouping
    };
  }

  /**
   * Parse email date with timezone handling
   */
  private static parseEmailDate(email: WealthsimpleEmailData): Date {
    let date = new Date(email.transactionDate);
    
    // Handle execution time if available
    if (email.executionTime) {
      const timeMatch = email.executionTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3] || '0');
        const ampm = timeMatch[4].toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        date.setHours(hours, minutes, seconds, 0);
      }
    }
    
    // Apply timezone offset for EST/EDT
    if (email.timezone === 'EST') {
      date = new Date(date.getTime() + (5 * 60 * 60 * 1000)); // EST is UTC-5
    } else if (email.timezone === 'EDT') {
      date = new Date(date.getTime() + (4 * 60 * 60 * 1000)); // EDT is UTC-4
    }
    
    return date;
  }

  /**
   * Calculate confidence scores for different time windows
   */
  private static calculateTimeConfidenceScores(
    timeDifferenceMs: number,
    config: TimeWindowConfig
  ): TimeWindowAnalysis['confidenceScores'] {
    const scores = {
      sameSecond: 0,
      sameMinute: 0,
      sameHour: 0,
      sameDay: 0,
      rapidTrading: 0,
      partialFill: 0,
      splitOrder: 0
    };
    
    // Same second - highest confidence for duplicates
    if (timeDifferenceMs <= config.sameSecond) {
      scores.sameSecond = 0.95;
    }
    
    // Same minute - very high confidence
    if (timeDifferenceMs <= config.sameMinute) {
      scores.sameMinute = Math.max(0.8, 0.9 - (timeDifferenceMs / config.sameMinute) * 0.1);
    }
    
    // Same hour - high confidence
    if (timeDifferenceMs <= config.sameHour) {
      scores.sameHour = Math.max(0.6, 0.8 - (timeDifferenceMs / config.sameHour) * 0.2);
    }
    
    // Same day - medium confidence
    if (timeDifferenceMs <= config.sameDay) {
      scores.sameDay = Math.max(0.3, 0.6 - (timeDifferenceMs / config.sameDay) * 0.3);
    }
    
    // Rapid trading - specific to HFT scenarios
    if (timeDifferenceMs <= config.rapidTrading) {
      scores.rapidTrading = 0.85;
    }
    
    // Partial fill window
    if (timeDifferenceMs <= config.partialFill) {
      scores.partialFill = Math.max(0.4, 0.7 - (timeDifferenceMs / config.partialFill) * 0.3);
    }
    
    // Split order window
    if (timeDifferenceMs <= config.splitOrder) {
      scores.splitOrder = Math.max(0.3, 0.6 - (timeDifferenceMs / config.splitOrder) * 0.3);
    }
    
    return scores;
  }

  /**
   * Assess time-based duplicate risk
   */
  private static assessTimeBasedRisk(
    withinWindows: TimeWindowAnalysis['withinWindows'],
    email1: WealthsimpleEmailData,
    email2: WealthsimpleEmailData
  ): { duplicateRisk: 'critical' | 'high' | 'medium' | 'low'; riskFactors: string[] } {
    const riskFactors: string[] = [];
    let riskScore = 0;
    
    // Same second is critical
    if (withinWindows.sameSecond) {
      riskScore += 0.9;
      riskFactors.push('Transactions within same second');
    }
    
    // Same minute is high risk
    if (withinWindows.sameMinute) {
      riskScore += 0.7;
      riskFactors.push('Transactions within same minute');
    }
    
    // Rapid trading pattern
    if (withinWindows.rapidTrading) {
      riskScore += 0.6;
      riskFactors.push('Rapid trading pattern detected');
    }
    
    // Same transaction details increase risk
    if (email1.symbol === email2.symbol) {
      riskScore += 0.3;
      riskFactors.push('Same symbol');
    }
    
    if (Math.abs(email1.quantity - email2.quantity) < 0.01) {
      riskScore += 0.3;
      riskFactors.push('Same quantity');
    }
    
    if (Math.abs(email1.price - email2.price) < 0.01) {
      riskScore += 0.3;
      riskFactors.push('Same price');
    }
    
    // Determine overall risk level
    let duplicateRisk: 'critical' | 'high' | 'medium' | 'low';
    if (riskScore >= 1.5) duplicateRisk = 'critical';
    else if (riskScore >= 1.0) duplicateRisk = 'high';
    else if (riskScore >= 0.6) duplicateRisk = 'medium';
    else duplicateRisk = 'low';
    
    return { duplicateRisk, riskFactors };
  }

  /**
   * Analyze market context
   */
  private static analyzeMarketContext(date: Date): TimeWindowAnalysis['marketContext'] {
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = date.getHours() + date.getMinutes() / 60;
    const dateStr = date.toISOString().split('T')[0];
    
    const isWeekend = day === 0 || day === 6;
    const isHoliday = this.MARKET_HOLIDAYS_2025.includes(dateStr);
    
    let marketSession: 'pre-market' | 'regular' | 'after-hours' | 'closed';
    let isMarketHours = false;
    
    if (isWeekend || isHoliday) {
      marketSession = 'closed';
    } else if (hours >= this.MARKET_HOURS.preMarketStart && hours < this.MARKET_HOURS.regularStart) {
      marketSession = 'pre-market';
      isMarketHours = true;
    } else if (hours >= this.MARKET_HOURS.regularStart && hours < this.MARKET_HOURS.regularEnd) {
      marketSession = 'regular';
      isMarketHours = true;
    } else if (hours >= this.MARKET_HOURS.regularEnd && hours < this.MARKET_HOURS.afterHoursEnd) {
      marketSession = 'after-hours';
      isMarketHours = true;
    } else {
      marketSession = 'closed';
    }
    
    return {
      isMarketHours,
      isWeekend,
      isHoliday,
      marketSession
    };
  }

  /**
   * Analyze timezone information
   */
  private static analyzeTimezones(
    email1: WealthsimpleEmailData,
    email2?: WealthsimpleEmailData
  ): TimeWindowAnalysis['timezoneInfo'] {
    const email1Timezone = email1.timezone || 'EST';
    const email2Timezone = email2?.timezone || email1Timezone;
    
    // Normalize to EST/EDT for consistency
    const normalizedTimezone = 'EST'; // Wealthsimple primarily uses EST/EDT
    
    // Calculate offset (simplified)
    let timezoneOffset = 0;
    if (email1Timezone === 'EDT' && email2Timezone === 'EST') {
      timezoneOffset = 60 * 60 * 1000; // 1 hour
    } else if (email1Timezone === 'EST' && email2Timezone === 'EDT') {
      timezoneOffset = -60 * 60 * 1000; // -1 hour
    }
    
    return {
      email1Timezone,
      email2Timezone,
      normalizedTimezone,
      timezoneOffset
    };
  }

  /**
   * Format time difference for human readability
   */
  private static formatTimeDifference(timeDifferenceMs: number): string {
    const seconds = Math.floor(timeDifferenceMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / numbers.length;
  }

  /**
   * Validate time window analysis result
   */
  static validateTimeWindowAnalysis(analysis: TimeWindowAnalysis): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (analysis.timeDifferenceMs < 0) {
      errors.push('Time difference cannot be negative');
    }

    if (!['critical', 'high', 'medium', 'low'].includes(analysis.duplicateRisk)) {
      errors.push('Invalid duplicate risk level');
    }

    // Check confidence scores are in valid range
    Object.entries(analysis.confidenceScores).forEach(([key, score]) => {
      if (score < 0 || score > 1) {
        errors.push(`Invalid confidence score for ${key}: ${score}`);
      }
    });

    // Warnings for unusual patterns
    if (analysis.withinWindows.sameSecond && analysis.duplicateRisk !== 'critical') {
      warnings.push('Same second timing should result in critical risk');
    }

    if (analysis.timeDifferenceMs > 7 * 24 * 60 * 60 * 1000) {
      warnings.push('Time difference exceeds one week');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default TimeWindowProcessing;