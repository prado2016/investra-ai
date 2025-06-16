/**
 * Email Identification Service
 * Task 5.1: Extract Message-ID, email hash, order IDs for duplicate detection
 */

import { createHash } from 'crypto';

export interface EmailIdentification {
  // Unique identifiers
  messageId?: string;
  emailHash: string;
  contentHash: string;
  
  // Wealthsimple-specific identifiers
  orderIds: string[];
  confirmationNumbers: string[];
  
  // Transaction identifiers for duplicate detection
  transactionHash: string;
  
  // Metadata
  fromEmail: string;
  subject: string;
  timestamp: string;
  
  // Processing info
  extractedAt: string;
  extractionMethod: string;
}

export interface DuplicateDetectionData {
  // Core identifiers
  identification: EmailIdentification;
  
  // Transaction details for comparison
  symbol?: string;
  transactionType?: string;
  quantity?: number;
  price?: number;
  transactionDate?: string;
  
  // Confidence scoring
  identificationConfidence: number;
  duplicateRisk: 'low' | 'medium' | 'high';
}

/**
 * Email Identification Service Class
 */
export class EmailIdentificationService {
  private static readonly ORDER_ID_PATTERNS = [
    // Wealthsimple order ID patterns
    /(?:order[:\s#]*|id[:\s#]*|confirmation[:\s#]*|reference[:\s#]*)\s*([A-Z]{2,3}\d{6,12})/gi,
    /WS\d{6,12}/gi,
    /\b[A-Z]{2}\d{8,10}\b/g,
    /\b\d{10,15}\b/g, // Generic numeric IDs
  ];

  private static readonly CONFIRMATION_PATTERNS = [
    /(?:confirmation[:\s#]*|conf[:\s#]*|ref[:\s#]*)\s*([A-Z0-9]{6,20})/gi,
    /(?:transaction[:\s#]*|txn[:\s#]*)\s*([A-Z0-9]{6,20})/gi,
  ];

  private static readonly MESSAGE_ID_PATTERNS = [
    /message-id:\s*<([^>]+)>/i,
    /messageId:\s*"([^"]+)"/i,
    /^<([^>]+)>$/m, // Direct Message-ID format
  ];

  /**
   * Extract comprehensive email identification data
   */
  static extractIdentification(
    subject: string,
    fromEmail: string,
    htmlContent: string,
    textContent?: string,
    rawHeaders?: string
  ): EmailIdentification {
    const timestamp = new Date().toISOString();
    const combinedContent = `${subject} ${htmlContent} ${textContent || ''}`;
    
    // Extract Message-ID from headers if available
    const messageId = this.extractMessageId(rawHeaders, htmlContent);
    
    // Generate email hash (for duplicate detection)
    const emailHash = this.generateEmailHash(subject, fromEmail, htmlContent, textContent);
    
    // Generate content hash (for content comparison)
    const contentHash = this.generateContentHash(combinedContent);
    
    // Extract order IDs and confirmation numbers
    const orderIds = this.extractOrderIds(combinedContent);
    const confirmationNumbers = this.extractConfirmationNumbers(combinedContent);
    
    // Generate transaction hash for duplicate detection
    const transactionHash = this.generateTransactionHash(
      subject,
      fromEmail,
      orderIds,
      confirmationNumbers,
      htmlContent,
      textContent
    );

    return {
      messageId,
      emailHash,
      contentHash,
      orderIds,
      confirmationNumbers,
      transactionHash,
      fromEmail,
      subject,
      timestamp,
      extractedAt: timestamp,
      extractionMethod: 'EmailIdentificationService.v1'
    };
  }

  /**
   * Extract Message-ID from email headers or content
   */
  private static extractMessageId(rawHeaders?: string, htmlContent?: string): string | undefined {
    if (rawHeaders) {
      for (const pattern of this.MESSAGE_ID_PATTERNS) {
        const match = rawHeaders.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    // Sometimes Message-ID appears in HTML content
    if (htmlContent) {
      for (const pattern of this.MESSAGE_ID_PATTERNS) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract Wealthsimple order IDs
   */
  private static extractOrderIds(content: string): string[] {
    const orderIds = new Set<string>();
    
    for (const pattern of this.ORDER_ID_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const orderId = match[1] || match[0];
        if (orderId && this.isValidOrderId(orderId)) {
          orderIds.add(orderId.trim().toUpperCase());
        }
      }
    }
    
    return Array.from(orderIds);
  }

  /**
   * Extract confirmation numbers
   */
  private static extractConfirmationNumbers(content: string): string[] {
    const confirmationNumbers = new Set<string>();
    
    for (const pattern of this.CONFIRMATION_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const confirmationNumber = match[1];
        if (confirmationNumber && this.isValidConfirmationNumber(confirmationNumber)) {
          confirmationNumbers.add(confirmationNumber.trim().toUpperCase());
        }
      }
    }
    
    return Array.from(confirmationNumbers);
  }

  /**
   * Generate email hash for duplicate detection
   */
  private static generateEmailHash(
    subject: string,
    fromEmail: string,
    htmlContent: string,
    textContent?: string
  ): string {
    // Normalize content for consistent hashing
    const normalizedSubject = this.normalizeText(subject);
    const normalizedFrom = fromEmail.toLowerCase().trim();
    const normalizedHtml = this.normalizeText(htmlContent);
    const normalizedText = textContent ? this.normalizeText(textContent) : '';
    
    const hashContent = `${normalizedSubject}|${normalizedFrom}|${normalizedHtml}|${normalizedText}`;
    
    return createHash('sha256')
      .update(hashContent)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for readability
  }

  /**
   * Generate content hash for content comparison
   */
  private static generateContentHash(content: string): string {
    const normalizedContent = this.normalizeText(content);
    
    return createHash('md5')
      .update(normalizedContent)
      .digest('hex')
      .substring(0, 12); // Shorter hash for content comparison
  }

  /**
   * Generate transaction hash for duplicate detection
   */
  private static generateTransactionHash(
    subject: string,
    fromEmail: string,
    orderIds: string[],
    confirmationNumbers: string[],
    htmlContent: string,
    textContent?: string
  ): string {
    // Extract key transaction indicators for hashing
    const content = `${subject} ${htmlContent} ${textContent || ''}`;
    
    // Extract potential symbols, quantities, prices for transaction fingerprinting
    const symbols = this.extractSymbols(content);
    const quantities = this.extractQuantities(content);
    const prices = this.extractPrices(content);
    const dates = this.extractDates(content);
    
    const transactionFingerprint = [
      fromEmail.toLowerCase(),
      ...orderIds.sort(),
      ...confirmationNumbers.sort(),
      ...symbols.sort(),
      ...quantities.map(q => q.toString()).sort(),
      ...prices.map(p => p.toFixed(2)).sort(),
      ...dates.sort()
    ].join('|');
    
    return createHash('sha256')
      .update(transactionFingerprint)
      .digest('hex')
      .substring(0, 20); // 20 chars for transaction identification
  }

  /**
   * Extract symbols from content for transaction hashing
   */
  private static extractSymbols(content: string): string[] {
    const symbolPatterns = [
      /\b[A-Z]{1,5}(?:\.[A-Z]{2})?\b/g, // Stock symbols like AAPL, CNR.TO
      /\b[A-Z]{2,5}\b/g // Generic uppercase tokens
    ];
    
    const symbols = new Set<string>();
    
    for (const pattern of symbolPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const symbol = match[0];
        if (symbol.length >= 1 && symbol.length <= 6) {
          symbols.add(symbol);
        }
      }
    }
    
    return Array.from(symbols);
  }

  /**
   * Extract quantities from content
   */
  private static extractQuantities(content: string): number[] {
    const quantityPatterns = [
      /(\d+(?:,\d{3})*(?:\.\d{1,8})?)\s*(?:shares?|units?|contracts?)/gi,
      /(?:bought|sold|purchased)\s+(\d+(?:,\d{3})*(?:\.\d{1,8})?)/gi,
    ];
    
    const quantities = new Set<number>();
    
    for (const pattern of quantityPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const quantity = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(quantity) && quantity > 0) {
          quantities.add(quantity);
        }
      }
    }
    
    return Array.from(quantities);
  }

  /**
   * Extract prices from content
   */
  private static extractPrices(content: string): number[] {
    const pricePatterns = [
      /[$€£¥](\d+(?:,\d{3})*(?:\.\d{2,4})?)/g,
      /(\d+(?:,\d{3})*(?:\.\d{2,4}))\s*(?:per\s+share|each|USD|CAD|EUR)/gi,
    ];
    
    const prices = new Set<number>();
    
    for (const pattern of pricePatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(price) && price > 0 && price < 1000000) { // Reasonable price range
          prices.add(price);
        }
      }
    }
    
    return Array.from(prices);
  }

  /**
   * Extract dates from content
   */
  private static extractDates(content: string): string[] {
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/g,
      /\d{2}\/\d{2}\/\d{4}/g,
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    ];
    
    const dates = new Set<string>();
    
    for (const pattern of datePatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        dates.add(match[0]);
      }
    }
    
