/**
 * Gemini AI Service Implementation
 * Task 18: Gemini AI Service Layer Integration
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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
  FinancialAnalysisResult
} from '../../types/ai';

export class GeminiAIService extends BaseAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor(config: AIServiceConfig) {
    super(config);
    this.initializeGemini();
  }

  get provider(): AIProvider {
    return 'gemini';
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

      if (!this.model) {
        throw this.createError(
          'MODEL_NOT_INITIALIZED',
          'Gemini model is not properly initialized',
          'api_error'
        );
      }

      const prompt = this.buildSymbolLookupPrompt(request);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsedResults = this.parseSymbolLookupResponse(text);
      const symbolResponse: SymbolLookupResponse = {
        success: true,
        results: parsedResults,
        timestamp: new Date(),
        tokensUsed: this.estimateTokens(prompt + text),
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

      if (!this.model) {
        throw this.createError(
          'MODEL_NOT_INITIALIZED',
          'Gemini model is not properly initialized',
          'api_error'
        );
      }

      const prompt = this.buildFinancialAnalysisPrompt(request);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsedResult = this.parseFinancialAnalysisResponse(text, request);
      const analysisResponse: FinancialAnalysisResponse = {
        success: true,
        result: parsedResult,
        timestamp: new Date(),
        tokensUsed: this.estimateTokens(prompt + text),
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

  // Test connection implementation
  async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Gemini API key not configured'
        };
      }

      if (!this.model) {
        this.initializeGemini();
        if (!this.model) {
          return {
            success: false,
            error: 'Failed to initialize Gemini model'
          };
        }
      }

      // Simple test prompt
      const testPrompt = 'Respond with just "OK" to confirm the connection is working.';
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text().trim();

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

  private initializeGemini(): void {
    // Try to get API key from config, localStorage, or environment
    let apiKey = this.config.apiKey;
    
    if (!apiKey) {
      apiKey = ApiKeyStorage.getApiKeyWithFallback('gemini') || '';
    }
    
    if (!apiKey) {
      console.warn('Gemini API key not provided. Using mock responses.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      const modelName = this.config.model || 'gemini-1.5-flash';
      
      const generationConfig = {
        temperature: this.config.temperature || 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: this.config.maxTokens || 8192,
      };

      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig
      });

      console.log('Gemini AI initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
      this.genAI = null;
      this.model = null;
    }
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

  private buildFinancialAnalysisPrompt(request: FinancialAnalysisRequest): string {
    const { symbol, data, analysisType, timeframe } = request;
    
    return `You are a financial analyst. Analyze the following data for ${symbol}:

Analysis Type: ${analysisType}
Timeframe: ${timeframe || 'Current'}
Symbol: ${symbol}

Data:
${data.prices ? `Prices: ${data.prices.slice(-20).join(', ')}` : ''}
${data.volumes ? `Volumes: ${data.volumes.slice(-20).join(', ')}` : ''}
${data.marketData ? `Market Data: ${JSON.stringify(data.marketData, null, 2)}` : ''}
${data.newsData ? `Recent News: ${data.newsData.slice(0, 3).join(' | ')}` : ''}
${data.fundamentals ? `Fundamentals: ${JSON.stringify(data.fundamentals, null, 2)}` : ''}

Please provide analysis in the following JSON format:

{
  "symbol": "${symbol}",
  "analysisType": "${analysisType}",
  "insights": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  "score": 7.5,
  "confidence": 0.85,
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ],
  "riskLevel": "medium",
  "timeframe": "${timeframe || 'Current'}",
  "metadata": {
    "keyMetrics": {},
    "technicalIndicators": {},
    "fundamentalRatios": {}
  }
}

Rules:
1. Score should be 1-10 scale
2. Confidence should be 0-1 scale
3. Risk level: low, medium, high
4. Provide actionable insights
5. Include relevant metrics in metadata

Return only valid JSON, no additional text.`;
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

  private parseFinancialAnalysisResponse(text: string, request: FinancialAnalysisRequest): FinancialAnalysisResult {
    try {
      // Clean up the response text
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      return {
        symbol: parsed.symbol || request.symbol,
        analysisType: parsed.analysisType || request.analysisType,
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
