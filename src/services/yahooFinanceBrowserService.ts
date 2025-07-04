/**
 * Browser-compatible Yahoo Finance Service
 * Uses fetch API instead of the Node.js yahoo-finance2 library
 */

// Global request queue to prevent overwhelming API
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly MIN_DELAY = 3000; // 3 seconds between requests
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly MAX_FAILURES = 3;
  private readonly FAILURE_WINDOW = 60000; // 1 minute
  private circuitOpen = false;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    // Check circuit breaker
    if (this.circuitOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime < this.FAILURE_WINDOW) {
        throw new Error('Circuit breaker open - Yahoo Finance API temporarily disabled due to repeated failures');
      } else {
        // Reset circuit breaker after timeout
        this.circuitOpen = false;
        this.failureCount = 0;
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Ensure minimum delay between requests
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          if (timeSinceLastRequest < this.MIN_DELAY) {
            const waitTime = this.MIN_DELAY - timeSinceLastRequest;
            await new Promise(r => setTimeout(r, waitTime));
          }
          
          const result = await requestFn();
          this.lastRequestTime = Date.now();
          
          // Reset failure count on success
          this.failureCount = 0;
          resolve(result);
        } catch (error) {
          this.handleFailure();
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private handleFailure() {
    const now = Date.now();
    
    // Reset failure count if outside failure window
    if (now - this.lastFailureTime > this.FAILURE_WINDOW) {
      this.failureCount = 0;
    }
    
    this.failureCount++;
    this.lastFailureTime = now;
    
    // Open circuit breaker if too many failures
    if (this.failureCount >= this.MAX_FAILURES) {
      this.circuitOpen = true;
      console.warn(`🚫 Yahoo Finance API circuit breaker OPEN - ${this.failureCount} failures in ${this.FAILURE_WINDOW}ms`);
    }
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Request queue error:', error);
        }
      }
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// API types
interface YahooFinanceQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  eps?: number;
  beta?: number;
  currency: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  lastUpdated: Date;
}

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
  cached?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

/**
 * Browser-compatible Yahoo Finance Service
 */
export class YahooFinanceBrowserService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(symbol: string, useCache: boolean = true): Promise<ApiResponse<YahooFinanceQuote>> {
    const cacheKey = `quote_${symbol}`;
    