    return Array.from(dates);
  }

  /**
   * Validate order ID format
   */
  private static isValidOrderId(orderId: string): boolean {
    if (!orderId || orderId.length < 6 || orderId.length > 20) {
      return false;
    }
    
    // Check for Wealthsimple-specific patterns
    if (orderId.startsWith('WS') && /WS\d{6,12}/.test(orderId)) {
      return true;
    }
    
    // Check for alphanumeric patterns
    if (/^[A-Z]{2,3}\d{6,12}$/.test(orderId)) {
      return true;
    }
    
    // Check for pure numeric IDs
    if (/^\d{10,15}$/.test(orderId)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validate confirmation number format
   */
  private static isValidConfirmationNumber(confirmationNumber: string): boolean {
    if (!confirmationNumber || confirmationNumber.length < 6 || confirmationNumber.length > 20) {
      return false;
    }
    
    // Must be alphanumeric
    return /^[A-Z0-9]{6,20}$/.test(confirmationNumber);
  }

  /**
   * Normalize text for consistent processing
   */
  private static normalizeText(text: string): string {
    return text
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.@-]/g, '') // Keep only word chars, spaces, dots, @, and hyphens
      .toLowerCase()
      .trim();
  }

  /**
   * Create duplicate detection data structure
   */
  static createDuplicateDetectionData(
    identification: EmailIdentification,
    transactionData?: {
      symbol?: string;
      transactionType?: string;
      quantity?: number;
      price?: number;
      transactionDate?: string;
    }
  ): DuplicateDetectionData {
    // Calculate identification confidence
    let confidence = 0.3; // Base confidence
    
    if (identification.messageId) confidence += 0.3;
    if (identification.orderIds.length > 0) confidence += 0.3;
    if (identification.confirmationNumbers.length > 0) confidence += 0.1;
    
    // Calculate duplicate risk
    let duplicateRisk: 'low' | 'medium' | 'high' = 'low';
    
    if (identification.orderIds.length === 0 && !identification.messageId) {
      duplicateRisk = 'high';
    } else if (identification.orderIds.length === 0 || !identification.messageId) {
      duplicateRisk = 'medium';
    }

    return {
      identification,
      ...transactionData,
      identificationConfidence: Math.min(confidence, 1.0),
      duplicateRisk
    };
  }

  /**
   * Compare two email identifications for potential duplicates
   */
  static compareIdentifications(
    identification1: EmailIdentification,
    identification2: EmailIdentification
  ): {
    isDuplicate: boolean;
    confidence: number;
    matchedFields: string[];
    reasons: string[];
  } {
    const matchedFields: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    // Check Message-ID (strongest indicator)
    if (identification1.messageId && identification2.messageId) {
      if (identification1.messageId === identification2.messageId) {
        matchedFields.push('messageId');
        confidence += 0.9;
        reasons.push('Identical Message-ID');
      }
    }

    // Check email hash
    if (identification1.emailHash === identification2.emailHash) {
      matchedFields.push('emailHash');
      confidence += 0.8;
      reasons.push('Identical email hash');
    }

    // Check transaction hash
    if (identification1.transactionHash === identification2.transactionHash) {
      matchedFields.push('transactionHash');
      confidence += 0.7;
      reasons.push('Identical transaction hash');
    }

    // Check order IDs overlap
    const orderIdOverlap = identification1.orderIds.filter(id => 
      identification2.orderIds.includes(id)
    );
    if (orderIdOverlap.length > 0) {
      matchedFields.push('orderIds');
      confidence += 0.6 * (orderIdOverlap.length / Math.max(identification1.orderIds.length, identification2.orderIds.length));
      reasons.push(`Shared order IDs: ${orderIdOverlap.join(', ')}`);
    }

    // Check confirmation numbers overlap
    const confirmationOverlap = identification1.confirmationNumbers.filter(num => 
      identification2.confirmationNumbers.includes(num)
    );
    if (confirmationOverlap.length > 0) {
      matchedFields.push('confirmationNumbers');
      confidence += 0.5 * (confirmationOverlap.length / Math.max(identification1.confirmationNumbers.length, identification2.confirmationNumbers.length));
      reasons.push(`Shared confirmation numbers: ${confirmationOverlap.join(', ')}`);
    }

    // Check content hash
    if (identification1.contentHash === identification2.contentHash) {
      matchedFields.push('contentHash');
      confidence += 0.4;
      reasons.push('Identical content hash');
    }

    const isDuplicate = confidence >= 0.7; // 70% confidence threshold

    return {
      isDuplicate,
      confidence: Math.min(confidence, 1.0),
      matchedFields,
      reasons
    };
  }

  /**
   * Validate identification completeness
   */
  static validateIdentification(identification: EmailIdentification): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!identification.emailHash) {
      errors.push('Email hash is required');
    }

    if (!identification.transactionHash) {
      errors.push('Transaction hash is required');
    }

    if (!identification.fromEmail) {
      errors.push('From email is required');
    }

    if (!identification.subject) {
      errors.push('Subject is required');
    }

    // Warnings for missing optional but important fields
    if (!identification.messageId) {
      warnings.push('Message-ID not found - duplicate detection may be less reliable');
    }

    if (identification.orderIds.length === 0) {
      warnings.push('No order IDs found - duplicate detection may be less reliable');
    }

    if (identification.confirmationNumbers.length === 0) {
      warnings.push('No confirmation numbers found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default EmailIdentificationService;