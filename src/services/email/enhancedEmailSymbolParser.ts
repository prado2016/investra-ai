/**
 * Enhanced Email Symbol Parser
 * Integrates Wealthsimple email parsing with existing AI symbol processing
 */

import { EnhancedAISymbolParser } from '../ai/enhancedSymbolParser';
import { WealthsimpleEmailParser } from './wealthsimpleEmailParser';
import type { WealthsimpleEmailData } from './wealthsimpleEmailParser';

export interface EmailSymbolParseResult {
  symbol: string;
  normalizedSymbol: string;
  confidence: number;
  assetType: 'stock' | 'etf' | 'option' | 'forex' | 'crypto' | 'reit';
  source: 'email-direct' | 'email-ai-enhanced' | 'ai-fallback';
  metadata?: {
    underlying?: string;
    expirationDate?: string;
    strikePrice?: number;
    optionType?: 'call' | 'put';
    exchange?: string;
    currency?: string;
  };
  warnings?: string[];
}

/**
 * Enhanced Email Symbol Parser
 * Bridges email parsing with AI symbol processing
 */
export class EnhancedEmailSymbolParser {
  /**
   * Process symbol from Wealthsimple email data using AI enhancement
   */
  static async processEmailSymbol(
    emailData: WealthsimpleEmailData
  ): Promise<EmailSymbolParseResult> {
    const warnings: string[] = [];
    
    try {
      // Start with the symbol from email parsing
      const emailSymbol = emailData.symbol;
      const assetName = emailData.assetName;
      
      // Determine if we need AI enhancement
      const needsEnhancement = this.shouldEnhanceSymbol(emailSymbol, emailData);
      
      if (!needsEnhancement) {
        // Use email symbol directly with high confidence
        return this.createDirectResult(emailSymbol, emailData);
      }
      
      // Use AI enhancement for complex symbols
      const aiResult = await this.enhanceWithAI(emailSymbol, assetName, emailData);
      
      // Combine email confidence with AI confidence
      const combinedConfidence = this.calculateCombinedConfidence(
        emailData.confidence,
        aiResult.confidence
      );
      
      return {
        symbol: emailSymbol,
        normalizedSymbol: aiResult.parsedSymbol,
        confidence: combinedConfidence,
        assetType: this.mapAssetType(aiResult.type),
        source: 'email-ai-enhanced',
        metadata: {
          ...this.extractEmailMetadata(emailData),
          ...aiResult.metadata
        },
        warnings
      };
      
    } catch (error) {
      warnings.push(`Symbol processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to direct email result
      return {
        ...this.createDirectResult(emailData.symbol, emailData),
        warnings
      };
    }
  }

  /**
   * Determine if symbol needs AI enhancement
   */
  private static shouldEnhanceSymbol(
    symbol: string, 
    emailData: WealthsimpleEmailData
  ): boolean {
    // Simple stock symbols (1-5 characters) usually don't need enhancement
    if (/^[A-Z]{1,5}(\.[A-Z]{2})?$/.test(symbol)) {
      return false;
    }
    
    // Option symbols need enhancement for proper Yahoo Finance format
    if (this.isOptionSymbol(symbol)) {
      return true;
    }
    
    // Complex or unusual symbols need enhancement
    if (symbol.length > 10 || symbol.includes(' ') || symbol.includes('-')) {
      return true;
    }
    
    // Low confidence from email parsing suggests enhancement needed
    if (emailData.confidence < 0.7) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if symbol appears to be an option
   */
  private static isOptionSymbol(symbol: string): boolean {
    // Common option patterns
    const optionPatterns = [
      /CALL$/i,
      /PUT$/i,
      /\$\d+/,
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i,
      /\d{6}[CP]\d{8}$/, // Yahoo Finance option format
    ];
    
    return optionPatterns.some(pattern => pattern.test(symbol));
  }

  /**
   * Create direct result from email data
   */
  private static createDirectResult(
    symbol: string,
    emailData: WealthsimpleEmailData
  ): EmailSymbolParseResult {
    return {
      symbol,
      normalizedSymbol: symbol.toUpperCase(),
      confidence: emailData.confidence,
      assetType: this.inferAssetTypeFromEmail(symbol, emailData),
      source: 'email-direct',
      metadata: this.extractEmailMetadata(emailData)
    };
  }

  /**
   * Enhance symbol using AI parser
   */
  private static async enhanceWithAI(
    symbol: string,
    assetName: string | undefined,
    emailData: WealthsimpleEmailData
  ): Promise<any> {
    // Create enhanced query for AI parser
    const query = this.createAIQuery(symbol, assetName, emailData);
    
    // Use existing AI parser
    const aiResult = await EnhancedAISymbolParser.parseQuery(query);
    
    return aiResult;
  }

  /**
   * Create optimized query for AI parser
   */
  private static createAIQuery(
    symbol: string,
    assetName: string | undefined,
    emailData: WealthsimpleEmailData
  ): string {
    // For options, include all available details
    if (this.isOptionSymbol(symbol)) {
      return symbol; // AI parser already handles option parsing well
    }
    
    // For stocks with company names, include the name
    if (assetName && assetName !== symbol) {
      return `${symbol} ${assetName}`;
    }
    
    // For simple symbols, use as-is
    return symbol;
  }

  /**
   * Calculate combined confidence from email and AI parsing
   */
  private static calculateCombinedConfidence(
    emailConfidence: number,
    aiConfidence: number
  ): number {
    // Weighted average favoring email confidence (it's more reliable for direct extraction)
    const emailWeight = 0.7;
    const aiWeight = 0.3;
    
    return (emailConfidence * emailWeight) + (aiConfidence * aiWeight);
  }

  /**
   * Map AI parser asset type to our asset type
   */
  private static mapAssetType(aiType: string): 'stock' | 'etf' | 'option' | 'forex' | 'crypto' | 'reit' {
    switch (aiType.toLowerCase()) {
      case 'option':
        return 'option';
      case 'etf':
        return 'etf';
      case 'stock':
        return 'stock';
      case 'index':
        return 'etf'; // Map index to ETF
      case 'forex':
        return 'forex';
      case 'crypto':
        return 'crypto';
      case 'reit':
        return 'reit';
      default:
        return 'stock'; // Default fallback
    }
  }

  /**
   * Extract metadata from email data
   */
  private static extractEmailMetadata(emailData: WealthsimpleEmailData): any {
    return {
      exchange: emailData.exchange,
      currency: emailData.currency,
      originalSymbol: emailData.symbol,
      assetName: emailData.assetName
    };
  }

  /**
   * Infer asset type from email context
   */
  private static inferAssetTypeFromEmail(
    symbol: string,
    emailData: WealthsimpleEmailData
  ): 'stock' | 'etf' | 'option' | 'forex' | 'crypto' | 'reit' {
    // Check for option patterns
    if (this.isOptionSymbol(symbol)) {
      return 'option';
    }
    
    // Check for ETF patterns
    if (this.isETFSymbol(symbol, emailData.assetName)) {
      return 'etf';
    }
    
    // Check for REIT patterns
    if (this.isREITSymbol(symbol, emailData.assetName)) {
      return 'reit';
    }
    
    // Default to stock
    return 'stock';
  }

  /**
   * Check if symbol appears to be an ETF
   */
  private static isETFSymbol(symbol: string, assetName?: string): boolean {
    const etfPatterns = [
      /ETF$/i,
      /FUND$/i,
      /INDEX$/i
    ];
    
    const text = (symbol + ' ' + (assetName || '')).toLowerCase();
    return etfPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if symbol appears to be a REIT
   */
  private static isREITSymbol(symbol: string, assetName?: string): boolean {
    const reitPatterns = [
      /REIT$/i,
      /REAL ESTATE/i,
      /PROPERTIES/i
    ];
    
    const text = (symbol + ' ' + (assetName || '')).toLowerCase();
    return reitPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Process multiple symbols from batch email processing
   */
  static async processBatchSymbols(
    emailDataArray: WealthsimpleEmailData[]
  ): Promise<EmailSymbolParseResult[]> {
    const results: EmailSymbolParseResult[] = [];
    
    console.log(`🔍 Processing ${emailDataArray.length} symbols with AI enhancement...`);
    
    for (const emailData of emailDataArray) {
      try {
        const result = await this.processEmailSymbol(emailData);
        results.push(result);
        
        // Add small delay to avoid overwhelming AI service
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`Failed to process symbol ${emailData.symbol}:`, error);
        
        // Add fallback result
        results.push(this.createDirectResult(emailData.symbol, emailData));
      }
    }
    
    return results;
  }

  /**
   * Validate symbol processing result
   */
  static validateSymbolResult(result: EmailSymbolParseResult): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!result.symbol || result.symbol.trim().length === 0) {
      errors.push('Symbol cannot be empty');
    }
    
    if (!result.normalizedSymbol || result.normalizedSymbol.trim().length === 0) {
      errors.push('Normalized symbol cannot be empty');
    }
    
    if (result.confidence < 0 || result.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
    
    if (result.confidence < 0.3) {
      errors.push('Confidence too low for reliable processing');
    }
    
    const validAssetTypes = ['stock', 'etf', 'option', 'forex', 'crypto', 'reit'];
    if (!validAssetTypes.includes(result.assetType)) {
      errors.push(`Invalid asset type: ${result.assetType}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get processing statistics
   */
  static getProcessingStats(results: EmailSymbolParseResult[]): {
    total: number;
    directSymbols: number;
    aiEnhanced: number;
    aiFallback: number;
    averageConfidence: number;
    assetTypeBreakdown: Record<string, number>;
  } {
    const stats = {
      total: results.length,
      directSymbols: results.filter(r => r.source === 'email-direct').length,
      aiEnhanced: results.filter(r => r.source === 'email-ai-enhanced').length,
      aiFallback: results.filter(r => r.source === 'ai-fallback').length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      assetTypeBreakdown: {} as Record<string, number>
    };
    
    // Calculate asset type breakdown
    results.forEach(result => {
      stats.assetTypeBreakdown[result.assetType] = 
        (stats.assetTypeBreakdown[result.assetType] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Create enhanced patterns for email-specific symbols
   */
  static getEmailSpecificPatterns(): Record<string, RegExp[]> {
    return {
      // Canadian stock patterns
      canadianStocks: [
        /([A-Z]{1,5})\.TO$/i,
        /([A-Z]{1,5})\s+\(Toronto\)/i,
        /([A-Z]{1,5})\s+TSX/i
      ],
      
      // US stock patterns
      usStocks: [
        /^[A-Z]{1,5}$/,
        /([A-Z]{1,5})\s+\(NASDAQ\)/i,
        /([A-Z]{1,5})\s+\(NYSE\)/i
      ],
      
      // Option patterns from emails
      emailOptions: [
        /([A-Z]{1,5})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d+)\s+\$(\d+(?:\.\d+)?)\s+(CALL|PUT)/i,
        /([A-Z]{1,5})\s+(\d{1,2}\/\d{1,2}\/?\d{0,4})\s+\$(\d+(?:\.\d+)?)\s+(CALL|PUT)/i,
        /([A-Z]{1,5})\s+\$(\d+(?:\.\d+)?)\s+(CALL|PUT)/i
      ],
      
      // ETF patterns
      etfPatterns: [
        /([A-Z]{2,5})\s+ETF/i,
        /([A-Z]{2,5})\s+(Exchange\s+Traded\s+Fund)/i,
        /([A-Z]{2,5})\s+(Index\s+Fund)/i
      ]
    };
  }
}

export default EnhancedEmailSymbolParser;
