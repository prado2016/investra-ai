import yahooFinance from 'yahoo-finance2';

// Inline API types to avoid import issues
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

interface YahooFinanceHistoricalData {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
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

interface YahooFinanceOptions {
  period1?: string | Date;
  period2?: string | Date;
  interval?: '1d' | '1wk' | '1mo';
  events?: 'history' | 'dividends' | 'split';
}

// Inline asset types to avoid import issues
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';

import { config } from '../utils/config';

/**
 * Yahoo Finance API Service
 * Handles all interactions with Yahoo Finance API including caching and error handling
 */
export class YahooFinanceService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_CACHE_DURATION = config.cache.defaultDuration;
  private readonly HISTORICAL_CACHE_DURATION = config.cache.historicalDataDuration;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = config.yahooFinance.rateLimitDelay;

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
        data: cachedData.data,
        timestamp: new Date(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        const quote = await yahooFinance.quote(symbol);
        
        if (!quote || !quote.regularMarketPrice) {
          throw new Error(`No quote data available for symbol: ${symbol}`);
        }

        const yahooQuote: YahooFinanceQuote = {
          symbol: quote.symbol || symbol,
          name: quote.shortName || quote.longName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          previousClose: quote.regularMarketPreviousClose || 0,
          open: quote.regularMarketOpen || 0,
          dayHigh: quote.regularMarketDayHigh || 0,
          dayLow: quote.regularMarketDayLow || 0,
          volume: quote.regularMarketVolume || 0,
          marketCap: quote.marketCap,
          peRatio: quote.trailingPE,
          dividendYield: quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : undefined,
          eps: (quote as any).trailingEps || (quote as any).epsTrailingTwelveMonths,
          beta: quote.beta,
          currency: quote.currency || 'USD',
          exchange: quote.fullExchangeName,
          sector: (quote as any).sector,
          industry: (quote as any).industry,
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
   * Get quotes for multiple symbols
   */
  async getQuotes(symbols: string[], useCache: boolean = true): Promise<ApiResponse<YahooFinanceQuote[]>> {
    return this.executeWithRetry(async () => {
      try {
        const quotes: YahooFinanceQuote[] = [];
        const errors: string[] = [];

        // Process symbols in batches to avoid rate limiting
        const batchSize = 10;
        for (let i = 0; i < symbols.length; i += batchSize) {
          const batch = symbols.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (symbol) => {
            try {
              const result = await this.getQuote(symbol, useCache);
              if (result.success && result.data) {
                return result.data;
              } else {
                errors.push(`Failed to fetch quote for ${symbol}`);
                return null;
              }
            } catch (error) {
              errors.push(`Error fetching quote for ${symbol}: ${error}`);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          quotes.push(...batchResults.filter(quote => quote !== null) as YahooFinanceQuote[]);

          // Add delay between batches to respect rate limits
          if (i + batchSize < symbols.length) {
            await this.delay(200);
          }
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
    });
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(
    symbol: string, 
    options: YahooFinanceOptions = {},
    useCache: boolean = true
  ): Promise<ApiResponse<YahooFinanceHistoricalData[]>> {
    const cacheKey = `historical_${symbol}_${JSON.stringify(options)}`;
    
    // Check cache (longer cache duration for historical data)
    if (useCache && this.isCacheValid(cacheKey, this.HISTORICAL_CACHE_DURATION)) {
      const cachedData = this.cache.get(cacheKey)!;
      return {
        success: true,
        data: cachedData.data,
        timestamp: new Date(),
        cached: true
      };
    }

    return this.executeWithRetry(async () => {
      try {
        const queryOptions = {
          period1: options.period1 || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          period2: options.period2 || new Date(),
          interval: options.interval || '1d' as const,
          events: options.events || 'history' as const,
        };

        const result = await yahooFinance.historical(symbol, queryOptions);

        if (!result || result.length === 0) {
          throw new Error(`No historical data available for symbol: ${symbol}`);
        }

        const historicalData: YahooFinanceHistoricalData[] = result.map((item: any) => ({
          symbol,
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          adjClose: item.adjClose || item.close,
          volume: item.volume || 0
        }));

        // Cache the result
        if (useCache) {
          this.setCacheEntry(cacheKey, historicalData, this.HISTORICAL_CACHE_DURATION);
        }

        return {
          success: true,
          data: historicalData,
          timestamp: new Date(),
          cached: false
        };

      } catch (error) {
        throw this.createApiError('HISTORICAL_FETCH_ERROR', `Failed to fetch historical data for ${symbol}`, error);
      }
    });
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string): Promise<ApiResponse<Array<{ symbol: string; name: string; type: AssetType }>>> {
    return this.executeWithRetry(async () => {
      try {
        const result = await yahooFinance.search(query);

        if (!result || !result.quotes) {
          return {
            success: true,
            data: [],
            timestamp: new Date(),
            cached: false
          };
        }

        const searchResults = result.quotes.map((quote: any) => ({
          symbol: (quote as any).symbol,
          name: (quote as any).shortname || (quote as any).longname || '',
          type: this.determineAssetType((quote as any).quoteType || '', (quote as any).symbol)
        }));

        return {
          success: true,
          data: searchResults,
          timestamp: new Date(),
          cached: false
        };

      } catch (error) {
        throw this.createApiError('SEARCH_ERROR', `Failed to search for symbols with query: ${query}`, error);
      }
    });
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Private helper methods

  private async executeWithRetry<T>(operation: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    let lastError: Error = new Error('Unknown error');
    let retryCount = 0;

    while (retryCount < this.MAX_RETRIES) {
      try {
        const result = await operation();
        
        // If operation succeeded, return immediately
        if (result.success) {
          return result;
        }
        
        // If operation failed but shouldn't be retried, return the error
        if (result.error && !this.shouldRetryError(result.error)) {
          return result;
        }
        
        lastError = result.error ? new Error(result.error.message) : new Error('Unknown error');
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if this error should be retried
        if (!this.shouldRetryError(lastError)) {
          return {
            success: false,
            error: this.createApiError(
              'NON_RETRYABLE_ERROR',
              lastError.message,
              lastError
            ),
            timestamp: new Date()
          };
        }
      }

      retryCount++;
      
      // If we have more retries left, wait before the next attempt
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.calculateRetryDelay(retryCount);
        await this.delay(delay);
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: this.createApiError(
        'MAX_RETRIES_EXCEEDED',
        `Operation failed after ${this.MAX_RETRIES} attempts: ${lastError.message}`,
        lastError
      ),
      timestamp: new Date()
    };
  }

  private shouldRetryError(error: Error | ApiError): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Retry on network-related errors
    if (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')) {
      return true;
    }
    
    // Check for specific error codes
    if ('code' in error) {
      const retryableCodes = ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
      return retryableCodes.some(code => error.code === code);
    }
    
    return false;
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.RETRY_DELAY;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private createApiError(code: string, message: string, originalError?: any): ApiError {
    return {
      code,
      message,
      details: originalError ? {
        message: originalError.message,
        stack: originalError.stack
      } : undefined
    };
  }

  private isCacheValid(key: string, customDuration?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const duration = customDuration || this.DEFAULT_CACHE_DURATION;
    const isValid = Date.now() - entry.timestamp.getTime() < duration;
    
    if (!isValid) {
      this.cache.delete(key);
    }
    
    return isValid;
  }

  private setCacheEntry<T>(key: string, data: T, duration: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + duration)
    };
    this.cache.set(key, entry);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private determineAssetType(quoteType: string, symbol: string): AssetType {
    switch (quoteType.toLowerCase()) {
      case 'equity':
      case 'stock':
        return 'stock';
      case 'option':
        return 'option';
      case 'currency':
        return 'forex';
      case 'cryptocurrency':
        return 'crypto';
      case 'reit':
        return 'reit';
      default:
        // Fallback logic based on symbol pattern
        if (symbol.includes('USD') || symbol.includes('BTC') || symbol.includes('ETH')) {
          return 'crypto';
        }
        if (symbol.includes('/') || symbol.length === 6) {
          return 'forex';
        }
        return 'stock';
    }
  }
}

// Export a singleton instance
export const yahooFinanceService = new YahooFinanceService();
