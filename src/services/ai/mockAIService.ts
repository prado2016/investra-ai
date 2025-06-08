/**
 * Mock AI Service for Development
 * Provides test data when API keys are not available
 */

import type { 
  SymbolLookupRequest, 
  SymbolLookupResponse,
  SymbolValidationResponse,
  SymbolSuggestionResponse,
  SymbolLookupResult
} from '../../types/ai';

export class MockAIService {
  private static mockSymbols: SymbolLookupResult[] = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      confidence: 0.98,
      price: 185.92,
      description: 'Technology company that designs and manufactures consumer electronics'
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      confidence: 0.96,
      price: 2847.63,
      description: 'Multinational technology company specializing in Internet-related services'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      type: 'stock',
      exchange: 'NASDAQ',
      confidence: 0.97,
      price: 378.85,
      description: 'American multinational technology corporation'
    },
    {
      symbol: 'TSLA',
      name: 'Tesla, Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      confidence: 0.95,
      price: 248.42,
      description: 'Electric vehicle and clean energy company'
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com, Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      confidence: 0.97,
      price: 155.89,
      description: 'American multinational technology company focusing on e-commerce'
    }
  ];

  static async searchSymbols(query: string): Promise<SymbolLookupResponse> {
    // Simulate API delay
    await this.delay(300);

    const searchQuery = query.toLowerCase().trim();
    
    // Find matching symbols
    const results = this.mockSymbols.filter(symbol => 
      symbol.symbol.toLowerCase().includes(searchQuery) ||
      symbol.name.toLowerCase().includes(searchQuery) ||
      (searchQuery === 'apple' && symbol.symbol === 'AAPL') ||
      (searchQuery === 'google' && symbol.symbol === 'GOOGL') ||
      (searchQuery === 'microsoft' && symbol.symbol === 'MSFT') ||
      (searchQuery === 'tesla' && symbol.symbol === 'TSLA') ||
      (searchQuery === 'amazon' && symbol.symbol === 'AMZN')
    );

    return {
      success: true,
      results: results.slice(0, 5), // Limit to 5 results
      timestamp: new Date(),
      tokensUsed: 150,
      processingTime: 300
    };
  }

  static async validateSymbol(symbol: string): Promise<SymbolValidationResponse> {
    await this.delay(200);

    const upperSymbol = symbol.toUpperCase();
    const foundSymbol = this.mockSymbols.find(s => s.symbol === upperSymbol);

    if (foundSymbol) {
      return {
        isValid: true,
        symbol: upperSymbol,
        confidence: foundSymbol.confidence,
        details: {
          name: foundSymbol.name,
          exchange: foundSymbol.exchange,
          assetType: foundSymbol.type
        }
      };
    }

    // Check if it's a partial match and suggest
    const partialMatch = this.mockSymbols.find(s => 
      s.symbol.includes(upperSymbol) || 
      s.name.toLowerCase().includes(symbol.toLowerCase())
    );

    if (partialMatch) {
      return {
        isValid: false,
        symbol: upperSymbol,
        suggestion: partialMatch.symbol,
        confidence: 0.7
      };
    }

    return {
      isValid: false,
      symbol: upperSymbol,
      confidence: 0.1
    };
  }

  static async getSuggestions(query: string, limit: number = 3): Promise<SymbolSuggestionResponse> {
    await this.delay(150);

    const searchQuery = query.toLowerCase();
    const suggestions = this.mockSymbols
      .filter(symbol => 
        symbol.symbol.toLowerCase().startsWith(searchQuery) ||
        symbol.name.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit)
      .map(symbol => symbol.symbol);

    return {
      suggestions,
      query,
      provider: 'mock'
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
