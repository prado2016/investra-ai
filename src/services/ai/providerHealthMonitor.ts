/**
 * Provider Health Monitor
 * Tracks real-time health, performance, and quota status of AI providers
 */

import type { AIProvider } from '../../types/ai';

export interface ProviderHealthMetrics {
  provider: AIProvider;
  availability: number;      // 0-1, based on recent success rate
  performance: number;       // 0-1, based on response time (lower is better)
  quotaRemaining: number;    // 0-1, based on remaining quota
  cost: number;             // 0-1, based on cost efficiency (lower is better)
  lastUpdated: Date;
  consecutiveFailures: number;
  lastSuccessfulCall: Date | null;
  averageResponseTime: number; // in milliseconds
  totalRequests: number;
  successfulRequests: number;
  quotaLimitReached: boolean;
  errorPatterns: string[];   // Recent error types
}

export interface ProviderQuotaInfo {
  hourlyLimit: number;
  dailyLimit: number;
  hourlyUsed: number;
  dailyUsed: number;
  resetTime: Date;
  isQuotaExceeded: boolean;
}

export class ProviderHealthMonitor {
  private static instance: ProviderHealthMonitor;
  private healthMetrics: Map<AIProvider, ProviderHealthMetrics> = new Map();
  private quotaInfo: Map<AIProvider, ProviderQuotaInfo> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly MAX_RESPONSE_TIME = 10000; // 10 seconds
  private readonly FAILURE_THRESHOLD = 5; // consecutive failures before marking as unhealthy
  
  private constructor() {
    this.initializeDefaultMetrics();
    this.startHealthMonitoring();
  }

  static getInstance(): ProviderHealthMonitor {
    if (!ProviderHealthMonitor.instance) {
      ProviderHealthMonitor.instance = new ProviderHealthMonitor();
    }
    return ProviderHealthMonitor.instance;
  }

  private initializeDefaultMetrics(): void {
    const providers: AIProvider[] = ['gemini', 'openrouter', 'openai', 'perplexity'];
    
    providers.forEach(provider => {
      this.healthMetrics.set(provider, {
        provider,
        availability: 1.0, // Start optimistic
        performance: 1.0,
        quotaRemaining: 1.0,
        cost: 0.5, // Neutral cost rating
        lastUpdated: new Date(),
        consecutiveFailures: 0,
        lastSuccessfulCall: null,
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        quotaLimitReached: false,
        errorPatterns: []
      });

      this.quotaInfo.set(provider, {
        hourlyLimit: 100,
        dailyLimit: 1000,
        hourlyUsed: 0,
        dailyUsed: 0,
        resetTime: new Date(Date.now() + 3600000), // 1 hour from now
        isQuotaExceeded: false
      });
    });
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.updateHealthScores();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Record a successful API call
   */
  recordSuccess(provider: AIProvider, responseTime: number, quotaHeaders?: Record<string, string>): void {
    const metrics = this.healthMetrics.get(provider);
    if (!metrics) return;

    // Update basic metrics
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.consecutiveFailures = 0;
    metrics.lastSuccessfulCall = new Date();
    metrics.lastUpdated = new Date();

    // Update average response time (exponential moving average)
    if (metrics.averageResponseTime === 0) {
      metrics.averageResponseTime = responseTime;
    } else {
      metrics.averageResponseTime = (metrics.averageResponseTime * 0.7) + (responseTime * 0.3);
    }

    // Update quota information from headers
    if (quotaHeaders) {
      this.updateQuotaFromHeaders(provider, quotaHeaders);
    }

    // Update scores
    this.updateProviderScores(provider);
  }

  /**
   * Record a failed API call
   */
  recordFailure(provider: AIProvider, error: string, isQuotaError: boolean = false): void {
    const metrics = this.healthMetrics.get(provider);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.consecutiveFailures++;
    metrics.lastUpdated = new Date();
    
    // Track error patterns
    metrics.errorPatterns.unshift(error);
    if (metrics.errorPatterns.length > 10) {
      metrics.errorPatterns = metrics.errorPatterns.slice(0, 10);
    }

    // Handle quota-specific errors
    if (isQuotaError) {
      metrics.quotaLimitReached = true;
      const quotaInfo = this.quotaInfo.get(provider);
      if (quotaInfo) {
        quotaInfo.isQuotaExceeded = true;
      }
    }

    this.updateProviderScores(provider);
  }

  /**
   * Update quota information from API response headers
   */
  private updateQuotaFromHeaders(provider: AIProvider, headers: Record<string, string>): void {
    const quotaInfo = this.quotaInfo.get(provider);
    if (!quotaInfo) return;

    // Parse common quota header patterns
    
    // Rate limit headers (common patterns)
    const rateLimitRemaining = headers['x-ratelimit-remaining'] || headers['ratelimit-remaining'];
    const rateLimitLimit = headers['x-ratelimit-limit'] || headers['ratelimit-limit'];
    const rateLimitReset = headers['x-ratelimit-reset'] || headers['ratelimit-reset'];

    if (rateLimitRemaining && rateLimitLimit) {
      const remaining = parseInt(rateLimitRemaining);
      const limit = parseInt(rateLimitLimit);
      quotaInfo.hourlyUsed = limit - remaining;
      quotaInfo.hourlyLimit = limit;
    }

    if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset);
      quotaInfo.resetTime = new Date(resetTime * 1000); // Assuming Unix timestamp
    }

