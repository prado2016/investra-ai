/**
 * AI Services Test Suite
 * Task 18: Gemini AI Service Layer Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeminiAIService } from '../services/ai/geminiService';
import { AIServiceManager } from '../services/ai/aiServiceManager';
import type { AIServiceConfig, SymbolLookupRequest, FinancialAnalysisRequest } from '../types/ai';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue('{"results": [{"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "assetType": "stock", "confidence": 0.95}]}')
        }
      })
    })
  }))
}));

// Mock API Key Service
vi.mock('../services/apiKeyService', () => ({
  ApiKeyService: {
    getApiKeys: vi.fn().mockResolvedValue([
      {
        id: 'test-key-1',
        provider: 'gemini',
        encrypted_key: btoa('test-api-key'),
        is_active: true
      }
    ])
  }
}));

describe('AI Services', () => {
  let geminiService: GeminiAIService;
  let aiManager: AIServiceManager;
  const mockConfig: AIServiceConfig = {
    provider: 'gemini',
    apiKey: 'test-api-key',
    model: 'gemini-1.5-flash',
    maxTokens: 8192,
    temperature: 0.1,
    timeout: 30000,
    rateLimitPerHour: 100,
    rateLimitPerDay: 1000,
    enableCaching: true,
    cacheExpiryMinutes: 60
  };

  beforeEach(() => {
    vi.clearAllMocks();
    geminiService = new GeminiAIService(mockConfig);
    aiManager = AIServiceManager.getInstance();
  });

  afterEach(() => {
    geminiService.clearCache();
  });

  describe('GeminiAIService', () => {
    it('should initialize with correct provider', () => {
      expect(geminiService.provider).toBe('gemini');
      expect(geminiService.isConfigured).toBe(true);
    });

    it('should lookup symbols successfully', async () => {
      const request: SymbolLookupRequest = {
        query: 'Apple',
        maxResults: 5,
        includeAnalysis: false
      };

      const response = await geminiService.lookupSymbols(request);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(1);
      expect(response.results[0].symbol).toBe('AAPL');
      expect(response.results[0].name).toBe('Apple Inc.');
      expect(response.results[0].confidence).toBe(0.95);
    });

    it('should analyze financial data successfully', async () => {
      // Mock a more specific response for financial analysis
      const mockAnalysisResponse = JSON.stringify({
        symbol: 'AAPL',
        analysisType: 'trend',
        insights: ['Stock shows strong upward momentum', 'High trading volume indicates investor interest'],
        score: 8.5,
        confidence: 0.85,
        recommendations: ['Consider buying on dips', 'Monitor for earnings announcements'],
        riskLevel: 'medium',
        timeframe: '1M',
        metadata: {
          keyMetrics: { rsi: 65, sma: 150.25 },
          technicalIndicators: { trend: 'bullish' }
        }
      });

      vi.mocked(geminiService['model']?.generateContent).mockResolvedValueOnce({
        response: {
          text: () => mockAnalysisResponse
        }
      } as any);

      const request: FinancialAnalysisRequest = {
        symbol: 'AAPL',
        data: {
          prices: [145.50, 147.25, 149.80, 151.20, 150.75],
          volumes: [50000000, 55000000, 48000000, 52000000, 49000000]
        },
        analysisType: 'trend',
        timeframe: '1M'
      };

      const response = await geminiService.analyzeFinancialData(request);

      expect(response.success).toBe(true);
      expect(response.result?.symbol).toBe('AAPL');
      expect(response.result?.analysisType).toBe('trend');
      expect(response.result?.score).toBe(8.5);
      expect(response.result?.riskLevel).toBe('medium');
    });

    it('should test connection successfully', async () => {
      // Mock OK response
      vi.mocked(geminiService['model']?.generateContent).mockResolvedValueOnce({
        response: {
          text: () => 'OK'
        }
      } as any);

      const result = await geminiService.testConnection();

      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should handle rate limiting', async () => {
      // Simulate rate limit exceeded
      for (let i = 0; i < 105; i++) {
        try {
          await geminiService.lookupSymbols({ query: 'test' });
        } catch (error) {
          if (i >= 100) {
            expect(error.message).toContain('Rate limit exceeded');
          }
        }
      }
    });

    it('should cache responses when enabled', async () => {
      const request: SymbolLookupRequest = {
        query: 'Apple',
        maxResults: 5
      };

      // First request
      const response1 = await geminiService.lookupSymbols(request);
      expect(response1.cached).toBeFalsy();

      // Second request should be cached
      const response2 = await geminiService.lookupSymbols(request);
      expect(response2.cached).toBe(true);
    });

    it('should track usage metrics', async () => {
      const request: SymbolLookupRequest = {
        query: 'Apple',
        maxResults: 5
      };

      await geminiService.lookupSymbols(request);

      const metrics = await geminiService.getUsageMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].provider).toBe('gemini');
      expect(metrics[0].endpoint).toBe('symbol_lookup');
    });

    it('should get cache statistics', () => {
      const stats = geminiService.getCacheStats();
      
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('entriesCount');
      expect(stats).toHaveProperty('memoryUsage');
    });
  });

  describe('AIServiceManager', () => {
    it('should initialize service successfully', async () => {
      const success = await aiManager.initializeService('gemini');
      expect(success).toBe(true);
      
      const service = aiManager.getService('gemini');
      expect(service).toBeTruthy();
      expect(service?.provider).toBe('gemini');
    });

    it('should handle symbol lookup through manager', async () => {
      await aiManager.initializeService('gemini');
      
      const request: SymbolLookupRequest = {
        query: 'Apple technology company',
        maxResults: 3
      };

      const response = await aiManager.lookupSymbols(request, 'gemini');
      expect(response.success).toBe(true);
      expect(response.results).toBeDefined();
    });

    it('should handle financial analysis through manager', async () => {
      await aiManager.initializeService('gemini');
      
      // Mock analysis response
      const mockAnalysisResponse = JSON.stringify({
        symbol: 'TSLA',
        analysisType: 'risk',
        insights: ['High volatility stock', 'Strong growth potential'],
        score: 7.2,
        confidence: 0.78,
        recommendations: ['Monitor closely', 'Consider position sizing'],
        riskLevel: 'high',
        timeframe: '3M',
        metadata: {}
      });

      vi.mocked(geminiService['model']?.generateContent).mockResolvedValueOnce({
        response: {
          text: () => mockAnalysisResponse
        }
      } as any);

      const request: FinancialAnalysisRequest = {
        symbol: 'TSLA',
        data: {
          prices: [200, 210, 195, 220, 215],
          volumes: [30000000, 35000000, 25000000, 40000000, 32000000]
        },
        analysisType: 'risk',
        timeframe: '3M'
      };

      const response = await aiManager.analyzeFinancialData(request, 'gemini');
      expect(response.success).toBe(true);
      expect(response.result?.riskLevel).toBe('high');
    });

    it('should test all connections', async () => {
      await aiManager.initializeService('gemini');
      
      // Mock OK response for connection test
      vi.mocked(geminiService['model']?.generateContent).mockResolvedValueOnce({
        response: {
          text: () => 'OK'
        }
      } as any);

      const results = await aiManager.testAllConnections();
      expect(results.gemini.success).toBe(true);
    });

    it('should get health status', async () => {
      await aiManager.initializeService('gemini');
      
      const status = await aiManager.getHealthStatus();
      expect(status.gemini).toBeDefined();
      expect(status.gemini.configured).toBe(true);
    });

    it('should clear all caches', () => {
      aiManager.clearAllCaches();
      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should handle fallback providers', async () => {
      await aiManager.initializeService('gemini');
      
      // Mock the primary service to fail
      vi.mocked(geminiService.lookupSymbols).mockRejectedValueOnce(new Error('Service unavailable'));
      
      const request: SymbolLookupRequest = {
        query: 'Apple',
        maxResults: 5
      };

      const response = await aiManager.lookupSymbols(request, 'gemini');
      // Since we only have Gemini initialized and it fails, we expect an error
      expect(response.success).toBe(false);
      expect(response.error).toContain('Service unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key', () => {
      const invalidConfig: AIServiceConfig = {
        ...mockConfig,
        apiKey: ''
      };
      
      const service = new GeminiAIService(invalidConfig);
      expect(service.isConfigured).toBe(false);
    });

    it('should handle malformed AI responses', async () => {
      // Mock invalid JSON response
      vi.mocked(geminiService['model']?.generateContent).mockResolvedValueOnce({
        response: {
          text: () => 'invalid json response'
        }
      } as any);

      const request: SymbolLookupRequest = {
        query: 'Apple',
        maxResults: 5
      };

      const response = await geminiService.lookupSymbols(request);
      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(0); // Should handle gracefully
    });

    it('should handle network timeouts', async () => {
      // Mock timeout error
      vi.mocked(geminiService['model']?.generateContent).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const request: SymbolLookupRequest = {
        query: 'Apple',
        maxResults: 5
      };

      const response = await geminiService.lookupSymbols(request);
      expect(response.success).toBe(false);
      expect(response.error).toContain('timeout');
    });
  });
});
