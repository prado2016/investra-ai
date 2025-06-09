/**
 * Symbol Lookup Endpoint Service
 * Task 19: AI Symbol Lookup Endpoint Implementation
 * 
 * Provides a standardized endpoint-like interface for AI-powered symbol lookup
 * with proper authentication, rate limiting, error handling, and logging.
 */

import { aiServiceManager } from '../ai/aiServiceManager';
import { ApiKeyService } from '../apiKeyService';
import type {
  AIProvider,
  SymbolLookupRequest,
  SymbolLookupResponse,
  SymbolLookupResult
} from '../../types/ai';

// Endpoint-specific types
export interface SymbolLookupEndpointRequest {
  query: string;
  maxResults?: number;
  assetTypes?: ('stock' | 'etf' | 'crypto' | 'forex' | 'commodity')[];
  region?: string;
  includeInactive?: boolean;
  provider?: AIProvider;
}

export interface SymbolLookupEndpointResponse {
  success: boolean;
  data?: {
    results: SymbolLookupResult[];
    query: string;
    totalFound: number;
    provider: AIProvider;
    cached: boolean;
    requestId: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    rateLimit: {
      remaining: number;
      resetTime: string;
    };
  };
}

export interface EndpointConfig {
  requireAuthentication?: boolean;
  defaultProvider?: AIProvider;
  maxRequestsPerHour?: number;
  maxRequestsPerDay?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

class SymbolLookupEndpointService {
  private config: EndpointConfig;
  private requestLog: Array<{
    requestId: string;
    timestamp: Date;
    query: string;
    provider: AIProvider;
    success: boolean;
    processingTime: number;
    error?: string;
  }> = [];
  
  private rateLimitTracker = new Map<string, {
    hourlyCount: number;
    dailyCount: number;
    lastHourReset: Date;
    lastDayReset: Date;
  }>();

  constructor(config: EndpointConfig = {}) {
    this.config = {
      requireAuthentication: true,
      defaultProvider: 'gemini',
      maxRequestsPerHour: 100,
      maxRequestsPerDay: 1000,
      enableLogging: true,
      enableMetrics: true,
      ...config
    };
  }

  /**
   * Main endpoint method for symbol lookup
   */
  async lookup(request: SymbolLookupEndpointRequest): Promise<SymbolLookupEndpointResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // 1. Validate and sanitize request
      const validationResult = this.validateRequest(request);
      if (!validationResult.valid) {
        return this.createErrorResponse(
          'INVALID_REQUEST',
          `Request validation failed: ${validationResult.errors.join(', ')}`,
          { requestId, startTime, details: validationResult.errors }
        );
      }

      // 2. Authenticate request (if required)
      if (this.config.requireAuthentication) {
        const authResult = await this.authenticateRequest(request);
        if (!authResult.success) {
          return this.createErrorResponse(
            'AUTHENTICATION_FAILED',
            authResult.error || 'Authentication required',
            { requestId, startTime, retryable: false }
          );
        }
      }

      // 3. Check rate limits
      const rateLimitResult = this.checkRateLimit();
      if (!rateLimitResult.allowed) {
        return this.createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Rate limit exceeded. Please try again later.',
          { 
            requestId, 
            startTime, 
            retryable: true,
            retryAfter: rateLimitResult.retryAfter
          }
        );
      }

      // 4. Determine AI provider
      const provider = request.provider || this.config.defaultProvider!;
      
      // 5. Check if provider is available and configured
      const providerAvailable = await this.checkProviderAvailability(provider);
      if (!providerAvailable.available) {
        return this.createErrorResponse(
          'PROVIDER_UNAVAILABLE',
          `AI provider '${provider}' is not available: ${providerAvailable.reason}`,
          { requestId, startTime, retryable: false }
        );
      }

      // 6. Transform request for AI service
      const aiRequest: SymbolLookupRequest = {
        query: request.query.trim(),
        maxResults: Math.min(request.maxResults || 10, 50), // Cap at 50
        includeAnalysis: false,
        context: `Search for financial symbols matching: ${request.query}`
      };

      // 7. Call AI service
      const aiResponse = await aiServiceManager.lookupSymbols(aiRequest, provider);
      
      // 8. Transform response
      const endpointResponse = this.transformAIResponse(
        aiResponse,
        requestId,
        startTime,
        provider,
        rateLimitResult.remaining
      );

      // 9. Log request
      this.logRequest({
        requestId,
        timestamp: new Date(),
        query: request.query,
        provider,
        success: true,
        processingTime: Date.now() - startTime
      });

      // 10. Update rate limit counter
      this.updateRateLimit();

