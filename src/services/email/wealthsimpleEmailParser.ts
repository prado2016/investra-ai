/**
 * Wealthsimple Email Parser
 * Extracts transaction details from Wealthsimple confirmation emails
 */

export interface WealthsimpleEmailData {
  // Transaction details
  symbol: string;
  transactionType: 'buy' | 'sell' | 'dividend' | 'option_expired';
  quantity: number;
  price: number;
  totalAmount: number;
  fees?: number;
  
  // Account information
  accountType: string; // TFSA, RRSP, Margin, etc.
  accountNumber?: string;
  
  // Timing
  transactionDate: string;
  executionTime?: string;
  timezone: string;
  
  // Asset details
  assetName?: string;
  exchange?: string;
  currency: string;
  
  // Additional data
  orderId?: string;
  confirmationNumber?: string;
  
  // Raw email data
  subject: string;
  fromEmail: string;
  rawContent: string;
  
  // Parsing metadata
  confidence: number; // 0-1 confidence in parsing accuracy
  parseMethod: string; // Which parsing method was used
}

export interface EmailParseResult {
  success: boolean;
  data: WealthsimpleEmailData | null;
  error?: string;
  warnings?: string[];
}

/**
 * Wealthsimple Email Parser Class
 */
export class WealthsimpleEmailParser {
  private static readonly WEALTHSIMPLE_DOMAINS = [
    'wealthsimple.com',
    'notifications.wealthsimple.com',
    'trade.wealthsimple.com'
  ];

