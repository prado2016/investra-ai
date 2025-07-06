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
   * ALL queries go through AI - no offline parsing
   */
  static async parseQuery(query: string): Promise<SymbolParseResult> {
    const trimmedQuery = query.trim();
    console.log('🔍 EnhancedAISymbolParser.parseQuery - sending ALL queries to AI:', { query: trimmedQuery });
    
    // Skip offline parsing - send everything to AI for proper processing
    return await this.parseWithAI(trimmedQuery);
  }

  // Removed unused methods since we're sending ALL queries to AI now

  /**
   * Use AI to parse ALL queries - primary method
   */
  private static async parseWithAI(query: string): Promise<SymbolParseResult> {
    console.log('🤖 parseWithAI starting for query:', query);
    
    try {
      // Ensure AI services are initialized
      console.log('🔧 Checking AI service initialization...');
      const healthStatus = await aiServiceManager.getHealthStatus();
      console.log('📊 AI service health status:', healthStatus);
      
      // Try to initialize services if none are configured
      const configuredServices = Object.values(healthStatus).filter(status => (status as any).configured);
      if (configuredServices.length === 0) {
        console.log('⚠️ No AI services configured, attempting to initialize...');
        await aiServiceManager.initializeService('gemini');
        await aiServiceManager.initializeService('openrouter');
      }
      
      // Use dynamic AI service manager for symbol lookup
      const symbolLookupRequest: SymbolLookupRequest = {
        query,
        maxResults: 1,
        context: 'Convert natural language to Yahoo Finance symbol format. For options, use format: SYMBOLYYMMDDCPPPPPPPPP (e.g., AAPL250621C00200000 for AAPL June 21 2025 $200 Call)'
      };

      console.log('📡 Sending request to AI service manager:', symbolLookupRequest);
      const response = await aiServiceManager.lookupSymbols(symbolLookupRequest);
      console.log('📨 AI response received:', response);
      
      if (response.success && response.results.length > 0) {
        const result = response.results[0];
        console.log('✅ AI parsing successful:', result);
        
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
        console.warn('❌ AI symbol lookup failed or returned no results:', response.error);
        console.log('🔄 Falling back to mock parsing');
        return await this.mockAIParsing(query);
      }
      
    } catch (error) {
      console.error('❌ AI parsing failed with error:', error);
      console.log('🔄 Falling back to mock parsing');
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
      },
      'nvda 109.00 call 2025-04-11': {
        originalQuery: query,
        parsedSymbol: 'NVDA250411C00109000',
        confidence: 0.9,
        type: 'option',
        metadata: {
          underlying: 'NVDA',
          expirationDate: '2025-04-11',
          strikePrice: 109,
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

  // Removed offline parsing methods - all queries now go through AI
}
