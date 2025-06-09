/**
 * AI Integration Service
 * Task 6: Bridge between AI services and existing portfolio system
 */

import { aiServiceManager } from './ai';
import type { 
  SymbolLookupRequest, 
  SymbolLookupResponse,
  FinancialAnalysisRequest,
  FinancialAnalysisResponse,
  AIProvider 
} from '../types/ai';

export class AIIntegrationService {
  /**
   * Enhanced symbol lookup that integrates with existing asset types
   */
  static async enhancedSymbolLookup(
    query: string,
    options: {
      maxResults?: number;
      preferredProvider?: AIProvider;
      includeAnalysis?: boolean;
      context?: string;
    } = {}
  ): Promise<SymbolLookupResponse> {
    const request: SymbolLookupRequest = {
      query: query.trim(),
      maxResults: options.maxResults || 5,
      includeAnalysis: options.includeAnalysis || false,
      context: options.context
    };

    try {
      const response = await aiServiceManager.lookupSymbols(request, options.preferredProvider);
      
      // Post-process results to ensure compatibility with existing system
      if (response.success && response.results) {
        response.results = response.results.map(result => ({
          ...result,
          // Normalize asset types to match existing system
          assetType: this.normalizeAssetType(result.assetType),
          // Ensure symbol is uppercase
          symbol: result.symbol.toUpperCase(),
          // Validate confidence score
          confidence: Math.max(0, Math.min(1, result.confidence))
        }));

        // Sort by confidence descending
        response.results.sort((a, b) => b.confidence - a.confidence);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get symbol suggestions based on partial input
   */
  static async getSymbolSuggestions(
    partialSymbol: string,
    limit: number = 3
  ): Promise<string[]> {
    if (partialSymbol.length < 2) {
      return [];
    }

    try {
      const response = await this.enhancedSymbolLookup(partialSymbol, {
        maxResults: limit,
        context: 'User is typing a symbol, provide the most likely matches'
      });

      if (response.success) {
        return response.results.map(result => result.symbol);
      }

      return [];
    } catch (error) {
      console.error('Error getting symbol suggestions:', error);
      return [];
    }
  }

  /**
   * Validate a symbol using AI
   */
  static async validateSymbol(symbol: string): Promise<{
    isValid: boolean;
    suggestion?: string;
    confidence: number;
    details?: unknown;
  }> {
    try {
      const response = await this.enhancedSymbolLookup(symbol, {
        maxResults: 1,
        context: `Validate if "${symbol}" is a correct stock symbol`
      });

      if (response.success && response.results.length > 0) {
        const result = response.results[0];
        const isExactMatch = result.symbol.toUpperCase() === symbol.toUpperCase();
        
        return {
          isValid: isExactMatch && result.confidence > 0.7,
          suggestion: isExactMatch ? undefined : result.symbol,
          confidence: result.confidence,
          details: result
        };
      }

      return {
        isValid: false,
        confidence: 0,
        suggestion: undefined
      };
    } catch (error) {
      console.error('Error validating symbol:', error);
      return {
        isValid: false,
        confidence: 0
      };
    }
  }

  /**
   * Get market insights for a portfolio position
   */
  static async getPositionInsights(
    symbol: string,
    currentPrice?: number,
    quantity?: number,
    purchasePrice?: number
  ): Promise<FinancialAnalysisResponse> {
    try {
      const request: FinancialAnalysisRequest = {
        symbol,
        data: {
          prices: currentPrice ? [currentPrice] : undefined,
          marketData: {
            quantity,
            purchasePrice,
            currentPrice
          }
        },
        analysisType: 'trend',
        timeframe: 'current'
      };

      return await aiServiceManager.analyzeFinancialData(request);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get portfolio-level analysis
   */
  static async analyzePortfolio(positions: {
    symbol: string;
    quantity: number;
    currentPrice: number;
    purchasePrice: number;
    value: number;
  }[]): Promise<FinancialAnalysisResponse> {
    try {
      const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
      const symbols = positions.map(pos => pos.symbol).join(', ');
      
      const request: FinancialAnalysisRequest = {
        symbol: 'PORTFOLIO',
        data: {
          marketData: {
            positions: positions.length,
            totalValue,
            topHoldings: positions
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map(pos => ({ symbol: pos.symbol, percentage: (pos.value / totalValue) * 100 }))
          }
        },
        analysisType: 'risk',
        timeframe: 'current'
      };

      const response = await aiServiceManager.analyzeFinancialData(request);
      
      if (response.success && response.result) {
        response.result.symbol = `Portfolio (${symbols})`;
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get AI-powered trading insights
   */
  static async getTradingInsights(
    symbol: string,
    action: 'buy' | 'sell' | 'hold',
    context?: string
  ): Promise<FinancialAnalysisResponse> {
    try {
      const request: FinancialAnalysisRequest = {
        symbol,
        data: {
          marketData: { action, context }
        },
        analysisType: 'trend',
        timeframe: 'current'
      };

      return await aiServiceManager.analyzeFinancialData(request);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if AI services are available
   */
  static isAvailable(): boolean {
    const services = aiServiceManager.getAllServices();
    return services.size > 0;
  }

  /**
   * Get available AI providers
   */
  static getAvailableProviders(): AIProvider[] {
    const services = aiServiceManager.getAllServices();
    return Array.from(services.keys());
  }

  // Private helper methods

  private static normalizeAssetType(assetType: string): 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf' {
    const type = assetType.toLowerCase();
    
    switch (type) {
      case 'stock':
      case 'equity':
        return 'stock';
      case 'etf':
      case 'fund':
        return 'etf';
      case 'crypto':
      case 'cryptocurrency':
        return 'crypto';
      case 'forex':
      case 'currency':
        return 'forex';
      case 'reit':
        return 'reit';
      case 'option':
        return 'option';
      default:
        return 'stock';
    }
  }
}

export default AIIntegrationService;