      return endpointResponse;

    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.logRequest({
        requestId,
        timestamp: new Date(),
        query: request.query,
        provider: request.provider || this.config.defaultProvider!,
        success: false,
        processingTime: Date.now() - startTime,
        error: errorMessage
      });

      return this.createErrorResponse(
        'INTERNAL_ERROR',
        'An internal error occurred while processing your request',
        { requestId, startTime, retryable: true, originalError: errorMessage }
      );
    }
  }

  /**
   * Test endpoint connectivity and health
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<AIProvider, {
      available: boolean;
      latency?: number;
      error?: string;
    }>;
    metadata: {
      timestamp: string;
      version: string;
      uptime: number;
    };
  }> {
    const startTime = Date.now();
    const services: Record<string, {
      available: boolean;
      latency?: number;
      error?: string;
    }> = {};
    
    // Test each available provider
    const providers: AIProvider[] = ['gemini', 'openai', 'perplexity'];
    
    for (const provider of providers) {
      try {
        const testStart = Date.now();
        const available = await this.checkProviderAvailability(provider);
        const latency = Date.now() - testStart;
        
        services[provider] = {
          available: available.available,
          latency,
          error: available.available ? undefined : available.reason
        };
      } catch (error) {
        services[provider] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Determine overall status
    const availableServices = Object.values(services).filter((s) => s.available).length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (availableServices === 0) {
      status = 'unhealthy';
    } else if (availableServices < providers.length) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      services,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Date.now() - startTime
      }
    };
  }

  /**
   * Get endpoint usage statistics
   */
  getUsageStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageProcessingTime: number;
    requestsByProvider: Record<AIProvider, number>;
    recentErrors: Array<{
      timestamp: string;
      error: string;
      query: string;
    }>;
  } {
    const totalRequests = this.requestLog.length;
    const successfulRequests = this.requestLog.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const averageProcessingTime = totalRequests > 0 
      ? this.requestLog.reduce((sum, r) => sum + r.processingTime, 0) / totalRequests
      : 0;

    const requestsByProvider = this.requestLog.reduce((acc, r) => {
      acc[r.provider] = (acc[r.provider] || 0) + 1;
      return acc;
    }, {} as Record<AIProvider, number>);

    const recentErrors = this.requestLog
      .filter(r => !r.success && r.error)
      .slice(-10)
      .map(r => ({
        timestamp: r.timestamp.toISOString(),
        error: r.error!,
        query: r.query
      }));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageProcessingTime,
      requestsByProvider,
      recentErrors
    };
  }

  /**
   * Clear cached data and reset metrics
   */
  clearCache(): void {
    // Clear AI service caches
    aiServiceManager.clearCache();
    
    // Clear request log (keep last 100 for debugging)
    this.requestLog = this.requestLog.slice(-100);
    
    // Reset rate limit trackers
    this.rateLimitTracker.clear();
  }

  // Private helper methods

  private validateRequest(request: SymbolLookupEndpointRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate query
    if (!request.query || typeof request.query !== 'string') {
      errors.push('Query is required and must be a string');
    } else if (request.query.trim().length < 1) {
      errors.push('Query cannot be empty');
    } else if (request.query.length > 100) {
      errors.push('Query must be less than 100 characters');
    }

    // Validate maxResults
    if (request.maxResults !== undefined) {
      if (!Number.isInteger(request.maxResults) || request.maxResults < 1 || request.maxResults > 50) {
        errors.push('maxResults must be an integer between 1 and 50');
      }
    }

    // Validate assetTypes
    if (request.assetTypes !== undefined) {
      const validTypes = ['stock', 'etf', 'crypto', 'forex', 'commodity'];
      const invalidTypes = request.assetTypes.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        errors.push(`Invalid asset types: ${invalidTypes.join(', ')}`);
      }
    }

    // Validate provider
    if (request.provider !== undefined) {
      const validProviders: AIProvider[] = ['gemini', 'openai', 'perplexity'];
      if (!validProviders.includes(request.provider)) {
        errors.push(`Invalid provider: ${request.provider}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async authenticateRequest(request: SymbolLookupEndpointRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if we have API keys configured for the requested provider
      const provider = request.provider || this.config.defaultProvider!;
      const apiKeys = await ApiKeyService.getApiKeys();
      const providerKey = apiKeys.find(key => key.provider === provider && key.is_active);
      
      if (!providerKey) {
        return {
          success: false,
          error: `No active API key found for provider: ${provider}`
        };
      }

      // Additional authentication checks could go here
      // (e.g., user sessions, JWT tokens, etc.)
      
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Authentication service unavailable'
      };
    }
  }

  private checkRateLimit(): {
    allowed: boolean;
    remaining: { hourly: number; daily: number };
    retryAfter?: number;
  } {
    const clientId = 'default'; // In a real app, this would be based on user/session
    const now = new Date();
    
    let tracker = this.rateLimitTracker.get(clientId);
    if (!tracker) {
      tracker = {
        hourlyCount: 0,
        dailyCount: 0,
        lastHourReset: now,
        lastDayReset: now
      };
      this.rateLimitTracker.set(clientId, tracker);
    }

    // Reset counters if time windows have passed
    const hoursSinceHourReset = (now.getTime() - tracker.lastHourReset.getTime()) / (1000 * 60 * 60);
    const daysSinceDayReset = (now.getTime() - tracker.lastDayReset.getTime()) / (1000 * 60 * 60 * 24);
    
    if (hoursSinceHourReset >= 1) {
      tracker.hourlyCount = 0;
      tracker.lastHourReset = now;
    }
    
    if (daysSinceDayReset >= 1) {
      tracker.dailyCount = 0;
      tracker.lastDayReset = now;
    }

    // Check limits
    const hourlyRemaining = this.config.maxRequestsPerHour! - tracker.hourlyCount;
    const dailyRemaining = this.config.maxRequestsPerDay! - tracker.dailyCount;
    
    if (hourlyRemaining <= 0) {
      return {
        allowed: false,
        remaining: { hourly: 0, daily: dailyRemaining },
        retryAfter: 3600 - (hoursSinceHourReset * 3600) // seconds until next hour
      };
    }
    
    if (dailyRemaining <= 0) {
      return {
        allowed: false,
        remaining: { hourly: hourlyRemaining, daily: 0 },
        retryAfter: 86400 - (daysSinceDayReset * 86400) // seconds until next day
      };
    }

    return {
      allowed: true,
      remaining: { hourly: hourlyRemaining, daily: dailyRemaining }
    };
  }

  private updateRateLimit(): void {
    const clientId = 'default';
    const tracker = this.rateLimitTracker.get(clientId);
    if (tracker) {
      tracker.hourlyCount++;
      tracker.dailyCount++;
    }
  }

  private async checkProviderAvailability(provider: AIProvider): Promise<{ available: boolean; reason?: string }> {
    try {
      // Check if AI service manager has the provider
      const service = aiServiceManager.getService(provider);
      if (!service) {
        return { available: false, reason: 'Service not initialized' };
      }

      // Test connection
      const healthResult = await aiServiceManager.testConnection(provider);
      if (!healthResult.success) {
        return { available: false, reason: healthResult.error || 'Connection test failed' };
      }

      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private transformAIResponse(
    aiResponse: SymbolLookupResponse,
    requestId: string,
    startTime: number,
    provider: AIProvider,
    rateLimitRemaining: { hourly: number; daily: number }
  ): SymbolLookupEndpointResponse {
    if (!aiResponse.success) {
      return this.createErrorResponse(
        'AI_SERVICE_ERROR',
        aiResponse.error || 'AI service returned an error',
        { requestId, startTime, retryable: true }
      );
    }

    return {
      success: true,
      data: {
        results: aiResponse.results,
        query: aiResponse.results.length > 0 ? 'lookup' : '',
        totalFound: aiResponse.results.length,
        provider,
        cached: aiResponse.cached || false,
        requestId,
        timestamp: new Date().toISOString()
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        rateLimit: {
          remaining: Math.min(rateLimitRemaining.hourly, rateLimitRemaining.daily),
          resetTime: new Date(Date.now() + 3600000).toISOString() // Next hour
        }
      }
    };
  }

  private createErrorResponse(
    code: string,
    message: string,
    options: {
      requestId: string;
      startTime: number;
      retryable?: boolean;
      details?: unknown;
      retryAfter?: number;
      originalError?: string;
    }
  ): SymbolLookupEndpointResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details: options.details,
        retryable: options.retryable !== false
      },
      metadata: {
        requestId: options.requestId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - options.startTime,
        rateLimit: {
          remaining: 0,
          resetTime: options.retryAfter 
            ? new Date(Date.now() + options.retryAfter * 1000).toISOString()
            : new Date().toISOString()
        }
      }
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private logRequest(logEntry: {
    requestId: string;
    timestamp: Date;
    query: string;
    provider: AIProvider;
    success: boolean;
    processingTime: number;
    error?: string;
  }): void {
    if (!this.config.enableLogging) return;

    this.requestLog.push(logEntry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-1000);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SymbolLookup] ${logEntry.success ? 'SUCCESS' : 'ERROR'} - ${logEntry.query} (${logEntry.processingTime}ms)`, logEntry);
    }
  }
}

// Export singleton instance
export const symbolLookupEndpoint = new SymbolLookupEndpointService();
export default symbolLookupEndpoint;
