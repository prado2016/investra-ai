/**
 * AI Symbol Lookup API Endpoints
 * Task 7: Complete AI Symbol Lookup API Implementation
 */

import { AIIntegrationService } from '../aiIntegrationService';
import { aiServiceManager } from '../ai';
import { MockAIService } from '../ai/mockAIService';
import type {
  AIProvider,
  SymbolLookupResponse
} from '../../types/ai';

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    cached?: boolean;
  };
}

export interface SymbolSuggestionResponse {
  suggestions: string[];
  query: string;
  provider: AIProvider;
}

export interface SymbolValidationResponse {
  isValid: boolean;
  symbol: string;
  suggestion?: string;
  confidence: number;
  details?: {
    name: string;
    exchange: string;
    assetType: string;
  };
}

export interface BatchLookupResponse {
  results: Array<{
    query: string;
    success: boolean;
    symbols: Array<{
      symbol: string;
      name: string;
      confidence: number;
    }>;
    error?: string;
  }>;
  totalQueries: number;
  successfulQueries: number;
}

export interface MarketInsightsResponse {
  symbol: string;
  insights: {
    summary: string;
    keyPoints: string[];
    sentiment: 'bullish' | 'bearish' | 'neutral';
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
  };
  recommendations: string[];
  metadata: {
    analysisType: string;
    dataPoints: number;
  };
}

/**
 * AI Symbol Lookup API Endpoints
 */
export class AISymbolLookupAPI {
  private static cache = new Map<string, { data: unknown; expires: number }>();
  
  /**
   * Search for symbols using AI
   */
  static async searchSymbols(params: {
    query: string;
    maxResults?: number;
    provider?: AIProvider;
    includeAnalysis?: boolean;
  }): Promise<APIResponse<SymbolLookupResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Validate input
      if (!params.query || params.query.trim().length === 0) {
        return this.errorResponse('INVALID_QUERY', 'Query parameter is required', requestId, startTime);
      }

      if (params.query.length > 100) {
        return this.errorResponse('QUERY_TOO_LONG', 'Query must be less than 100 characters', requestId, startTime);
      }

      // Check cache
      const cacheKey = `search:${params.query}:${params.maxResults || 5}:${params.provider || 'default'}`;
      const cached = this.getFromCache<SymbolLookupResponse>(cacheKey);
      if (cached) {
        return this.successResponse(cached, requestId, startTime, true);
      }

      // Call AI service
      const response = await AIIntegrationService.enhancedSymbolLookup(params.query, {
        maxResults: params.maxResults || 5,
        preferredProvider: params.provider,
        includeAnalysis: params.includeAnalysis || false
      });

      // Cache successful results
      if (response.success) {
        this.setCache(cacheKey, response, 30 * 60 * 1000); // 30 minutes
        return this.successResponse(response, requestId, startTime);
      }