    // Provider-specific headers
    this.updateProviderSpecificQuota(provider, headers, quotaInfo);
  }

  /**
   * Update provider-specific quota information
   */
  private updateProviderSpecificQuota(provider: AIProvider, headers: Record<string, string>, quotaInfo: ProviderQuotaInfo): void {
    switch (provider) {
      case 'gemini':
        // Gemini-specific quota headers
        if (headers['x-goog-quota-remaining']) {
          quotaInfo.hourlyUsed = quotaInfo.hourlyLimit - parseInt(headers['x-goog-quota-remaining']);
        }
        break;
      
      case 'openai':
        // OpenAI-specific quota headers
        if (headers['x-ratelimit-remaining-tokens']) {
          const remaining = parseInt(headers['x-ratelimit-remaining-tokens']);
          quotaInfo.dailyUsed = quotaInfo.dailyLimit - remaining;
        }
        break;
      
      case 'openrouter':
        // OpenRouter-specific quota headers
        if (headers['x-ratelimit-remaining']) {
          quotaInfo.hourlyUsed = quotaInfo.hourlyLimit - parseInt(headers['x-ratelimit-remaining']);
        }
        break;
    }
  }

  /**
   * Update all provider scores based on current metrics
   */
  private updateProviderScores(provider: AIProvider): void {
    const metrics = this.healthMetrics.get(provider);
    const quotaInfo = this.quotaInfo.get(provider);
    if (!metrics || !quotaInfo) return;

    // Availability score (0-1, based on success rate)
    if (metrics.totalRequests > 0) {
      metrics.availability = metrics.successfulRequests / metrics.totalRequests;
    }

    // Apply penalty for consecutive failures
    if (metrics.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      metrics.availability = Math.max(0, metrics.availability - 0.5);
    }

    // Performance score (0-1, based on response time)
    if (metrics.averageResponseTime > 0) {
      metrics.performance = Math.max(0, 1 - (metrics.averageResponseTime / this.MAX_RESPONSE_TIME));
    }

    // Quota remaining score (0-1)
    if (quotaInfo.isQuotaExceeded) {
      metrics.quotaRemaining = 0;
    } else {
      const hourlyRemaining = Math.max(0, quotaInfo.hourlyLimit - quotaInfo.hourlyUsed) / quotaInfo.hourlyLimit;
      const dailyRemaining = Math.max(0, quotaInfo.dailyLimit - quotaInfo.dailyUsed) / quotaInfo.dailyLimit;
      metrics.quotaRemaining = Math.min(hourlyRemaining, dailyRemaining);
    }
  }

  /**
   * Update health scores for all providers
   */
  private updateHealthScores(): void {
    for (const provider of this.healthMetrics.keys()) {
      this.updateProviderScores(provider);
      
      // Reset quota if enough time has passed
      this.resetQuotaIfNeeded(provider);
    }
  }

  /**
   * Reset quota information if reset time has passed
   */
  private resetQuotaIfNeeded(provider: AIProvider): void {
    const quotaInfo = this.quotaInfo.get(provider);
    const metrics = this.healthMetrics.get(provider);
    if (!quotaInfo || !metrics) return;

    const now = new Date();
    if (now >= quotaInfo.resetTime) {
      quotaInfo.hourlyUsed = 0;
      quotaInfo.isQuotaExceeded = false;
      quotaInfo.resetTime = new Date(now.getTime() + 3600000); // Next hour
      
      metrics.quotaLimitReached = false;
      metrics.quotaRemaining = 1.0;
    }
  }

  /**
   * Get health metrics for a specific provider
   */
  getProviderHealth(provider: AIProvider): ProviderHealthMetrics | null {
    return this.healthMetrics.get(provider) || null;
  }

  /**
   * Get health metrics for all providers
   */
  getAllProviderHealth(): Map<AIProvider, ProviderHealthMetrics> {
    return new Map(this.healthMetrics);
  }

  /**
   * Get quota information for a provider
   */
  getProviderQuota(provider: AIProvider): ProviderQuotaInfo | null {
    return this.quotaInfo.get(provider) || null;
  }

  /**
   * Check if a provider is currently healthy
   */
  isProviderHealthy(provider: AIProvider): boolean {
    const metrics = this.healthMetrics.get(provider);
    if (!metrics) return false;

    // For providers with no usage history, be optimistic
    if (metrics.totalRequests === 0) {
      return (
        !metrics.quotaLimitReached &&
        metrics.quotaRemaining > 0.1
      );
    }

    // For providers with usage history, apply stricter checks
    return (
      metrics.availability > 0.5 &&
      metrics.consecutiveFailures < this.FAILURE_THRESHOLD &&
      !metrics.quotaLimitReached &&
      metrics.quotaRemaining > 0.1
    );
  }

  /**
   * Get the overall health score for a provider (0-1)
   */
  getOverallHealthScore(provider: AIProvider): number {
    const metrics = this.healthMetrics.get(provider);
    if (!metrics) return 0;

    // Weighted scoring: availability (40%), quota (30%), performance (20%), cost (10%)
    return (
      metrics.availability * 0.4 +
      metrics.quotaRemaining * 0.3 +
      metrics.performance * 0.2 +
      (1 - metrics.cost) * 0.1 // Lower cost is better
    );
  }

  /**
   * Reset health metrics for a provider (useful for testing)
   */
  resetProviderHealth(provider: AIProvider): void {
    const defaultMetrics = {
      provider,
      availability: 1.0,
      performance: 1.0,
      quotaRemaining: 1.0,
      cost: 0.5,
      lastUpdated: new Date(),
      consecutiveFailures: 0,
      lastSuccessfulCall: null,
      averageResponseTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      quotaLimitReached: false,
      errorPatterns: []
    };

    this.healthMetrics.set(provider, defaultMetrics);
  }

  /**
   * Detect if an error is quota-related
   */
  static isQuotaError(error: string): boolean {
    const quotaErrorPatterns = [
      /quota.*exceeded/i,
      /rate.*limit.*exceeded/i,
      /too.*many.*requests/i,
      /api.*limit.*reached/i,
      /usage.*limit.*exceeded/i,
      /daily.*limit.*exceeded/i,
      /monthly.*limit.*exceeded/i,
      /429/,
      /quota_exceeded/i,
      /rate_limit_exceeded/i
    ];

    return quotaErrorPatterns.some(pattern => pattern.test(error));
  }
}

// Export singleton instance
export const providerHealthMonitor = ProviderHealthMonitor.getInstance();
export default providerHealthMonitor;