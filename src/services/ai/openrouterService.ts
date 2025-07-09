/**
 * OpenRouter AI Service Implementation
 * Provides access to multiple AI models through OpenRouter's unified API
 */

import { BaseAIService } from './baseAIService';
import { ApiKeyStorage } from '../../utils/apiKeyStorage';
import type {
  AIProvider,
  AIServiceConfig,
  AssetType,
  SymbolLookupRequest,
  SymbolLookupResponse,
  SymbolLookupResult,
  FinancialAnalysisRequest,
  FinancialAnalysisResponse,
  FinancialAnalysisResult,
  EmailParsingRequest,
  EmailParsingResponse,
  EmailParsingExtractedData
} from '../../types/ai';

export class OpenRouterAIService extends BaseAIService {
  private baseURL = 'https://openrouter.ai/api/v1';
  private model: string;

  constructor(config: AIServiceConfig) {
    super(config);
    this.model = config.model || 'anthropic/claude-3.5-sonnet';
  }

  get provider(): AIProvider {
    return 'openrouter';
  }

  // Symbol lookup implementation
  async lookupSymbols(request: SymbolLookupRequest): Promise<SymbolLookupResponse> {
    const startTime = Date.now();
    
    try {
      await this.checkRateLimit();
      
      // Check cache first
      const cacheKey = this.generateCacheKey('symbol_lookup', request);
      const cachedResult = this.getCacheEntry<SymbolLookupResponse>(cacheKey);
      if (cachedResult) {
        return { ...cachedResult, cached: true };
      }

      if (!this.isConfigured) {
        throw this.createError(
          'API_KEY_NOT_CONFIGURED',
          'OpenRouter API key is not properly configured',
          'api_error'
        );
      }

      const prompt = this.buildSymbolLookupPrompt(request);
      const response = await this.makeAPIRequest(prompt);
      const text = response.choices[0]?.message?.content || '';

      const parsedResults = this.parseSymbolLookupResponse(text);
      const symbolResponse: SymbolLookupResponse = {
        success: true,
        results: parsedResults,
        timestamp: new Date(),
        tokensUsed: response.usage?.total_tokens || this.estimateTokens(prompt + text),
        processingTime: Date.now() - startTime
      };

      // Cache the result
      this.setCacheEntry(cacheKey, symbolResponse);
      
      // Track usage
      this.trackUsage('symbol_lookup', symbolResponse.tokensUsed || 0, symbolResponse.processingTime || 0);

      return symbolResponse;

    } catch (error) {
      this.trackUsage('symbol_lookup', 0, Date.now() - startTime, true);
      
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };
    }
  }

  // Financial analysis implementation
  async analyzeFinancialData(request: FinancialAnalysisRequest): Promise<FinancialAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      await this.checkRateLimit();
      
      // Check cache first
      const cacheKey = this.generateCacheKey('financial_analysis', request);
      const cachedResult = this.getCacheEntry<FinancialAnalysisResponse>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      if (!this.isConfigured) {
        throw this.createError(
          'API_KEY_NOT_CONFIGURED',
          'OpenRouter API key is not properly configured',
          'api_error'
        );
      }

      const prompt = this.buildFinancialAnalysisPrompt(request);
      const response = await this.makeAPIRequest(prompt);
      const text = response.choices[0]?.message?.content || '';

      const parsedResult = this.parseFinancialAnalysisResponse(text, request);
      const analysisResponse: FinancialAnalysisResponse = {
        success: true,
        result: parsedResult,
        timestamp: new Date(),
        tokensUsed: response.usage?.total_tokens || this.estimateTokens(prompt + text),
        processingTime: Date.now() - startTime
      };

      // Cache the result
      this.setCacheEntry(cacheKey, analysisResponse, 30); // Cache for 30 minutes
      
      // Track usage
      this.trackUsage('financial_analysis', analysisResponse.tokensUsed || 0, analysisResponse.processingTime || 0);

      return analysisResponse;

    } catch (error) {
      this.trackUsage('financial_analysis', 0, Date.now() - startTime, true);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };
    }
  }

  // Email parsing implementation
  async parseEmailForTransaction(request: EmailParsingRequest): Promise<EmailParsingResponse> {
    const startTime = Date.now();
    
    try {
      await this.checkRateLimit();
      
      // Check cache first
      const cacheKey = this.generateCacheKey('email_parsing', request);
      const cachedResult = this.getCacheEntry<EmailParsingResponse>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      if (!this.isConfigured) {
        throw this.createError(
          'API_KEY_NOT_CONFIGURED',
          'OpenRouter API key is not properly configured',
          'api_error'
        );
      }

      const prompt = this.buildEmailParsingPrompt(request);
      const response = await this.makeAPIRequest(prompt);
      const text = response.choices[0]?.message?.content || '';

      const parsedResult = this.parseEmailParsingResponse(text, request);
      const emailResponse: EmailParsingResponse = {
        success: true,
        extractedData: parsedResult.extractedData,
        confidence: parsedResult.confidence,
        parsingType: parsedResult.parsingType,
        timestamp: new Date(),
        tokensUsed: response.usage?.total_tokens || this.estimateTokens(prompt + text),
        processingTime: Date.now() - startTime,
        rawData: parsedResult.rawData
      };

      // Cache the result
      this.setCacheEntry(cacheKey, emailResponse, 120); // Cache for 2 hours
      
      // Track usage
      this.trackUsage('email_parsing', emailResponse.tokensUsed || 0, emailResponse.processingTime || 0);

      return emailResponse;

    } catch (error) {
      this.trackUsage('email_parsing', 0, Date.now() - startTime, true);
      
      return {
        success: false,
        confidence: 0,
        parsingType: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };
    }
  }

  // Test connection implementation
  async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'OpenRouter API key not configured'
        };
      }

      // Simple test prompt
      const testPrompt = 'Respond with just "OK" to confirm the connection is working.';
      const response = await this.makeAPIRequest(testPrompt);
      const text = response.choices[0]?.message?.content?.trim() || '';

      const latency = Date.now() - startTime;

      if (text.includes('OK') || text.includes('ok')) {
        return {
          success: true,
          latency
        };
      } else {
        return {
          success: false,
          error: `Unexpected response: ${text}`,
          latency
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        latency: Date.now() - startTime
      };
    }
  }

  // Private helper methods

  private async makeAPIRequest(prompt: string): Promise<any> {
    const apiKey = this.config.apiKey || ApiKeyStorage.getApiKeyWithFallback('openrouter');
    
    if (!apiKey) {
      throw new Error('OpenRouter API key not found');
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://investra.com',
        'X-Title': 'Investra AI Portfolio Tracker',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens || 8192,
        temperature: this.config.temperature || 0.1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  private buildSymbolLookupPrompt(request: SymbolLookupRequest): string {
    const maxResults = request.maxResults || 5;
    const includeAnalysis = request.includeAnalysis || false;
    
    return `You are a financial markets expert. I need you to find stock symbols based on the following query.

Query: "${request.query}"
${request.context ? `Context: ${request.context}` : ''}

Please provide up to ${maxResults} relevant stock symbols. For each symbol, provide the following information in JSON format:

{
  "results": [
    {
      "symbol": "STOCK_SYMBOL",
      "name": "Company/Asset Name",
      "exchange": "EXCHANGE_CODE",
      "assetType": "stock|etf|crypto|forex|reit|option",
      "confidence": 0.95,
      "description": "Brief description",
      "sector": "Technology",
      "industry": "Software",
      "marketCap": 1000000000,
      "currency": "USD"
    }
  ]
}

Rules:
1. Only return real, tradeable symbols
2. Confidence should be between 0 and 1
3. Asset types: stock, etf, crypto, forex, reit, option
4. Include major exchanges (NYSE, NASDAQ, etc.)
5. Sort by confidence (highest first)
${includeAnalysis ? '6. Include brief investment insights if requested' : ''}

Return only valid JSON, no additional text.`;
  }

  private buildEmailParsingPrompt(request: EmailParsingRequest): string {
    return `You are an expert financial data extraction specialist. I need you to analyze an email and extract trading/transaction information.

Email Details:
Subject: "${request.emailSubject}"
From: ${request.emailFrom || 'Unknown'}
Received: ${request.receivedAt || 'Unknown'}

Email Content:
${request.emailContent}

${request.context ? `Additional Context: ${request.context}` : ''}

Your task is to extract trading transaction data from this email. Please analyze the content and return a JSON response with the following structure:

{
  "success": true,
  "extractedData": {
    "portfolioName": "string (e.g., TFSA, RRSP, Margin, etc.)",
    "symbol": "string (for stocks: AAPL, NVDA; for options: full Yahoo format like NVDA250523C00140000)",
    "assetType": "stock" | "option",
    "transactionType": "buy" | "sell", 
    "quantity": number,
    "price": number,
    "totalAmount": number,
    "fees": number,
    "currency": "string (USD, CAD, etc.)",
    "transactionDate": "YYYY-MM-DD",
    "notes": "string (any additional relevant info)"
  },
  "confidence": 0.95,
  "parsingType": "trading" | "basic" | "unknown",
  "rawData": {
    "emailSubject": "${request.emailSubject}",
    "extractedText": "relevant portions of email used for extraction"
  }
}

Rules for extraction:
1. Portfolio names: Look for account types like TFSA, RRSP, RSP, Margin, Cash, Investment Account
2. Symbols: 
   - For STOCKS: Use ticker symbols (AAPL, NVDA, TD.TO, etc.)
   - For OPTIONS: Use full Yahoo Finance format: [TICKER][YYMMDD][C/P][STRIKE_PRICE_8_DIGITS]
     Examples: NVDA250523C00140000 (NVDA Call $140 exp 05/23/25), AAPL241220P00150000 (AAPL Put $150 exp 12/20/24)
3. Asset types: Determine if it's a stock or option based on keywords like "call", "put", "option", "contract", expiration dates
4. Transaction types: Identify buy/sell from words like bought, sold, purchase, sale, order filled
5. Quantities: Extract number of shares or contracts
6. Price: Extract price per share/contract 
7. Total amount: Calculate or extract total transaction value
8. Fees: Extract commission, trading fees, regulatory fees
   - For OPTIONS ONLY: If no fees are explicitly mentioned, calculate as quantity * 0.75 (standard options fee per contract)
   - For STOCKS: Use only explicitly mentioned fees
9. Currency: Default to USD unless specified (CAD, EUR, etc.)
10. Date: Convert any date format to YYYY-MM-DD
11. Confidence: Rate 0-1 based on how certain you are about the extracted data
12. Parsing type: "trading" for stock/option trades, "basic" for simple transactions, "unknown" if unclear

Important notes:
- If this doesn't appear to be a trading/financial email, set confidence to 0 and parsingType to "unknown"
- Only include fields where you have high confidence in the extracted value
- For options, quantity represents number of contracts (may need conversion from shares)
- Include relevant context in notes field
- Be conservative with confidence scores - only use >0.8 if you're very certain

CRITICAL FOR OPTIONS:
- If you detect an option transaction, you MUST construct the full Yahoo Finance symbol format
- Look for: underlying ticker, expiration date, call/put type, strike price
- Format: [TICKER][YYMMDD][C/P][STRIKE_8_DIGITS]
- Strike price format: pad with zeros to 8 digits, last 3 digits are decimals
- Examples: $140.00 → 00140000, $15.50 → 00015500, $1000.00 → 01000000
- If you cannot determine all option details, set assetType to "stock" and use underlying ticker only

CRITICAL FOR OPTIONS FEES:
- When assetType is "option" and no explicit fees are mentioned in the email, ALWAYS calculate fees as: quantity * 0.75
- Example: If quantity is 10 contracts and no fees are mentioned, set fees to 7.50 (10 * 0.75)
- Only use the 0.75 per contract fee for options when fees are not explicitly stated
- If fees are explicitly mentioned in the email, use those instead of the calculated amount

Return only valid JSON, no additional text.`;
  }

  private buildFinancialAnalysisPrompt(request: FinancialAnalysisRequest): string {
    return request.prompt;
  }

  private parseSymbolLookupResponse(text: string): SymbolLookupResult[] {
    try {
      // Clean up the response text
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      if (parsed.results && Array.isArray(parsed.results)) {
        return parsed.results.map((result: unknown) => {
          const typedResult = result as Record<string, unknown>;
          return {
            symbol: (typedResult.symbol as string) || '',
            name: (typedResult.name as string) || '',
            exchange: (typedResult.exchange as string) || '',
            assetType: this.normalizeAssetType((typedResult.assetType as string) || 'stock'),
            confidence: Math.max(0, Math.min(1, (typedResult.confidence as number) || 0)),
            description: (typedResult.description as string) || '',
            sector: (typedResult.sector as string) || '',
            industry: (typedResult.industry as string) || '',
            marketCap: typedResult.marketCap as number || undefined,
            currency: (typedResult.currency as string) || 'USD'
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to parse symbol lookup response:', error);
      console.error('Response text:', text);
      return [];
    }
  }

  private parseEmailParsingResponse(text: string, request: EmailParsingRequest): {
    extractedData?: EmailParsingExtractedData;
    confidence: number;
    parsingType: 'trading' | 'basic' | 'unknown';
    rawData?: any;
  } {
    try {
      // Clean up the response text
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      // Validate and normalize extracted data
      const extractedData: EmailParsingExtractedData = {};
      
      if (parsed.extractedData) {
        const data = parsed.extractedData;
        
        // Validate and assign each field
        if (data.portfolioName && typeof data.portfolioName === 'string') {
          extractedData.portfolioName = data.portfolioName.trim();
        }
        
        if (data.symbol && typeof data.symbol === 'string') {
          extractedData.symbol = data.symbol.toUpperCase().trim();
        }
        
        if (data.assetType && ['stock', 'option'].includes(data.assetType)) {
          extractedData.assetType = data.assetType;
        }
        
        if (data.transactionType && ['buy', 'sell'].includes(data.transactionType)) {
          extractedData.transactionType = data.transactionType;
        }
        
        if (data.quantity && typeof data.quantity === 'number' && data.quantity > 0) {
          extractedData.quantity = data.quantity;
        }
        
        if (data.price && typeof data.price === 'number' && data.price > 0) {
          extractedData.price = data.price;
        }
        
        if (data.totalAmount && typeof data.totalAmount === 'number') {
          extractedData.totalAmount = data.totalAmount;
        }
        
        if (data.fees && typeof data.fees === 'number' && data.fees >= 0) {
          extractedData.fees = data.fees;
        }
        
        if (data.currency && typeof data.currency === 'string') {
          extractedData.currency = data.currency.toUpperCase().trim();
        }
        
        // Validate date format (YYYY-MM-DD)
        if (data.transactionDate && typeof data.transactionDate === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(data.transactionDate)) {
            extractedData.transactionDate = data.transactionDate;
          }
        }
        
        if (data.notes && typeof data.notes === 'string') {
          extractedData.notes = data.notes.trim();
        }
      }
      
      // Validate confidence (0-1)
      let confidence = 0;
      if (parsed.confidence && typeof parsed.confidence === 'number') {
        confidence = Math.max(0, Math.min(1, parsed.confidence));
      }
      
      // Validate parsing type
      let parsingType: 'trading' | 'basic' | 'unknown' = 'unknown';
      if (parsed.parsingType && ['trading', 'basic', 'unknown'].includes(parsed.parsingType)) {
        parsingType = parsed.parsingType;
      }
      
      // Determine parsing type based on extracted data if not explicitly set
      if (parsingType === 'unknown' && Object.keys(extractedData).length > 0) {
        if (extractedData.symbol && extractedData.transactionType && extractedData.quantity) {
          parsingType = 'trading';
        } else {
          parsingType = 'basic';
        }
      }
      
      return {
        extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
        confidence,
        parsingType,
        rawData: {
          emailSubject: request.emailSubject,
          aiResponse: parsed,
          extractedText: request.emailContent.substring(0, 500) // First 500 chars for audit
        }
      };
      
    } catch (error) {
      console.error('Failed to parse email parsing response:', error);
      console.error('Response text:', text);
      
      // Return fallback response
      return {
        confidence: 0,
        parsingType: 'unknown',
        rawData: {
          emailSubject: request.emailSubject,
          parseError: error instanceof Error ? error.message : 'Unknown parsing error',
          originalResponse: text
        }
      };
    }
  }

  private parseFinancialAnalysisResponse(text: string, request: FinancialAnalysisRequest): FinancialAnalysisResult {
    try {
      // Clean up the response text
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      return {
        symbol: (parsed.symbol || request.symbol || '') as string,
        analysisType: (parsed.analysisType || request.analysisType || '') as string,
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        score: Math.max(1, Math.min(10, parsed.score || 5)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
        timeframe: parsed.timeframe || request.timeframe || 'Current',
        metadata: parsed.metadata || {}
      };
    } catch (error) {
      console.error('Failed to parse financial analysis response:', error);
      console.error('Response text:', text);
      
      // Return default response
      return {
        symbol: request.symbol,
        analysisType: request.analysisType,
        insights: ['Unable to generate analysis due to parsing error'],
        score: 5,
        confidence: 0.1,
        recommendations: ['Please try again with different parameters'],
        riskLevel: 'medium',
        timeframe: request.timeframe || 'Current',
        metadata: {}
      };
    }
  }

  private normalizeAssetType(assetType: string): AssetType {
    const type = assetType?.toLowerCase();
    
    switch (type) {
      case 'stock':
      case 'equity':
        return 'stock';
      case 'etf':
      case 'fund':
        return 'etf';
      case 'crypto':
      case 'cryptocurrency':
        return 'crypto';
      case 'forex':
      case 'currency':
        return 'forex';
      case 'reit':
        return 'reit';
      case 'option':
        return 'option';
      default:
        return 'stock';
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
}