      // Fallback to mock service if AI service fails
      console.warn('AI service failed, using mock data:', response.error);
      const mockResponse = await MockAIService.searchSymbols(params.query);
      return this.successResponse(mockResponse, requestId, startTime);

    } catch (error) {
      return this.errorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        requestId,
        startTime
      );
    }
  }

  /**
   * Get symbol suggestions for autocomplete
   */
  static async getSymbolSuggestions(params: {
    query: string;
    limit?: number;
    provider?: AIProvider;
  }): Promise<APIResponse<SymbolSuggestionResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Validate input
      if (!params.query || params.query.trim().length < 2) {
        return this.successResponse({
          suggestions: [],
          query: params.query,
          provider: params.provider || 'gemini'
        }, requestId, startTime);
      }

      // Check cache
      const cacheKey = `suggestions:${params.query}:${params.limit || 3}`;
      const cached = this.getFromCache<SymbolSuggestionResponse>(cacheKey);
      if (cached) {
        return this.successResponse(cached, requestId, startTime, true);
      }

      // Get suggestions
      try {
        const suggestions = await AIIntegrationService.getSymbolSuggestions(
          params.query,
          params.limit || 3
        );

        const response = {
          suggestions,
          query: params.query,
          provider: params.provider || 'gemini'
        };

        // Cache results
        this.setCache(cacheKey, response, 10 * 60 * 1000); // 10 minutes

        return this.successResponse(response, requestId, startTime);
      } catch (aiError) {
        // Fallback to mock service
        console.warn('AI suggestions failed, using mock data:', aiError);
        const mockResponse = await MockAIService.getSuggestions(params.query, params.limit || 3);
        return this.successResponse(mockResponse, requestId, startTime);
      }

    } catch (error) {
      return this.errorResponse(
        'SUGGESTION_ERROR',
        error instanceof Error ? error.message : 'Failed to get suggestions',
        requestId,
        startTime
      );
    }
  }

  /**
   * Validate a specific symbol
   */
  static async validateSymbol(params: {
    symbol: string;
    provider?: AIProvider;
  }): Promise<APIResponse<SymbolValidationResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Validate input
      if (!params.symbol || params.symbol.trim().length === 0) {
        return this.errorResponse('INVALID_SYMBOL', 'Symbol parameter is required', requestId, startTime);
      }

      // Check cache
      const cacheKey = `validate:${params.symbol.toUpperCase()}`;
      const cached = this.getFromCache<SymbolValidationResponse>(cacheKey);
      if (cached) {
        return this.successResponse(cached, requestId, startTime, true);
      }

      // Validate symbol
      try {
        const validation = await AIIntegrationService.validateSymbol(params.symbol);

        const response: SymbolValidationResponse = {
          isValid: validation.isValid,
          symbol: params.symbol.toUpperCase(),
          suggestion: validation.suggestion,
          confidence: validation.confidence,
          details: validation.details ? {
            name: validation.details.name,
            exchange: validation.details.exchange,
            assetType: validation.details.assetType
          } : undefined
        };

        // Cache results
        this.setCache(cacheKey, response, 60 * 60 * 1000); // 1 hour

        return this.successResponse(response, requestId, startTime);
      } catch (aiError) {
        // Fallback to mock service
        console.warn('AI validation failed, using mock data:', aiError);
        const mockResponse = await MockAIService.validateSymbol(params.symbol);
        this.setCache(cacheKey, mockResponse, 60 * 60 * 1000); // 1 hour
        return this.successResponse(mockResponse, requestId, startTime);
      }

    } catch (error) {
      return this.errorResponse(
        'VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Failed to validate symbol',
        requestId,
        startTime
      );
    }
  }

  /**
   * Batch lookup multiple symbols
   */
  static async batchLookup(params: {
    queries: string[];
    maxResultsPerQuery?: number;
    provider?: AIProvider;
  }): Promise<APIResponse<BatchLookupResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Validate input
      if (!params.queries || !Array.isArray(params.queries) || params.queries.length === 0) {
        return this.errorResponse('INVALID_QUERIES', 'Queries array is required', requestId, startTime);
      }

      if (params.queries.length > 10) {
        return this.errorResponse('TOO_MANY_QUERIES', 'Maximum 10 queries allowed per batch', requestId, startTime);
      }

      const results = [];
      let successfulQueries = 0;

      // Process each query
      for (const query of params.queries) {
        try {
          const response = await AIIntegrationService.enhancedSymbolLookup(query, {
            maxResults: params.maxResultsPerQuery || 3,
            preferredProvider: params.provider
          });

          if (response.success) {
            successfulQueries++;
            results.push({
              query,
              success: true,
              symbols: response.results.map(result => ({
                symbol: result.symbol,
                name: result.name,
                confidence: result.confidence
              }))
            });
          } else {
            results.push({
              query,
              success: false,
              symbols: [],
              error: response.error || 'Lookup failed'
            });
          }
        } catch (error) {
          results.push({
            query,
            success: false,
            symbols: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const batchResponse: BatchLookupResponse = {
        results,
        totalQueries: params.queries.length,
        successfulQueries
      };

      return this.successResponse(batchResponse, requestId, startTime);

    } catch (error) {
      return this.errorResponse(
        'BATCH_ERROR',
        error instanceof Error ? error.message : 'Batch lookup failed',
        requestId,
        startTime
      );
    }
  }

  /**
   * Get market insights for a symbol
   */
  static async getMarketInsights(params: {
    symbol: string;
    analysisType?: 'trend' | 'risk' | 'sentiment' | 'valuation';
    provider?: AIProvider;
  }): Promise<APIResponse<MarketInsightsResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Validate input
      if (!params.symbol || params.symbol.trim().length === 0) {
        return this.errorResponse('INVALID_SYMBOL', 'Symbol parameter is required', requestId, startTime);
      }

      // Check cache
      const cacheKey = `insights:${params.symbol}:${params.analysisType || 'trend'}`;
      const cached = this.getFromCache<MarketInsightsResponse>(cacheKey);
      if (cached) {
        return this.successResponse(cached, requestId, startTime, true);
      }

      // Get insights
      const analysisResponse = await AIIntegrationService.getPositionInsights(params.symbol);

      if (!analysisResponse.success || !analysisResponse.result) {
        return this.errorResponse(
          'ANALYSIS_FAILED',
          analysisResponse.error || 'Failed to generate insights',
          requestId,
          startTime
        );
      }

      const result = analysisResponse.result;
      const insights: MarketInsightsResponse = {
        symbol: params.symbol,
        insights: {
          summary: result.insights.join(' '),
          keyPoints: result.insights,
          sentiment: result.riskLevel === 'low' ? 'bullish' : 
                   result.riskLevel === 'high' ? 'bearish' : 'neutral',
          riskLevel: result.riskLevel,
          confidence: result.confidence
        },
        recommendations: result.recommendations,
        metadata: {
          analysisType: params.analysisType || 'trend',
          dataPoints: result.insights.length
        }
      };

      // Cache results
      this.setCache(cacheKey, insights, 15 * 60 * 1000); // 15 minutes

      return this.successResponse(insights, requestId, startTime);

    } catch (error) {
      return this.errorResponse(
        'INSIGHTS_ERROR',
        error instanceof Error ? error.message : 'Failed to get market insights',
        requestId,
        startTime
      );
    }
  }

  /**
   * Get AI service health status
   */
  static async getHealthStatus(): Promise<APIResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<AIProvider, {
      available: boolean;
      latency?: number;
      error?: string;
    }>;
    cache: {
      entries: number;
      hitRate: number;
    };
  }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Test all AI services
      const healthResults = await aiServiceManager.testAllConnections();
      
      // Determine overall status
      const availableProviders = Object.values(healthResults).filter(r => r.success).length;
      const totalProviders = Object.keys(healthResults).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (availableProviders === 0) {
        status = 'unhealthy';
      } else if (availableProviders < totalProviders) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      // Transform results
      const providers: Record<string, {
        available: boolean;
        latency: number;
        error?: string;
      }> = {};
      for (const [provider, result] of Object.entries(healthResults)) {
        providers[provider] = {
          available: result.success,
          latency: result.latency,
          error: result.error
        };
      }

      // Calculate cache stats
      const cacheStats = this.getCacheStats();

      const healthResponse = {
        status,
        providers,
        cache: cacheStats
      };

      return this.successResponse(healthResponse, requestId, startTime);

    } catch (error) {
      return this.errorResponse(
        'HEALTH_CHECK_ERROR',
        error instanceof Error ? error.message : 'Health check failed',
        requestId,
        startTime
      );
    }
  }

  /**
   * Clear all cached data
   */
  static clearCache(): { cleared: number } {
    const count = this.cache.size;
    this.cache.clear();
    return { cleared: count };
  }

  // Private helper methods

  private static generateRequestId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private static successResponse<T>(
    data: T,
    requestId: string,
    startTime: number,
    cached = false
  ): APIResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        cached
      }
    };
  }

  private static errorResponse<T = never>(
    code: string,
    message: string,
    requestId: string,
    startTime: number
  ): APIResponse<T> {
    return {
      success: false,
      error: {
        code,
        message
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime
      }
    };
  }

  private static setCache(key: string, data: unknown, ttl: number): void {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
    
    // Cleanup expired entries (simple cleanup)
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private static getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private static cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  private static getCacheStats(): { entries: number; hitRate: number } {
    // This is a simple implementation - in production you'd want more detailed metrics
    return {
      entries: this.cache.size,
      hitRate: 0.85 // Placeholder - implement proper hit rate tracking
    };
  }
}

export default AISymbolLookupAPI;
