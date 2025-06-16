/**
 * Multi-Level Duplicate Detection Algorithm
 * Task 5.2: Implement 3-level duplicate detection with confidence scoring
 */

import { EmailIdentificationService, type EmailIdentification, type DuplicateDetectionData } from './emailIdentificationService';
import type { WealthsimpleEmailData } from './wealthsimpleEmailParser';
import { SupabaseService } from '../supabaseService';
import type { Transaction } from '../../lib/database/types';

export interface DuplicateDetectionLevel {
  level: 1 | 2 | 3;
  name: string;
  description: string;
  weight: number; // Confidence weight for this level
}

export interface DuplicateMatch {
  level: DuplicateDetectionLevel;
  confidence: number;
  matchedFields: string[];
  reasons: string[];
  existingTransaction?: Transaction;
  existingIdentification?: EmailIdentification;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  overallConfidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  matches: DuplicateMatch[];
  recommendation: 'accept' | 'reject' | 'review';
  summary: string;
  
  // Email data for context
  emailIdentification: EmailIdentification;
  emailData: WealthsimpleEmailData;
  
  // Processing metadata
  processedAt: string;
  processingTime: number;
}

export interface StoredEmailRecord {
  id: string;
  identification: EmailIdentification;
  emailData: WealthsimpleEmailData;
  transactionId?: string;
  createdAt: string;
  portfolioId: string;
}

/**
 * Multi-Level Duplicate Detection Service
 */
export class MultiLevelDuplicateDetection {
  // Detection levels configuration
  private static readonly DETECTION_LEVELS: DuplicateDetectionLevel[] = [
    {
      level: 1,
      name: 'Email Identity Detection',
      description: 'Message-ID and email hash comparison',
      weight: 0.9 // Highest confidence - identical emails
    },
    {
      level: 2,
      name: 'Order Identity Detection', 
      description: 'Order ID and confirmation number comparison',
      weight: 0.8 // High confidence - same order processed multiple times
    },
    {
      level: 3,
      name: 'Transaction Fingerprint Detection',
      description: 'Transaction details and timing pattern comparison',
      weight: 0.6 // Medium confidence - similar transactions
    }
  ];

  // Confidence thresholds for decision making
  private static readonly CONFIDENCE_THRESHOLDS = {
    REJECT: 0.9,    // 90%+ confidence = reject as duplicate
    REVIEW: 0.6,    // 60%+ confidence = send to manual review
    ACCEPT: 0.6     // <60% confidence = accept as unique
  };

  // Time windows for Level 3 detection
  private static readonly TIME_WINDOWS = {
    SAME_MINUTE: 60 * 1000,        // 1 minute
    SAME_HOUR: 60 * 60 * 1000,     // 1 hour  
    SAME_DAY: 24 * 60 * 60 * 1000, // 1 day
    SAME_WEEK: 7 * 24 * 60 * 60 * 1000 // 1 week
  };

  /**
   * Main duplicate detection method
   */
  static async detectDuplicates(
    emailData: WealthsimpleEmailData,
    portfolioId: string,
    rawHeaders?: string
  ): Promise<DuplicateDetectionResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Extract email identification
      const emailIdentification = EmailIdentificationService.extractIdentification(
        emailData.subject,
        emailData.fromEmail,
        emailData.rawContent,
        undefined, // textContent - not separately available in WealthsimpleEmailData
        rawHeaders
      );

      // Step 2: Get stored email records for comparison
      const storedRecords = await this.getStoredEmailRecords(portfolioId);

      // Step 3: Run all detection levels
      const matches: DuplicateMatch[] = [];
      
      // Level 1: Email Identity Detection
      const level1Matches = await this.runLevel1Detection(emailIdentification, storedRecords);
      matches.push(...level1Matches);

      // Level 2: Order Identity Detection  
      const level2Matches = await this.runLevel2Detection(emailIdentification, storedRecords);
      matches.push(...level2Matches);

      // Level 3: Transaction Fingerprint Detection
      const level3Matches = await this.runLevel3Detection(emailIdentification, emailData, storedRecords, portfolioId);
      matches.push(...level3Matches);

      // Step 4: Calculate overall confidence and make recommendation
      const result = this.calculateResult(matches, emailIdentification, emailData, startTime);

