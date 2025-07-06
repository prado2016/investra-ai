/**
 * Enhanced Supabase Client with Retry Logic and Connection Resilience
 * Addresses connection timeout issues and improves overall reliability
 * Uses singleton pattern to prevent multiple GoTrueClient instances
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase' // Import the singleton instance
import type { Database } from './database/types'
import { performanceMonitor } from '../utils/performanceMonitor'
import { registerSupabaseInstance } from '../utils/supabaseInstanceTracker'

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

interface ConnectionHealthMetrics {
  lastSuccessfulConnection: number;
  consecutiveFailures: number;
  averageConnectionTime: number;
  totalRequests: number;
}

class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>;
  private healthMetrics: ConnectionHealthMetrics;
  private retryConfig: RetryConfig;

  constructor(existingClient: SupabaseClient<Database>, retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      timeoutMs: 15000, // Increased timeout to handle slower queries on navigation
      ...retryConfig
    };

    this.healthMetrics = {
      lastSuccessfulConnection: Date.now(),
      consecutiveFailures: 0,
      averageConnectionTime: 0,
      totalRequests: 0
    };

    // Use the existing client instead of creating a new one
    this.client = existingClient;
    console.log('🔧 Enhanced Supabase client initialized using existing singleton');
    
    // Register instance for tracking in development
    registerSupabaseInstance('enhanced-wrapper', 'investra-ai-supabase-auth', 'reused-singleton');
  }

  /**
   * Enhanced query method with retry logic and connection monitoring
   */
  async queryWithRetry<T>(
    queryFn: (client: SupabaseClient<Database>) => Promise<T>,
    operation: string = 'query'
  ): Promise<T> {
    let lastError: Error | null = null;
    const startTime = Date.now();
    const endTiming = performanceMonitor.startTiming(operation);

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Check if we should circuit break
        if (this.shouldCircuitBreak()) {
          throw new Error(`Circuit breaker open: too many consecutive failures (${this.healthMetrics.consecutiveFailures})`);
        }

        // Execute query with timeout
        const result = await this.executeWithTimeout(
          queryFn(this.client),
          this.retryConfig.timeoutMs,
          `${operation} timeout after ${this.retryConfig.timeoutMs}ms`
        );

        // Update success metrics
        this.updateSuccessMetrics(Date.now() - startTime);
        endTiming();
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Update failure metrics
        this.updateFailureMetrics();

        // Don't retry on authentication errors or certain client errors
        if (this.isNonRetryableError(lastError)) {
          endTiming();
          throw lastError;
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`${operation} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    const finalError = new Error(
      `${operation} failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`
    );
    // Note: Error.cause requires ES2022 target, skipping for compatibility
    endTiming();
    throw finalError;
  }

  /**
   * Execute a promise with timeout
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      })
    ]);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Check if error is retryable
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /authentication/i,
      /unauthorized/i,
      /forbidden/i,
      /not found/i,
      /bad request/i,
      /invalid.*key/i,
      /permission.*denied/i
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Circuit breaker logic with reset capability
   */
  private shouldCircuitBreak(): boolean {
    const maxConsecutiveFailures = 5;
    const cooldownPeriod = 60000; // 60 seconds

    if (this.healthMetrics.consecutiveFailures >= maxConsecutiveFailures) {
      const timeSinceLastSuccess = Date.now() - this.healthMetrics.lastSuccessfulConnection;
      return timeSinceLastSuccess < cooldownPeriod;
    }

    return false;
  }

  /**
   * Force reset the circuit breaker
   */
  resetCircuitBreaker(): void {
    this.healthMetrics.consecutiveFailures = 0;
    this.healthMetrics.lastSuccessfulConnection = Date.now();
    console.log('🔄 Circuit breaker manually reset');
  }

  /**
   * Update metrics on successful operation
   */
  private updateSuccessMetrics(connectionTime: number): void {
    this.healthMetrics.lastSuccessfulConnection = Date.now();
    this.healthMetrics.consecutiveFailures = 0;
    this.healthMetrics.totalRequests++;
    
    // Update rolling average connection time
    const totalTime = this.healthMetrics.averageConnectionTime * (this.healthMetrics.totalRequests - 1);
    this.healthMetrics.averageConnectionTime = (totalTime + connectionTime) / this.healthMetrics.totalRequests;
  }

  /**
   * Update metrics on failed operation
   */
  private updateFailureMetrics(): void {
    this.healthMetrics.consecutiveFailures++;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      ...this.healthMetrics,
      isHealthy: this.healthMetrics.consecutiveFailures < 3,
      circuitBreakerOpen: this.shouldCircuitBreak()
    };
  }

  /**
   * Get the underlying Supabase client for direct access when needed
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }
}

// Create and export enhanced client instance using the singleton
export const enhancedSupabase = new EnhancedSupabaseClient(supabase);

// Reset circuit breaker on startup to clear any stuck state
enhancedSupabase.resetCircuitBreaker();

// Add global reset function for debugging
interface GlobalSupabaseReset {
  (): void;
}

// Only expose global function in browser environment
if (typeof window !== 'undefined') {
  (window as unknown as { __resetSupabaseCircuitBreaker: GlobalSupabaseReset }).__resetSupabaseCircuitBreaker = () => {
    enhancedSupabase.resetCircuitBreaker();
  };
}

export { EnhancedSupabaseClient };
export type { Database };