    // Check cache first
    if (useCache && this.isCacheValid(cacheKey)) {
      const cachedData = this.cache.get(cacheKey)!;
      return {
        success: true,
        data: cachedData.data as YahooFinanceQuote,
        timestamp: new Date(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        // For development, return mock data to avoid CORS issues
        if (process.env.NODE_ENV === 'development') {
          const mockQuote = this.generateMockQuote(symbol);
          
          // Cache the result
          if (useCache) {
            this.setCacheEntry(cacheKey, mockQuote, this.DEFAULT_CACHE_DURATION);
          }

          return {
            success: true,
            data: mockQuote,
            timestamp: new Date(),
            cached: false
          };
        }

        // Use request queue to ensure only one request at a time
        const response = await requestQueue.add(async () => {
          console.log(`Making Yahoo Finance API request for: ${symbol}`);
          const res = await fetch(`/api/yahoo/v8/finance/chart/${symbol}`);
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          return res;
        });

        const data = await response.json();
        
        if (!data.chart?.result?.[0]) {
          throw new Error(`No quote data available for symbol: ${symbol}`);
        }

        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];

        if (!meta.regularMarketPrice) {
          throw new Error(`Invalid quote data for symbol: ${symbol}`);
        }

        const yahooQuote: YahooFinanceQuote = {
          symbol: meta.symbol || symbol,
          name: meta.longName || meta.shortName,
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          previousClose: meta.previousClose,
          open: quote?.open?.[quote.open.length - 1] || meta.regularMarketPrice,
          dayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
          dayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
          volume: meta.regularMarketVolume || 0,
          marketCap: meta.marketCap,
          peRatio: meta.trailingPE,
          dividendYield: meta.trailingAnnualDividendYield ? meta.trailingAnnualDividendYield * 100 : undefined,
          eps: meta.epsTrailingTwelveMonths,
          beta: meta.beta,
          currency: meta.currency || 'USD',
          exchange: meta.fullExchangeName || meta.exchangeName,
          sector: undefined, // Not available in chart API
          industry: undefined, // Not available in chart API
          lastUpdated: new Date()
        };

        // Cache the result
        if (useCache) {
          this.setCacheEntry(cacheKey, yahooQuote, this.DEFAULT_CACHE_DURATION);
        }

        return {
          success: true,
          data: yahooQuote,
          timestamp: new Date(),
          cached: false
        };

      } catch (error) {
        throw this.createApiError('QUOTE_FETCH_ERROR', `Failed to fetch quote for ${symbol}`, error);
      }
    });
  }

  /**
   * Get quotes for multiple symbols using request queue
   */
  async getQuotes(symbols: string[], useCache: boolean = true): Promise<ApiResponse<YahooFinanceQuote[]>> {
    try {
      const quotes: YahooFinanceQuote[] = [];
      const errors: string[] = [];
      
      // Process symbols sequentially through the request queue
      for (const symbol of symbols) {
        try {
          const result = await this.getQuote(symbol, useCache);
          
          if (result.success && result.data) {
            quotes.push(result.data);
          } else {
            errors.push(`Failed to fetch quote for ${symbol}`);
          }
        } catch (error) {
          errors.push(`Error fetching quote for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (quotes.length === 0) {
        throw new Error(`Failed to fetch quotes for all symbols: ${errors.join(', ')}`);
      }

      return {
        success: true,
        data: quotes,
        timestamp: new Date(),
        cached: false
      };

    } catch (error) {
      throw this.createApiError('QUOTES_FETCH_ERROR', 'Failed to fetch multiple quotes', error);
    }
  }

  /**
   * Generate mock quote data for development
   */
  private generateMockQuote(symbol: string): YahooFinanceQuote {
    const basePrice = Math.random() * 100 + 50; // Random price between 50-150
    const change = (Math.random() - 0.5) * 10; // Random change between -5 to +5
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      name: this.getMockCompanyName(symbol),
      price: Number(basePrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      previousClose: Number((basePrice - change).toFixed(2)),
      open: Number((basePrice + (Math.random() - 0.5) * 2).toFixed(2)),
      dayHigh: Number((basePrice + Math.random() * 5).toFixed(2)),
      dayLow: Number((basePrice - Math.random() * 5).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      marketCap: Math.floor(Math.random() * 1000000000000) + 10000000000,
      peRatio: Number((Math.random() * 30 + 10).toFixed(2)),
      dividendYield: Math.random() > 0.5 ? Number((Math.random() * 5).toFixed(2)) : undefined,
      eps: Number((Math.random() * 10 + 1).toFixed(2)),
      beta: Number((Math.random() * 2 + 0.5).toFixed(2)),
      currency: 'USD',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      lastUpdated: new Date()
    };
  }

  /**
   * Get mock company name
   */
  private getMockCompanyName(symbol: string): string {
    const mockNames: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix Inc.',
      'ADBE': 'Adobe Inc.',
      'CRM': 'Salesforce Inc.'
    };

    return mockNames[symbol.toUpperCase()] || `${symbol.toUpperCase()} Corporation`;
  }

  /**
   * Cache management
   */
  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? new Date() < entry.expiresAt : false;
  }

  private setCacheEntry<T>(key: string, data: T, duration: number): void {
    const now = new Date();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + duration)
    });
  }

  /**
   * Error handling
   */
  private createApiError(code: string, message: string, details?: unknown): ApiError {
    return {
      code,
      message,
      details: details instanceof Error ? details.message : details
    };
  }

  /**
   * Retry mechanism
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, retries: number = this.MAX_RETRIES): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const yahooFinanceBrowserService = new YahooFinanceBrowserService();
export default yahooFinanceBrowserService;
