/**
 * Yahoo Finance Symbol Validator
 * Validates symbols against Yahoo Finance API
 */

interface YahooValidationResult {
  isValid: boolean;
  symbol: string;
  name?: string;
  price?: number;
  error?: string;
  type?: 'stock' | 'etf' | 'option' | 'index';
}

export class YahooFinanceValidator {
  private static YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private static cache = new Map<string, { result: YahooValidationResult; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static lastRequestTime = 0;
  private static REQUEST_DELAY = 1000; // 1 second between requests
  
  /**
   * Simple symbol validation without API call (fallback method)
   */
  static validateSymbolFormat(symbol: string): YahooValidationResult {
    const trimmedSymbol = symbol.trim().toUpperCase();
    
    // Check for options symbol format: SYMBOL + YYMMDD + C/P + 8-digit strike
    const optionsPattern = /^[A-Z]{1,5}\d{6}[CP]\d{8}$/;
    if (optionsPattern.test(trimmedSymbol)) {
      return {
        isValid: true,
        symbol: trimmedSymbol,
        name: `${trimmedSymbol} (Options Contract)`,
        type: 'option'
      };
    }
    
    // Basic stock/ETF format validation (1-5 letters)
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) {
      return {
        isValid: false,
        symbol: trimmedSymbol,
        error: 'Invalid symbol format (should be 1-5 letters for stocks or Yahoo Finance options format)'
      };
    }
    
    // Known common symbols (basic whitelist)
    const knownSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'INTC',
      'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'GLD', 'SLV', 'TLT',
      'SOXL', 'TQQQ', 'UPRO', 'TMF', 'TECL', 'CURE', 'LABU', 'SPXL', 'UDOW', 'NAIL'
    ];
    
