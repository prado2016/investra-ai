/**
 * Symbol Lookup Endpoint Service Tests
 * Task 19: AI Symbol Lookup Endpoint Implementation
 * 
 * Tests for the standardized endpoint-like interface for AI-powered symbol lookup
 * with proper authentication, rate limiting, error handling, and logging.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import symbolLookupEndpoint from '../services/endpoints/symbolLookupEndpoint';
import type { SymbolLookupEndpointRequest } from '../services/endpoints/symbolLookupEndpoint';
import type { AIProvider, SymbolLookupResult } from '../types/ai';

// Mock dependencies
vi.mock('../services/ai/aiServiceManager', () => ({
  aiServiceManager: {
    getService: vi.fn(),
    isProviderAvailable: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../config/aiConfig', () => ({
  validateRequest: vi.fn().mockReturnValue({ valid: true })
}));

vi.mock('../services/apiKeyService', () => ({
  ApiKeyService: {
    getInstance: vi.fn().mockReturnValue({
      getApiKey: vi.fn().mockResolvedValue({ key: 'test-key', isValid: true })
    })
  }
}));

describe('SymbolLookupEndpointService', () => {
  
  const mockRequest: SymbolLookupEndpointRequest = {
    query: 'AAPL',
    maxResults: 5,
    assetTypes: ['stock'],
    region: 'US',
    provider: 'gemini' as AIProvider
  };

  const mockSymbolResult: SymbolLookupResult = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    assetType: 'stock',
    confidence: 0.95,
    currency: 'USD'
  };

  const mockAIService = {
    searchSymbol: vi.fn().mockResolvedValue({
      success: true,
      results: [mockSymbolResult],
      query: 'AAPL',
      totalFound: 1,
      provider: 'gemini',
      cached: false
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AI service manager
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { aiServiceManager } = require('../services/ai/aiServiceManager');
    vi.mocked(aiServiceManager.getService).mockResolvedValue(mockAIService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should have lookup method', () => {
      expect(typeof symbolLookupEndpoint.lookup).toBe('function');
    });

    it('should be callable', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');
    });
  });

  describe('Request Validation', () => {
    it('should validate required query parameter', async () => {
      const request: SymbolLookupEndpointRequest = {
        query: '',
      };

      const response = await symbolLookupEndpoint.lookup(request);
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_REQUEST');
    });

    it('should accept valid request', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.success).toBe(true);
      expect(response.data?.results).toHaveLength(1);
      expect(response.data?.results[0].symbol).toBe('AAPL');
    });

    it('should handle maxResults parameter', async () => {
      const request: SymbolLookupEndpointRequest = {
        query: 'AAPL',
        maxResults: 3
      };

      const response = await symbolLookupEndpoint.lookup(request);
      expect(response.success).toBe(true);
    });

    it('should handle assetTypes filter', async () => {
      const request: SymbolLookupEndpointRequest = {
        query: 'AAPL',
        assetTypes: ['stock', 'etf']
      };

      const response = await symbolLookupEndpoint.lookup(request);
      expect(response.success).toBe(true);
    });

    it('should handle region parameter', async () => {
      const request: SymbolLookupEndpointRequest = {
        query: 'AAPL',
        region: 'US'
      };

      const response = await symbolLookupEndpoint.lookup(request);
      expect(response.success).toBe(true);
    });

    it('should handle includeInactive parameter', async () => {
      const request: SymbolLookupEndpointRequest = {
        query: 'AAPL',
        includeInactive: true
      };

      const response = await symbolLookupEndpoint.lookup(request);
      expect(response.success).toBe(true);
    });
  });

  describe('Provider Management', () => {
    it('should handle provider specification', async () => {
      const request: SymbolLookupEndpointRequest = {
        query: 'AAPL',
        provider: 'openai'
      };

      const response = await symbolLookupEndpoint.lookup(request);
      expect(response.success).toBe(true);
    });

    it('should handle provider unavailability', async () => {
      // Mock provider as unavailable
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { aiServiceManager } = require('../services/ai/aiServiceManager');
      vi.mocked(aiServiceManager.getService).mockRejectedValue(new Error('Provider unavailable'));

      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AI_SERVICE_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      // Mock AI service to throw error
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { aiServiceManager } = require('../services/ai/aiServiceManager');
      vi.mocked(aiServiceManager.getService).mockRejectedValue(new Error('AI service error'));

      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AI_SERVICE_ERROR');
      expect(response.error?.retryable).toBe(true);
    });

    it('should handle validation errors', async () => {
      // Mock validation to fail
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateRequest } = require('../../config/aiConfig');
      vi.mocked(validateRequest).mockReturnValue({ valid: false, errors: ['Invalid query'] });

      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_REQUEST');
    });
  });

  describe('Response Formatting', () => {
    it('should return properly formatted response', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);

      expect(response).toMatchObject({
        success: true,
        data: {
          results: expect.arrayContaining([
            expect.objectContaining({
              symbol: expect.any(String),
              name: expect.any(String),
              confidence: expect.any(Number)
            })
          ]),
          query: expect.any(String),
          totalFound: expect.any(Number),
          provider: expect.any(String),
          requestId: expect.any(String),
          timestamp: expect.any(String)
        },
        metadata: expect.objectContaining({
          requestId: expect.any(String),
          timestamp: expect.any(String),
          processingTime: expect.any(Number)
        })
      });
    });

    it('should include rate limit information in metadata', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.metadata.rateLimit).toBeDefined();
      expect(response.metadata.rateLimit.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication', () => {
    it('should handle authentication properly', async () => {
      // The default instance has authentication enabled
      // Mock API key service to return valid key
      const { ApiKeyService } = await import('../services/apiKeyService');
      const mockInstance = ApiKeyService.getInstance();
      vi.mocked(mockInstance.getApiKey).mockResolvedValue({ key: 'valid-key', isValid: true });

      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.success).toBe(true);
    });

    it('should handle missing authentication', async () => {
      // Mock API key service to return no key
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ApiKeyService } = require('../services/apiKeyService');
      const mockInstance = ApiKeyService.getInstance();
      vi.mocked(mockInstance.getApiKey).mockResolvedValue(null);

      const response = await symbolLookupEndpoint.lookup(mockRequest);
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit information', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);
      
      if (response.success) {
        expect(response.metadata.rateLimit).toBeDefined();
        expect(typeof response.metadata.rateLimit.remaining).toBe('number');
        expect(response.metadata.rateLimit.resetTime).toBeDefined();
      }
    });
  });

  describe('Metadata', () => {
    it('should include request metadata', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);
      
      expect(response.metadata).toMatchObject({
        requestId: expect.any(String),
        timestamp: expect.any(String),
        processingTime: expect.any(Number)
      });
    });

    it('should include rate limit metadata', async () => {
      const response = await symbolLookupEndpoint.lookup(mockRequest);
      
      expect(response.metadata.rateLimit).toBeDefined();
      expect(typeof response.metadata.rateLimit.remaining).toBe('number');
    });
  });

  describe('Default Export', () => {
    it('should export a default instance', () => {
      expect(symbolLookupEndpoint).toBeDefined();
      expect(typeof symbolLookupEndpoint.lookup).toBe('function');
    });

    it('should be callable with minimal request', async () => {
      const response = await symbolLookupEndpoint.lookup({
        query: 'AAPL'
      });

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');
    });
  });
});