      return result;

    } catch (error) {
      // Return safe default on error
      const emailIdentification = EmailIdentificationService.extractIdentification(
        emailData.subject,
        emailData.fromEmail,
        emailData.rawContent
      );

      return {
        isDuplicate: false,
        overallConfidence: 0,
        riskLevel: 'low',
        matches: [],
        recommendation: 'accept',
        summary: `Error during duplicate detection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        emailIdentification,
        emailData,
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Level 1: Email Identity Detection
   * Compares Message-ID and email hash for exact email duplicates
   */
  private static async runLevel1Detection(
    emailIdentification: EmailIdentification,
    storedRecords: StoredEmailRecord[]
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];
    const level = this.DETECTION_LEVELS[0]; // Level 1

    for (const record of storedRecords) {
      const comparison = EmailIdentificationService.compareIdentifications(
        emailIdentification,
        record.identification
      );

      // Check for Message-ID match (strongest indicator)
      if (emailIdentification.messageId && 
          record.identification.messageId &&
          emailIdentification.messageId === record.identification.messageId) {
        
        matches.push({
          level,
          confidence: 0.95,
          matchedFields: ['messageId'],
          reasons: ['Identical Message-ID - exact same email'],
          existingIdentification: record.identification
        });
      }
      
      // Check for email hash match (very strong indicator)
      else if (emailIdentification.emailHash === record.identification.emailHash) {
        matches.push({
          level,
          confidence: 0.9,
          matchedFields: ['emailHash'],
          reasons: ['Identical email hash - same email content'],
          existingIdentification: record.identification
        });
      }
    }

    return matches;
  }

  /**
   * Level 2: Order Identity Detection
   * Compares order IDs and confirmation numbers
   */
  private static async runLevel2Detection(
    emailIdentification: EmailIdentification,
    storedRecords: StoredEmailRecord[]
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];
    const level = this.DETECTION_LEVELS[1]; // Level 2

    for (const record of storedRecords) {
      const matchedFields: string[] = [];
      const reasons: string[] = [];
      let confidence = 0;

      // Check order ID overlap
      const orderIdOverlap = emailIdentification.orderIds.filter(id => 
        record.identification.orderIds.includes(id)
      );
      
      if (orderIdOverlap.length > 0) {
        matchedFields.push('orderIds');
        reasons.push(`Shared order IDs: ${orderIdOverlap.join(', ')}`);
        confidence += 0.7 * (orderIdOverlap.length / Math.max(emailIdentification.orderIds.length, record.identification.orderIds.length));
      }

      // Check confirmation number overlap
      const confirmationOverlap = emailIdentification.confirmationNumbers.filter(num => 
        record.identification.confirmationNumbers.includes(num)
      );
      
      if (confirmationOverlap.length > 0) {
        matchedFields.push('confirmationNumbers');
        reasons.push(`Shared confirmation numbers: ${confirmationOverlap.join(', ')}`);
        confidence += 0.6 * (confirmationOverlap.length / Math.max(emailIdentification.confirmationNumbers.length, record.identification.confirmationNumbers.length));
      }

      // Check transaction hash (order-related fingerprint)
      if (emailIdentification.transactionHash === record.identification.transactionHash) {
        matchedFields.push('transactionHash');
        reasons.push('Identical transaction fingerprint');
        confidence += 0.5;
      }

      // Only add match if we found something significant
      if (confidence >= 0.4) {
        matches.push({
          level,
          confidence: Math.min(confidence, 1.0),
          matchedFields,
          reasons,
          existingIdentification: record.identification
        });
      }
    }

    return matches;
  }

  /**
   * Level 3: Transaction Fingerprint Detection
   * Compares transaction details with time windows
   */
  private static async runLevel3Detection(
    emailIdentification: EmailIdentification,
    emailData: WealthsimpleEmailData,
    storedRecords: StoredEmailRecord[],
    portfolioId: string
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];
    const level = this.DETECTION_LEVELS[2]; // Level 3

    // Also check against actual transactions in database
    const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
    const existingTransactions = transactionsResult.success ? transactionsResult.data || [] : [];

    // Check against stored email records
    for (const record of storedRecords) {
      const match = this.compareTransactionDetails(emailData, record.emailData);
      if (match.confidence >= 0.3) { // Lower threshold for Level 3
        matches.push({
          level,
          confidence: match.confidence,
          matchedFields: match.matchedFields,
          reasons: match.reasons,
          existingIdentification: record.identification
        });
      }
    }

    // Check against existing transactions
    const emailDate = new Date(emailData.transactionDate);
    
    for (const transaction of existingTransactions) {
      const match = this.compareWithTransaction(emailData, transaction, emailDate);
      if (match.confidence >= 0.3) {
        matches.push({
          level,
          confidence: match.confidence,
          matchedFields: match.matchedFields,
          reasons: match.reasons,
          existingTransaction: transaction
        });
      }
    }

    return matches;
  }

  /**
   * Compare transaction details between two emails
   */
  private static compareTransactionDetails(
    emailData1: WealthsimpleEmailData,
    emailData2: WealthsimpleEmailData
  ): { confidence: number; matchedFields: string[]; reasons: string[] } {
    const matchedFields: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Symbol match (high weight)
    if (emailData1.symbol === emailData2.symbol) {
      matchedFields.push('symbol');
      reasons.push(`Same symbol: ${emailData1.symbol}`);
      confidence += 0.3;
    }

    // Transaction type match
    if (emailData1.transactionType === emailData2.transactionType) {
      matchedFields.push('transactionType');
      reasons.push(`Same transaction type: ${emailData1.transactionType}`);
      confidence += 0.2;
    }

    // Quantity match (with tolerance)
    if (Math.abs(emailData1.quantity - emailData2.quantity) < 0.01) {
      matchedFields.push('quantity');
      reasons.push(`Same quantity: ${emailData1.quantity}`);
      confidence += 0.25;
    }

    // Price match (with tolerance)
    if (Math.abs(emailData1.price - emailData2.price) < 0.01) {
      matchedFields.push('price');
      reasons.push(`Same price: $${emailData1.price}`);
      confidence += 0.25;
    }

    // Time-based analysis
    const date1 = new Date(emailData1.transactionDate);
    const date2 = new Date(emailData2.transactionDate);
    const timeDiff = Math.abs(date1.getTime() - date2.getTime());

    if (timeDiff <= this.TIME_WINDOWS.SAME_MINUTE) {
      matchedFields.push('timing');
      reasons.push('Same minute execution');
      confidence += 0.3;
    } else if (timeDiff <= this.TIME_WINDOWS.SAME_HOUR) {
      matchedFields.push('timing');
      reasons.push('Same hour execution');
      confidence += 0.2;
    } else if (timeDiff <= this.TIME_WINDOWS.SAME_DAY) {
      matchedFields.push('timing');
      reasons.push('Same day execution');
      confidence += 0.1;
    }

    return { confidence: Math.min(confidence, 1.0), matchedFields, reasons };
  }

  /**
   * Compare email data with existing transaction
   */
  private static compareWithTransaction(
    emailData: WealthsimpleEmailData,
    transaction: Transaction,
    emailDate: Date
  ): { confidence: number; matchedFields: string[]; reasons: string[] } {
    const matchedFields: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Symbol match
    if (transaction.asset?.symbol === emailData.symbol) {
      matchedFields.push('symbol');
      reasons.push(`Same symbol: ${emailData.symbol}`);
      confidence += 0.3;
    }

    // Transaction type match
    if (transaction.transaction_type === emailData.transactionType) {
      matchedFields.push('transactionType');
      reasons.push(`Same transaction type: ${emailData.transactionType}`);
      confidence += 0.2;
    }

    // Quantity match
    if (Math.abs(transaction.quantity - emailData.quantity) < 0.01) {
      matchedFields.push('quantity');
      reasons.push(`Same quantity: ${emailData.quantity}`);
      confidence += 0.25;
    }

    // Price match
    if (Math.abs(transaction.price - emailData.price) < 0.01) {
      matchedFields.push('price');
      reasons.push(`Same price: $${emailData.price}`);
      confidence += 0.25;
    }

    // Date comparison
    const transactionDate = new Date(transaction.transaction_date);
    const timeDiff = Math.abs(emailDate.getTime() - transactionDate.getTime());

    if (timeDiff <= this.TIME_WINDOWS.SAME_DAY) {
      matchedFields.push('timing');
      reasons.push('Same day transaction');
      confidence += 0.15;
    }

    return { confidence: Math.min(confidence, 1.0), matchedFields, reasons };
  }

  /**
   * Calculate final result from all matches
   */
  private static calculateResult(
    matches: DuplicateMatch[],
    emailIdentification: EmailIdentification,
    emailData: WealthsimpleEmailData,
    startTime: number
  ): DuplicateDetectionResult {
    // Calculate weighted confidence
    let totalConfidence = 0;
    let totalWeight = 0;

    for (const match of matches) {
      const weight = match.level.weight;
      totalConfidence += match.confidence * weight;
      totalWeight += weight;
    }

    const overallConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallConfidence >= 0.9) riskLevel = 'critical';
    else if (overallConfidence >= 0.7) riskLevel = 'high';
    else if (overallConfidence >= 0.4) riskLevel = 'medium';
    else riskLevel = 'low';

    // Make recommendation
    let recommendation: 'accept' | 'reject' | 'review';
    if (overallConfidence >= this.CONFIDENCE_THRESHOLDS.REJECT) {
      recommendation = 'reject';
    } else if (overallConfidence >= this.CONFIDENCE_THRESHOLDS.REVIEW) {
      recommendation = 'review';
    } else {
      recommendation = 'accept';
    }

    // Generate summary
    const summary = this.generateSummary(matches, overallConfidence, recommendation);

    return {
      isDuplicate: overallConfidence >= this.CONFIDENCE_THRESHOLDS.REVIEW,
      overallConfidence,
      riskLevel,
      matches,
      recommendation,
      summary,
      emailIdentification,
      emailData,
      processedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Generate human-readable summary
   */
  private static generateSummary(
    matches: DuplicateMatch[],
    confidence: number,
    recommendation: string
  ): string {
    if (matches.length === 0) {
      return 'No duplicate indicators found. Email appears to be unique.';
    }

    const level1Matches = matches.filter(m => m.level.level === 1);
    const level2Matches = matches.filter(m => m.level.level === 2);
    const level3Matches = matches.filter(m => m.level.level === 3);

    let summary = `Duplicate detection confidence: ${(confidence * 100).toFixed(1)}%. `;

    if (level1Matches.length > 0) {
      summary += `Found ${level1Matches.length} email identity match(es). `;
    }
    if (level2Matches.length > 0) {
      summary += `Found ${level2Matches.length} order identity match(es). `;
    }
    if (level3Matches.length > 0) {
      summary += `Found ${level3Matches.length} transaction fingerprint match(es). `;
    }

    summary += `Recommendation: ${recommendation.toUpperCase()}.`;

    return summary;
  }

  /**
   * Get stored email records for comparison
   * Note: This is a placeholder - in real implementation, this would query a database
   */
  private static async getStoredEmailRecords(portfolioId: string): Promise<StoredEmailRecord[]> {
    // TODO: Implement database storage for email records
    // For now, return empty array - this will be implemented in future tasks
    return [];
  }

  /**
   * Store email record for future duplicate detection
   */
  static async storeEmailRecord(
    emailIdentification: EmailIdentification,
    emailData: WealthsimpleEmailData,
    portfolioId: string,
    transactionId?: string
  ): Promise<void> {
    // TODO: Implement database storage
    // This would store the email record in a database table for future comparisons
    console.log('TODO: Store email record for future duplicate detection', {
      emailHash: emailIdentification.emailHash,
      portfolioId,
      transactionId
    });
  }

  /**
   * Validate detection result
   */
  static validateDetectionResult(result: DuplicateDetectionResult): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (result.overallConfidence < 0 || result.overallConfidence > 1) {
      errors.push('Overall confidence must be between 0 and 1');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(result.riskLevel)) {
      errors.push('Invalid risk level');
    }

    if (!['accept', 'reject', 'review'].includes(result.recommendation)) {
      errors.push('Invalid recommendation');
    }

    // Check for inconsistencies
    if (result.overallConfidence >= 0.9 && result.recommendation !== 'reject') {
      warnings.push('High confidence but not marked for rejection');
    }

    if (result.matches.length === 0 && result.isDuplicate) {
      warnings.push('Marked as duplicate but no matches found');
    }

    if (result.processingTime > 5000) {
      warnings.push('Detection took longer than 5 seconds');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default MultiLevelDuplicateDetection;