    return {
      isValid: knownSymbols.includes(trimmedSymbol),
      symbol: trimmedSymbol,
      name: knownSymbols.includes(trimmedSymbol) ? `${trimmedSymbol} (Common Symbol)` : undefined,
      type: 'stock'
    };
  }
  
  /**
   * Check cache for recent validation results
   */
  private static getCachedResult(symbol: string): YahooValidationResult | null {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 Using cached result for ${symbol}`);
      return cached.result;
    }
    return null;
  }
  
  /**
   * Store result in cache
   */
  private static setCachedResult(symbol: string, result: YahooValidationResult): void {
    this.cache.set(symbol, {
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * Rate limiting delay
   */
  private static async rateLimitDelay(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const delay = this.REQUEST_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limiting delay: ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Validate symbol against Yahoo Finance
   */
  static async validateSymbol(symbol: string): Promise<YahooValidationResult> {
    const trimmedSymbol = symbol.trim().toUpperCase();
    
    try {
      console.log(`🔍 Validating symbol: ${trimmedSymbol}`);
      
      // Check cache first
      const cachedResult = this.getCachedResult(trimmedSymbol);
      if (cachedResult) {
        return cachedResult;
      }

      // For options symbols, use fallback validation primarily since Yahoo Finance API 
      // may not support options symbols directly via the chart endpoint
      const optionsPattern = /^[A-Z]{1,5}\d{6}[CP]\d{8}$/;
      if (optionsPattern.test(trimmedSymbol)) {
        console.log(`📋 Detected options symbol, using fallback validation: ${trimmedSymbol}`);
        const fallbackResult = this.validateSymbolFormat(trimmedSymbol);
        this.setCachedResult(trimmedSymbol, fallbackResult);
        return fallbackResult;
      }
      
      await this.rateLimitDelay();
      
      const response = await fetch(`${this.YAHOO_BASE_URL}/${trimmedSymbol}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Stock Tracker)',
        },
      });

      console.log(`📡 Yahoo Finance response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Handle rate limiting with fallback
        if (response.status === 429) {
          console.warn(`⏳ Rate limited for ${trimmedSymbol}, using fallback validation`);
          const fallbackResult = this.validateSymbolFormat(trimmedSymbol);
          this.setCachedResult(trimmedSymbol, fallbackResult);
          return fallbackResult;
        }
        
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`❌ Yahoo Finance validation failed: ${errorMsg}`);
        const errorResult = {
          isValid: false,
          symbol: trimmedSymbol,
          error: errorMsg
        };
        this.setCachedResult(trimmedSymbol, errorResult);
        return errorResult;
      }

      const data = await response.json();
      console.log(`📊 Yahoo Finance data received for ${trimmedSymbol}`);
      
      if (data.chart?.error) {
        console.warn(`❌ Yahoo Finance chart error:`, data.chart.error);
        
        // For valid format symbols that Yahoo can't find, use fallback
        const fallbackResult = this.validateSymbolFormat(trimmedSymbol);
        if (fallbackResult.isValid) {
          console.log(`🔄 Yahoo Finance failed but symbol format is valid, using fallback: ${trimmedSymbol}`);
          this.setCachedResult(trimmedSymbol, fallbackResult);
          return fallbackResult;
        }
        
        const errorResult = {
          isValid: false,
          symbol: trimmedSymbol,
          error: data.chart.error.description || 'Symbol not found'
        };
        this.setCachedResult(trimmedSymbol, errorResult);
        return errorResult;
      }

      const result = data.chart?.result?.[0];
      if (!result) {
        console.warn(`❌ No chart result for symbol: ${trimmedSymbol}`);
        
        // For valid format symbols that return no data, use fallback
        const fallbackResult = this.validateSymbolFormat(trimmedSymbol);
        if (fallbackResult.isValid) {
          console.log(`🔄 No chart data but symbol format is valid, using fallback: ${trimmedSymbol}`);
          this.setCachedResult(trimmedSymbol, fallbackResult);
          return fallbackResult;
        }
        
        const errorResult = {
          isValid: false,
          symbol: trimmedSymbol,
          error: 'No data returned for symbol'
        };
        this.setCachedResult(trimmedSymbol, errorResult);
        return errorResult;
      }

      // Extract basic info
      const meta = result.meta;
      const currentPrice = meta?.regularMarketPrice || meta?.previousClose;
      
      console.log(`✅ Symbol validation successful: ${trimmedSymbol} - ${meta?.longName || meta?.shortName}`);
      
      const validationResult: YahooValidationResult = {
        isValid: true,
        symbol: meta?.symbol || trimmedSymbol,
        name: meta?.longName || meta?.shortName,
        price: currentPrice,
        type: this.detectSymbolType(trimmedSymbol, meta)
      };
      
      // Cache the result
      this.setCachedResult(trimmedSymbol, validationResult);

      return validationResult;

    } catch (error) {
      console.error('❌ Yahoo Finance validation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Validation failed';
      
      // Use fallback validation on network errors
      if (errorMsg.includes('network') || 
          errorMsg.includes('fetch') || 
          errorMsg.includes('TypeError') ||
          errorMsg.includes('Load failed') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('CORS') ||
          errorMsg.includes('blocked by CORS')) {
        console.log(`🔄 Network error detected (${errorMsg}), using fallback validation for ${trimmedSymbol}`);
        const fallbackResult = this.validateSymbolFormat(trimmedSymbol);
        this.setCachedResult(trimmedSymbol, fallbackResult);
        return fallbackResult;
      }
      
      const errorResult = {
        isValid: false,
        symbol: trimmedSymbol,
        error: errorMsg
      };
      this.setCachedResult(trimmedSymbol, errorResult);
      return errorResult;
    }
  }

  /**
   * Validate symbol with fallback support
   */
  static async validateSymbolWithFallback(symbol: string): Promise<YahooValidationResult> {
    try {
      // First try Yahoo Finance
      const result = await this.validateSymbol(symbol);
      if (result.isValid) {
        return result;
      }
      
      // If Yahoo Finance fails but it's a known symbol, use fallback
      console.log(`🔄 Yahoo Finance validation failed, trying fallback for ${symbol}`);
      const fallbackResult = this.validateSymbolFormat(symbol);
      
      if (fallbackResult.isValid) {
        console.log(`✅ Fallback validation successful for ${symbol}`);
        return fallbackResult;
      }
      
      // Return the original Yahoo Finance error if fallback also fails
      return result;
      
    } catch (error) {
      console.error(`❌ Complete validation failure for ${symbol}:`, error);
      // Last resort: try fallback
      return this.validateSymbolFormat(symbol);
    }
  }

  /**
   * Detect symbol type based on format and metadata
   */
  private static detectSymbolType(symbol: string, meta: Record<string, unknown>): 'stock' | 'etf' | 'option' | 'index' {
    // Options have specific format: SYMBOL + DATE + C/P + STRIKE
    if (symbol.length > 10 && /\d{6}[CP]\d{8}$/.test(symbol)) {
      return 'option';
    }
    
    // ETFs often have 'ETF' in description or specific exchanges
    const longName = meta?.longName as string;
    const shortName = meta?.shortName as string;
    if (longName?.includes('ETF') || shortName?.includes('ETF')) {
      return 'etf';
    }
    
    // Indices often start with ^ or have specific patterns
    if (symbol.startsWith('^') || symbol.includes('SPX') || symbol.includes('NDX')) {
      return 'index';
    }
    
    // Default to stock
    return 'stock';
  }

  /**
   * Get detailed quote information
   */
  static async getQuote(symbol: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.YAHOO_BASE_URL}/${symbol}?interval=1d&range=1d`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Stock Tracker)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.chart?.result?.[0];

    } catch (error) {
      console.error('Failed to get quote:', error);
      throw error;
    }
  }

  /**
   * Batch validate multiple symbols
   */
  static async validateSymbols(symbols: string[]): Promise<YahooValidationResult[]> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.validateSymbol(symbol))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          isValid: false,
          symbol: symbols[index],
          error: result.reason instanceof Error ? result.reason.message : 'Validation failed'
        };
      }
    });
  }
}
