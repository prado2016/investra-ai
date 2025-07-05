/**
 * Enhanced AI Symbol Parser
 * Converts natural language queries to Yahoo Finance symbols
 */

import { aiServiceManager } from './aiServiceManager';
import type { SymbolLookupRequest } from '../../types/ai';

interface OptionsParsedData {
  underlying: string;
  expirationDate: Date;
  strikePrice: number;
  optionType: 'call' | 'put';
  isOption: boolean;
}

export interface SymbolParseResult {
  originalQuery: string;
  parsedSymbol: string;
  confidence: number;
  type: 'stock' | 'etf' | 'option' | 'index';
  metadata?: {
    underlying?: string;
    expirationDate?: string;
    strikePrice?: number;
    optionType?: 'call' | 'put';
    parsedData?: OptionsParsedData;
  };
}

export class EnhancedAISymbolParser {
  
  /**
   * Parse natural language query and return Yahoo Finance symbol
   */
  static async parseQuery(query: string): Promise<SymbolParseResult> {
    const trimmedQuery = query.trim();
    
    // Try to determine if this is an options query
    if (this.isOptionsQuery(trimmedQuery)) {
      return await this.parseOptionsQuery(trimmedQuery);
    }
    
    // Try to determine if it's a simple stock/ETF query
    if (this.isSimpleSymbolQuery(trimmedQuery)) {
      return await this.parseSimpleQuery(trimmedQuery);
    }
    
    // Use AI for complex queries
    return await this.parseWithAI(trimmedQuery);
  }

