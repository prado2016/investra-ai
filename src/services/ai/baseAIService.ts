/**
 * Base AI Service Class
 * Task 18: Gemini AI Service Layer Integration
 */

import type {
  IAIService,
  AIProvider,
  AIServiceConfig,
  AIServiceError,
  CacheEntry,
  CacheStats,
  RateLimitStatus,
  UsageMetrics,
  SymbolLookupRequest,
  SymbolLookupResponse,
  FinancialAnalysisRequest,
  FinancialAnalysisResponse,
  EmailParsingRequest,
  EmailParsingResponse
} from '../../types/ai';
import { providerHealthMonitor, ProviderHealthMonitor } from './providerHealthMonitor';

export abstract class BaseAIService implements IAIService {
  protected config: AIServiceConfig;
  protected cache = new Map<string, CacheEntry<unknown>>();
  protected requestCounts = new Map<string, number>();
  protected usageMetrics: UsageMetrics[] = [];
  protected healthMonitor: ProviderHealthMonitor = providerHealthMonitor;
  
  // Rate limiting counters
  protected hourlyRequests = 0;
  protected dailyRequests = 0;
  protected lastHourReset = new Date();
  protected lastDayReset = new Date();

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.setupRateLimitReset();
  }

  abstract get provider(): AIProvider;

  get isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  // Abstract methods to be implemented by concrete classes
  abstract lookupSymbols(request: SymbolLookupRequest): Promise<SymbolLookupResponse>;
  abstract analyzeFinancialData(request: FinancialAnalysisRequest): Promise<FinancialAnalysisResponse>;
  abstract parseEmailForTransaction(request: EmailParsingRequest): Promise<EmailParsingResponse>;
  abstract testConnection(): Promise<{ success: boolean; error?: string; latency?: number }>;

  // Rate limiting implementation
  async getRateLimitStatus(): Promise<RateLimitStatus> {
    this.updateRateLimitCounters();
    
    return {
      provider: this.provider,
      requestsThisHour: this.hourlyRequests,
      requestsToday: this.dailyRequests,
      maxRequestsPerHour: this.config.rateLimitPerHour || 100,
      maxRequestsPerDay: this.config.rateLimitPerDay || 1000,
      resetTime: new Date(Math.max(this.lastHourReset.getTime() + 3600000, this.lastDayReset.getTime() + 86400000)),
      available: this.isRequestAllowed()
    };
  }

  // Usage metrics
  async getUsageMetrics(timeframe?: string): Promise<UsageMetrics[]> {
    const now = new Date();
    const timeframeMs = this.parseTimeframe(timeframe || '24h');
    const cutoff = new Date(now.getTime() - timeframeMs);
    
    return this.usageMetrics.filter(metric => metric.timestamp >= cutoff);
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = new Date();
    const validEntries = entries.filter(entry => entry.expiresAt > now);
    
    const totalRequests = this.usageMetrics.length;
    const cacheHits = this.usageMetrics.filter(m => m.endpoint.includes('cache')).length;
    
    return {
      hitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      totalRequests,
      cacheHits,
      cacheMisses: totalRequests - cacheHits,
      entriesCount: validEntries.length,
      memoryUsage: this.calculateMemoryUsage(),
      oldestEntry: validEntries.length > 0 ? new Date(Math.min(...validEntries.map(e => e.timestamp.getTime()))) : undefined,
      newestEntry: validEntries.length > 0 ? new Date(Math.max(...validEntries.map(e => e.timestamp.getTime()))) : undefined
    };
  }

  // Protected helper methods
  protected generateCacheKey(prefix: string, data: unknown): string {
    const hash = this.simpleHash(JSON.stringify(data));
    return `${prefix}_${hash}`;
  }

  protected setCacheEntry<T>(key: string, data: T, expiryMinutes?: number): void {
    if (!this.config.enableCaching) return;
    
    const now = new Date();
    const expiry = new Date(now.getTime() + (expiryMinutes || this.config.cacheExpiryMinutes || 60) * 60000);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: expiry
    });
  }

  protected getCacheEntry<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;
    
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < new Date()) {
      if (entry) this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  protected async checkRateLimit(): Promise<void> {
    if (!this.isRequestAllowed()) {
      throw this.createError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        'rate_limit'
      );
    }
    
    this.incrementRequestCount();
  }

  protected trackUsage(endpoint: string, tokensUsed: number, responseTime: number, error?: boolean): void {
    this.usageMetrics.push({
      provider: this.provider,
      endpoint,
      tokensUsed,
      requestCount: 1,
      errorCount: error ? 1 : 0,
      averageResponseTime: responseTime,
      timestamp: new Date()
    });
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.usageMetrics.length > 1000) {
      this.usageMetrics = this.usageMetrics.slice(-1000);
    }
  }

  /**
   * Record successful API call for health monitoring
   */
  protected recordApiSuccess(responseTime: number, quotaHeaders?: Record<string, string>): void {
    this.healthMonitor.recordSuccess(this.provider, responseTime, quotaHeaders);
  }

  /**
   * Record failed API call for health monitoring
   */
  protected recordApiFailure(error: string, isQuotaError: boolean = false): void {
    // Check if this is a quota-related error
    if (!isQuotaError) {
      isQuotaError = ProviderHealthMonitor.isQuotaError(error);
    }
    
    this.healthMonitor.recordFailure(this.provider, error, isQuotaError);
  }

  /**
   * Extract quota headers from response
   */
  protected extractQuotaHeaders(response: Response): Record<string, string> {
    const quotaHeaders: Record<string, string> = {};
    const headerNames = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining', 
      'x-ratelimit-reset',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
      'x-goog-quota-remaining',
      'x-ratelimit-remaining-tokens'
    ];

    headerNames.forEach(name => {
      const value = response.headers.get(name);
      if (value) {
        quotaHeaders[name] = value;
      }
    });

    return quotaHeaders;
  }

  protected createError(
    code: string,
    message: string,
    type: AIServiceError['type'] = 'api_error',
    details?: unknown,
    retryable: boolean = false
  ): AIServiceError {
    return {
      code,
      message,
      provider: this.provider,
      type,
      details,
      retryable
    };
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry non-retryable errors
        if (error instanceof Error && !this.isRetryableError(error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  private setupRateLimitReset(): void {
    // Reset hourly counter every hour
    setInterval(() => {
      this.hourlyRequests = 0;
      this.lastHourReset = new Date();
    }, 3600000); // 1 hour
    
    // Reset daily counter every day
    setInterval(() => {
      this.dailyRequests = 0;
      this.lastDayReset = new Date();
    }, 86400000); // 24 hours
  }

  private updateRateLimitCounters(): void {
    const now = new Date();
    
    // Reset hourly counter if more than an hour has passed
    if (now.getTime() - this.lastHourReset.getTime() >= 3600000) {
      this.hourlyRequests = 0;
      this.lastHourReset = now;
    }
    
    // Reset daily counter if more than a day has passed
    if (now.getTime() - this.lastDayReset.getTime() >= 86400000) {
      this.dailyRequests = 0;
      this.lastDayReset = now;
    }
  }

  private isRequestAllowed(): boolean {
    this.updateRateLimitCounters();
    
    const hourlyLimit = this.config.rateLimitPerHour || 100;
    const dailyLimit = this.config.rateLimitPerDay || 1000;
    
    return this.hourlyRequests < hourlyLimit && this.dailyRequests < dailyLimit;
  }

  private incrementRequestCount(): void {
    this.hourlyRequests++;
    this.dailyRequests++;
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([hmsdw])$/);
    if (!match) return 86400000; // Default to 24 hours
    
    const [, value, unit] = match;
    const multipliers = {
      's': 1000,
      'm': 60000,
      'h': 3600000,
      'd': 86400000,
      'w': 604800000
    };
    
    return parseInt(value) * (multipliers[unit as keyof typeof multipliers] || 3600000);
  }

  private calculateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry).length * 2; // Rough UTF-16 size estimate
    }
    return size;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Retry on network-related errors
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')) {
      return true;
    }
    
    // Don't retry on authentication, quota, or validation errors
    if (message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('quota') ||
        message.includes('invalid') ||
        message.includes('bad request')) {
      return false;
    }
    
    return true;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