  private static readonly TRANSACTION_PATTERNS = {
    // Common transaction patterns
    buy: /(?:bought|purchased|buy|acquired)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:shares?\s+of\s+)?([A-Z]{1,5}(?:\.[A-Z]{2})?)/i,
    sell: /(?:sold|sell)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:shares?\s+of\s+)?([A-Z]{1,5}(?:\.[A-Z]{2})?)/i,
    dividend: /(?:dividend|div)\s+(?:payment|received).*?([A-Z]{1,5}(?:\.[A-Z]{2})?)/i,
    option_expired: /(?:option|call|put)\s+(?:expired|expiry).*?([A-Z]{1,5}(?:\.[A-Z]{2})?)/i
  };

  private static readonly PRICE_PATTERNS = [
    /(?:at|@|price)\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2,4})?)/i,
    /[\$](\d+(?:,\d{3})*(?:\.\d{2,4}))/g,
    /(\d+(?:,\d{3})*(?:\.\d{2,4}))\s*(?:per\s+share|each)/i
  ];

  private static readonly ACCOUNT_PATTERNS = {
    TFSA: /tfsa|tax.free.savings/i,
    RRSP: /rrsp|registered.retirement/i,
    RESP: /resp|registered.education/i,
    Margin: /margin|non.registered/i,
    Cash: /cash|personal/i,
    LIRA: /lira|locked.in.retirement/i,
    RRIF: /rrif|registered.retirement.income/i
  };

  private static readonly DATE_PATTERNS = [
    /(\d{4}-\d{2}-\d{2})/g, // 2025-01-15
    /(\d{2}\/\d{2}\/\d{4})/g, // 01/15/2025
    /(\w+\s+\d{1,2},?\s+\d{4})/g, // January 15, 2025
    /(\d{1,2}\s+\w+\s+\d{4})/g // 15 January 2025
  ];

  private static readonly TIME_PATTERNS = [
    /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm))/g,
    /(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:EST|EDT|ET)/g
  ];

  /**
   * Parse Wealthsimple email content
   */
  static parseEmail(
    subject: string,
    fromEmail: string,
    htmlContent: string,
    textContent?: string
  ): EmailParseResult {
    try {
      // Validate this is a Wealthsimple email
      if (!this.isWealthsimpleEmail(fromEmail)) {
        return {
          success: false,
          error: 'Email is not from a recognized Wealthsimple domain'
        };
      }

      // Determine if this is a transaction confirmation
      if (!this.isTransactionEmail(subject, htmlContent, textContent)) {
        return {
          success: false,
          error: 'Email does not appear to be a transaction confirmation'
        };
      }

      // Try multiple parsing methods
      const parseResults = [
        this.parseHTML(subject, fromEmail, htmlContent),
        this.parseText(subject, fromEmail, textContent || ''),
        this.parseSubject(subject, fromEmail, htmlContent || textContent || '')
      ];

      // Find the best result
      const bestResult = parseResults
        .filter(r => r.success)
        .sort((a, b) => (b.data?.confidence || 0) - (a.data?.confidence || 0))[0];

      if (bestResult && bestResult.success) {
        return bestResult;
      }

      return {
        success: false,
        error: 'Unable to parse transaction details from email',
        warnings: parseResults.map(r => r.error).filter(Boolean) as string[]
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  /**
   * Verify email is from Wealthsimple
   */
  private static isWealthsimpleEmail(fromEmail: string): boolean {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    return this.WEALTHSIMPLE_DOMAINS.some(d => 
      domain === d || domain?.endsWith('.' + d)
    );
  }

  /**
   * Check if email appears to be a transaction confirmation
   */
  private static isTransactionEmail(
    subject: string, 
    htmlContent: string, 
    textContent?: string
  ): boolean {
    const content = (subject + ' ' + htmlContent + ' ' + (textContent || '')).toLowerCase();
    
    const transactionKeywords = [
      'trade confirmation', 'order filled', 'transaction complete',
      'bought', 'sold', 'purchased', 'dividend', 'option expired',
      'confirmation', 'executed', 'settlement'
    ];

    return transactionKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Parse HTML email content
   */
  private static parseHTML(
    subject: string,
    fromEmail: string,
    htmlContent: string
  ): EmailParseResult {
    try {
      // Strip HTML tags to get clean text
      const cleanText = htmlContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return this.parseTextContent(subject, fromEmail, cleanText, htmlContent, 'HTML');
    } catch (error) {
      return {
        success: false,
        error: `HTML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Parse plain text email content
   */
  private static parseText(
    subject: string,
    fromEmail: string,
    textContent: string
  ): EmailParseResult {
    return this.parseTextContent(subject, fromEmail, textContent, textContent, 'TEXT');
  }

  /**
   * Parse email subject line only
   */
  private static parseSubject(
    subject: string,
    fromEmail: string,
    rawContent: string
  ): EmailParseResult {
    return this.parseTextContent(subject, fromEmail, subject, rawContent, 'SUBJECT');
  }

  /**
   * Core text parsing logic
   */
  private static parseTextContent(
    subject: string,
    fromEmail: string,
    content: string,
    rawContent: string,
    method: string
  ): EmailParseResult {
    try {
      let confidence = 0;
      const warnings: string[] = [];

      // Extract transaction type and symbol
      const transactionResult = this.extractTransaction(content);
      if (!transactionResult.success) {
        return {
          success: false,
          error: `Failed to extract transaction details: ${transactionResult.error}`
        };
      }

      confidence += 0.3; // Base confidence for finding transaction

      // Extract price information
      const priceResult = this.extractPrice(content);
      if (!priceResult.success) {
        warnings.push('Could not extract price information reliably');
      } else {
        confidence += 0.2;
      }

      // Extract account type
      const accountType = this.extractAccountType(content);
      confidence += accountType ? 0.1 : 0;

      // Extract dates and times
      const dateResult = this.extractDateTime(content);
      confidence += dateResult.date ? 0.2 : 0;
      confidence += dateResult.time ? 0.1 : 0;

      // Extract currency
      const currency = this.extractCurrency(content);
      confidence += currency ? 0.1 : 0;

      // Calculate total amount if possible
      const totalAmount = this.calculateTotalAmount(
        transactionResult.data.quantity,
        priceResult.data?.price || 0,
        priceResult.data?.fees || 0
      );

      const emailData: WealthsimpleEmailData = {
        // Transaction details
        symbol: transactionResult.data.symbol,
        transactionType: transactionResult.data.type,
        quantity: transactionResult.data.quantity,
        price: priceResult.data?.price || 0,
        totalAmount,
        fees: priceResult.data?.fees,

        // Account information
        accountType: accountType || 'Unknown',

        // Timing
        transactionDate: dateResult.date || new Date().toISOString().split('T')[0],
        executionTime: dateResult.time,
        timezone: dateResult.timezone || 'EST',

        // Asset details
        assetName: transactionResult.data.assetName,
        currency: currency || 'CAD',

        // Raw email data
        subject,
        fromEmail,
        rawContent,

        // Parsing metadata
        confidence: Math.min(confidence, 1.0),
        parseMethod: method
      };

      return {
        success: true,
        data: emailData,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: `Text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract transaction type, symbol, and quantity
   */
  private static extractTransaction(content: string): {
    success: boolean;
    data: { type: any; symbol: string; quantity: number; assetName?: string };
    error?: string;
  } {
    for (const [type, pattern] of Object.entries(this.TRANSACTION_PATTERNS)) {
      const match = content.match(pattern);
      if (match) {
        const quantity = parseFloat(match[1].replace(/,/g, ''));
        const symbol = match[2].toUpperCase();
        
        return {
          success: true,
          data: {
            type: type as any,
            symbol,
            quantity,
            assetName: this.extractAssetName(content, symbol)
          }
        };
      }
    }

    return {
      success: false,
      data: { type: 'buy', symbol: '', quantity: 0 },
      error: 'No transaction pattern matched'
    };
  }

  /**
   * Extract price and fee information
   */
  private static extractPrice(content: string): {
    success: boolean;
    data?: { price: number; fees?: number };
    error?: string;
  } {
    const prices: number[] = [];
    
    for (const pattern of this.PRICE_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price > 0 && price < 10000) { // Reasonable price range
          prices.push(price);
        }
      }
    }

    if (prices.length === 0) {
      return {
        success: false,
        error: 'No price information found'
      };
    }

    // Take the most reasonable price (usually the first valid one)
    const price = prices[0];
    
    // Look for fees
    const feeMatch = content.match(/(?:fee|commission|charge)[\s\$]*(\d+(?:\.\d{2})?)/i);
    const fees = feeMatch ? parseFloat(feeMatch[1]) : undefined;

    return {
      success: true,
      data: { price, fees }
    };
  }

  /**
   * Extract account type
   */
  private static extractAccountType(content: string): string | null {
    for (const [type, pattern] of Object.entries(this.ACCOUNT_PATTERNS)) {
      if (pattern.test(content)) {
        return type;
      }
    }
    return null;
  }

  /**
   * Extract date and time information
   */
  private static extractDateTime(content: string): {
    date?: string;
    time?: string;
    timezone?: string;
  } {
    const result: { date?: string; time?: string; timezone?: string } = {};

    // Extract date
    for (const pattern of this.DATE_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        result.date = this.normalizeDate(match[1]);
        break;
      }
    }

    // Extract time
    for (const pattern of this.TIME_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        result.time = match[1];
        if (content.includes('EDT')) result.timezone = 'EDT';
        else if (content.includes('EST')) result.timezone = 'EST';
        break;
      }
    }

    return result;
  }

  /**
   * Extract currency information
   */
  private static extractCurrency(content: string): string | null {
    if (content.includes('USD') || content.includes('$USD')) return 'USD';
    if (content.includes('CAD') || content.includes('$CAD')) return 'CAD';
    if (content.includes('C$')) return 'CAD';
    return 'CAD'; // Default for Wealthsimple
  }

  /**
   * Extract asset name from content
   */
  private static extractAssetName(content: string, symbol: string): string | undefined {
    // Look for company name near the symbol
    const symbolIndex = content.indexOf(symbol);
    if (symbolIndex === -1) return undefined;

    const before = content.substring(Math.max(0, symbolIndex - 100), symbolIndex);
    const after = content.substring(symbolIndex + symbol.length, symbolIndex + symbol.length + 100);
    
    // Common patterns for company names
    const namePatterns = [
      /([A-Z][a-zA-Z\s&\.]+(?:Inc|Corp|Ltd|LLC|Company))/,
      /([A-Z][a-zA-Z\s&\.]{10,50})/
    ];

    for (const pattern of namePatterns) {
      const beforeMatch = before.match(pattern);
      const afterMatch = after.match(pattern);
      
      if (afterMatch) return afterMatch[1].trim();
      if (beforeMatch) return beforeMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private static normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Calculate total transaction amount
   */
  private static calculateTotalAmount(quantity: number, price: number, fees: number = 0): number {
    return (quantity * price) + fees;
  }

  /**
   * Validate parsed data
   */
  static validateParsedData(data: WealthsimpleEmailData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.symbol || data.symbol.length === 0) {
      errors.push('Symbol is required');
    }

    if (data.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (data.price < 0) {
      errors.push('Price cannot be negative');
    }

    if (!['buy', 'sell', 'dividend', 'option_expired'].includes(data.transactionType)) {
      errors.push('Invalid transaction type');
    }

    if (data.confidence < 0.3) {
      errors.push('Parsing confidence too low');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default WealthsimpleEmailParser;