  /**
   * Check if query looks like an options query
   */
  private static isOptionsQuery(query: string): boolean {
    const optionsPatterns = [
      /\b(call|put|cal|c|p)\b/i, // Include abbreviations like "cal" for call
      /\$?\d+(\.\d+)?\s+(call|put|cal|c|p)/i, // Strike price with or without $ symbol
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d+/i,
      /\d{1,2}\/\d{1,2}\/?\d{0,4}/i, // Date patterns
      /\$?\d+.*\b(call|put|cal|c|p)\b/i, // Strike price patterns (flexible)
      /\b[A-Z]{1,5}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d+\s+\$?\d+(\.\d+)?/i // Pattern like "SOXL Jun 6 $17" or "SOXL Jun 6 17.00"
    ];
    
    return optionsPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Check if query is a simple symbol (likely stock/ETF)
   */
  private static isSimpleSymbolQuery(query: string): boolean {
    // Simple patterns for stocks/ETFs
    return /^[A-Za-z]{1,5}$/.test(query.trim());
  }

  /**
   * Parse options query into Yahoo Finance format
   */
  private static async parseOptionsQuery(query: string): Promise<SymbolParseResult> {
    try {
      const parsed = this.parseOptionsString(query);
      
      if (parsed.isOption) {
        const yahooSymbol = this.formatYahooOptionsSymbol(parsed);
        
        return {
          originalQuery: query,
          parsedSymbol: yahooSymbol,
          confidence: 0.85,
          type: 'option',
          metadata: {
            underlying: parsed.underlying,
            expirationDate: parsed.expirationDate.toISOString(),
            strikePrice: parsed.strikePrice,
            optionType: parsed.optionType,
            parsedData: parsed
          }
        };
      }
    } catch (error) {
      console.warn('Failed to parse options query:', error);
    }
    
    // Fallback to AI parsing
    return await this.parseWithAI(query);
  }

  /**
   * Parse simple stock/ETF query
   */
  private static async parseSimpleQuery(query: string): Promise<SymbolParseResult> {
    const symbol = query.toUpperCase().trim();
    
    return {
      originalQuery: query,
      parsedSymbol: symbol,
      confidence: 0.95,
      type: 'stock'
    };
  }

  /**
   * Use AI to parse complex queries
   */
  private static async parseWithAI(query: string): Promise<SymbolParseResult> {
    try {
      // Use dynamic AI service manager for symbol lookup
      const symbolLookupRequest: SymbolLookupRequest = {
        query,
        maxResults: 1,
        context: 'Enhanced symbol parsing for trading transactions'
      };

      const response = await aiServiceManager.lookupSymbols(symbolLookupRequest);
      
      if (response.success && response.results.length > 0) {
        const result = response.results[0];
        
        return {
          originalQuery: query,
          parsedSymbol: result.symbol,
          confidence: result.confidence,
          type: result.assetType as 'stock' | 'etf' | 'option' | 'index',
          metadata: {
            underlying: result.symbol
          }
        };
      } else {
        console.warn('AI symbol lookup failed or returned no results:', response.error);
        return await this.mockAIParsing(query);
      }
      
    } catch (error) {
      console.warn('AI parsing failed, using fallback:', error);
      return await this.mockAIParsing(query);
    }
  }

  /**
   * Mock AI parsing for development
   */
  private static async mockAIParsing(query: string): Promise<SymbolParseResult> {
    // Mock database of known queries
    const mockMappings: Record<string, SymbolParseResult> = {
      // Stock examples
      'apple stock': {
        originalQuery: query,
        parsedSymbol: 'AAPL',
        confidence: 0.9,
        type: 'stock'
      },
      'apple': {
        originalQuery: query,
        parsedSymbol: 'AAPL',
        confidence: 0.8,
        type: 'stock'
      },
      'tesla stock': {
        originalQuery: query,
        parsedSymbol: 'TSLA',
        confidence: 0.9,
        type: 'stock'
      },
      'microsoft': {
        originalQuery: query,
        parsedSymbol: 'MSFT',
        confidence: 0.8,
        type: 'stock'
      },
      
      // ETF examples
      'spy etf': {
        originalQuery: query,
        parsedSymbol: 'SPY',
        confidence: 0.9,
        type: 'etf'
      },
      'qqq etf': {
        originalQuery: query,
        parsedSymbol: 'QQQ',
        confidence: 0.9,
        type: 'etf'
      },
      's&p 500 etf': {
        originalQuery: query,
        parsedSymbol: 'SPY',
        confidence: 0.8,
        type: 'etf'
      },
      
      // Option examples
      'soxl jun 6 $17 call': {
        originalQuery: query,
        parsedSymbol: 'SOXL250606C00017000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'SOXL',
          expirationDate: '2025-06-06',
          strikePrice: 17,
          optionType: 'call'
        }
      },
      'soxl jun 6 $17 cal': {
        originalQuery: query,
        parsedSymbol: 'SOXL250606C00017000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'SOXL',
          expirationDate: '2025-06-06',
          strikePrice: 17,
          optionType: 'call'
        }
      },
      'soxl jun 6 17 call': {
        originalQuery: query,
        parsedSymbol: 'SOXL250606C00017000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'SOXL',
          expirationDate: '2025-06-06',
          strikePrice: 17,
          optionType: 'call'
        }
      },
      'soxl jun 6 17.00 call': {
        originalQuery: query,
        parsedSymbol: 'SOXL250606C00017000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'SOXL',
          expirationDate: '2025-06-06',
          strikePrice: 17,
          optionType: 'call'
        }
      },
      'aapl june 21 $200 call': {
        originalQuery: query,
        parsedSymbol: 'AAPL250621C00200000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'AAPL',
          expirationDate: '2025-06-21',
          strikePrice: 200,
          optionType: 'call'
        }
      },
      'tsla put $250 july 18': {
        originalQuery: query,
        parsedSymbol: 'TSLA250718P00250000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'TSLA',
          expirationDate: '2025-07-18',
          strikePrice: 250,
          optionType: 'put'
        }
      },
      'nvdl jun 20 $61 call': {
        originalQuery: query,
        parsedSymbol: 'NVDL250620C00061000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'NVDL',
          expirationDate: '2025-06-20',
          strikePrice: 61,
          optionType: 'call'
        }
      },
      'nvdl june 20 $61 call': {
        originalQuery: query,
        parsedSymbol: 'NVDL250620C00061000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'NVDL',
          expirationDate: '2025-06-20',
          strikePrice: 61,
          optionType: 'call'
        }
      }
    };

    const normalizedQuery = query.toLowerCase().trim();
    const exactMatch = mockMappings[normalizedQuery];
    
    if (exactMatch) {
      return exactMatch;
    }

    // Try partial matching for stock symbols
    const stockMatch = query.match(/\b([A-Z]{1,5})\b/i);
    if (stockMatch) {
      return {
        originalQuery: query,
        parsedSymbol: stockMatch[1].toUpperCase(),
        confidence: 0.7,
        type: 'stock'
      };
    }

    // Default fallback
    return {
      originalQuery: query,
      parsedSymbol: query.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      confidence: 0.3,
      type: 'stock'
    };
  }

  /**
   * Parse options string manually
   */
  private static parseOptionsString(query: string): OptionsParsedData {
    const result: OptionsParsedData = {
      underlying: '',
      expirationDate: new Date(),
      strikePrice: 0,
      optionType: 'call',
      isOption: false
    };

    // Extract underlying symbol (first word, usually)
    const symbolMatch = query.match(/\b([A-Z]{1,5})\b/i);
    if (symbolMatch) {
      result.underlying = symbolMatch[1].toUpperCase();
    }

    // Extract option type
    const typeMatch = query.match(/\b(call|put|cal|c|p)\b/i);
    if (typeMatch) {
      const matchedType = typeMatch[1].toLowerCase();
      // Handle abbreviations
      if (matchedType === 'cal' || matchedType === 'c') {
        result.optionType = 'call';
      } else if (matchedType === 'p') {
        result.optionType = 'put';
      } else {
        result.optionType = matchedType as 'call' | 'put';
      }
      result.isOption = true;
    }

    // Extract strike price
    const strikeMatch = query.match(/\$(\d+(?:\.\d+)?)/);
    if (strikeMatch) {
      result.strikePrice = parseFloat(strikeMatch[1]);
    }

    // Extract date (basic patterns)
    const datePatterns = [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d+)\b/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
      /(\d{1,2})\/(\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const dateMatch = query.match(pattern);
      if (dateMatch) {
        result.expirationDate = this.parseDate(dateMatch);
        break;
      }
    }

    return result;
  }

  /**
   * Parse date from regex match
   */
  private static parseDate(match: RegExpMatchArray): Date {
    const currentYear = new Date().getFullYear();
    
    // Handle month name format
    if (match[1] && isNaN(Number(match[1]))) {
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      
      const month = monthMap[match[1].toLowerCase()];
      const day = parseInt(match[2]);
      
      // Assume current year if not specified
      return new Date(currentYear, month, day);
    }
    
    // Handle numeric date formats
    if (match[3]) {
      // Full date with year
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      let year = parseInt(match[3]);
      if (year < 100) year += 2000; // Convert 2-digit year
      
      return new Date(year, month, day);
    } else {
      // Month/day without year - assume current year
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      
      return new Date(currentYear, month, day);
    }
  }

  /**
   * Format Yahoo Finance options symbol
   */
  private static formatYahooOptionsSymbol(parsed: OptionsParsedData): string {
    const underlying = parsed.underlying;
    const date = parsed.expirationDate;
    
    // Format: SYMBOL + YYMMDD + C/P + PPPPPPPP
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const optionCode = parsed.optionType === 'call' ? 'C' : 'P';
    
    // Strike price with 3 decimal places, padded to 8 digits
    const strikeFormatted = (parsed.strikePrice * 1000).toString().padStart(8, '0');
    
    return `${underlying}${year}${month}${day}${optionCode}${strikeFormatted}`;
  }
}
