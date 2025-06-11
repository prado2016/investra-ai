/**
 * Rate Limiter Utility
 * Prevents excessive API calls and enforces cooldown periods
 */

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
  cooldownMs: number;
}

interface CallRecord {
  timestamp: number;
  count: number;
}

class RateLimiter {
  private calls: Map<string, CallRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = {
    maxCalls: 5,
    windowMs: 60000, // 1 minute
    cooldownMs: 10000 // 10 seconds
  }) {
    this.config = config;
  }

  /**
   * Check if an operation is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.calls.get(key);

    // If no record exists, allow the call
    if (!record) {
      this.calls.set(key, { timestamp: now, count: 1 });
      return true;
    }

    // If outside the window, reset the count
    if (now - record.timestamp > this.config.windowMs) {
      this.calls.set(key, { timestamp: now, count: 1 });
      return true;
    }

    // If within the window and under the limit, allow
    if (record.count < this.config.maxCalls) {
      record.count++;
      return true;
    }

    // Rate limit exceeded
    console.warn(`🚫 Rate limit exceeded for ${key}: ${record.count} calls in ${this.config.windowMs}ms`);
    return false;
  }

  /**
   * Record a successful call
   */
  recordCall(key: string): void {
    const now = Date.now();
    const record = this.calls.get(key);

    if (record && now - record.timestamp <= this.config.windowMs) {
      record.count++;
    } else {
      this.calls.set(key, { timestamp: now, count: 1 });
    }
  }

  /**
   * Get time until next allowed call
   */
  getTimeUntilReset(key: string): number {
    const record = this.calls.get(key);
    if (!record) return 0;

    const elapsed = Date.now() - record.timestamp;
    return Math.max(0, this.config.windowMs - elapsed);
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.calls.delete(key);
  }

  /**
   * Clean up old records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.calls.entries()) {
      if (now - record.timestamp > this.config.windowMs) {
        this.calls.delete(key);
      }
    }
  }
}

// Create global rate limiters for different operations
export const authRateLimiter = new RateLimiter({
  maxCalls: 3,
  windowMs: 30000, // 30 seconds
  cooldownMs: 5000  // 5 seconds
});

export const portfolioRateLimiter = new RateLimiter({
  maxCalls: 5,
  windowMs: 60000, // 1 minute
  cooldownMs: 10000 // 10 seconds
});

export const transactionRateLimiter = new RateLimiter({
  maxCalls: 10,
  windowMs: 60000, // 1 minute
  cooldownMs: 5000  // 5 seconds
});

// Cleanup interval
setInterval(() => {
  authRateLimiter.cleanup();
  portfolioRateLimiter.cleanup();
  transactionRateLimiter.cleanup();
}, 60000); // Cleanup every minute

export { RateLimiter };
