import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSymbolLookup, useSymbolValidation } from '../hooks/useSymbolLookup';
import type { 
  SymbolLookupEndpointResponse,
  SymbolLookupEndpointError 
} from '../services/endpoints/symbolLookupEndpoint';

// Mock the symbol lookup endpoint
const mockSymbolLookupEndpoint = {
  lookupSymbol: vi.fn(),
  getHealth: vi.fn(),
  getUsageStats: vi.fn(),
};

vi.mock('../services/endpoints/symbolLookupEndpoint', () => ({
  symbolLookupEndpoint: mockSymbolLookupEndpoint
}));

describe('useSymbolLookup', () => {
  const mockSuccessResponse: SymbolLookupEndpointResponse = {
    success: true,
    data: {
      matches: [
        {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          confidence: 0.95,
          exchange: 'NASDAQ',
          currency: 'USD'
        }
      ],
      suggestions: [
        {
          symbol: 'AMZN',
          reason: 'Alternative large tech stock',
          confidence: 0.8
        }
      ]
    },
    metadata: {
      requestId: 'test-123',
      timestamp: new Date().toISOString(),
      processingTime: 250,
      provider: 'gemini',
      rateLimitRemaining: 99,
      rateLimitReset: new Date(Date.now() + 3600000).toISOString(),
      cached: false
    }
  };

  const mockError: SymbolLookupEndpointError = {
    code: 'VALIDATION_ERROR',
    message: 'Invalid query provided',
    retryable: false,
    details: {
      userMessage: 'Please enter a valid stock symbol'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSymbolLookupEndpoint.lookupSymbol.mockResolvedValue(mockSuccessResponse);
    mockSymbolLookupEndpoint.getHealth.mockResolvedValue({
      status: 'healthy',
      uptime: 3600,
      providers: []
    });
    mockSymbolLookupEndpoint.getUsageStats.mockResolvedValue({
      totalRequests: 100,
      successfulRequests: 95,
      errorCount: 5
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useSymbolLookup());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toBe(null);
      expect(result.current.rateLimitInfo).toBe(null);
    });

    it('should perform symbol lookup successfully', async () => {
      const { result } = renderHook(() => useSymbolLookup());

      await act(async () => {
        await result.current.lookupSymbol({
          query: 'AAPL',
          options: { maxSuggestions: 5 }
        });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual(mockSuccessResponse);
      expect(result.current.rateLimitInfo).toMatchObject({
        remainingRequests: 99,
        resetTime: expect.any(String),
        dailyLimitReached: false,
        hourlyLimitReached: false
      });
    });

    it('should handle loading state correctly', async () => {
      const { result } = renderHook(() => useSymbolLookup());

      // Make the mock promise not resolve immediately
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockSymbolLookupEndpoint.lookupSymbol.mockReturnValue(pendingPromise);

      act(() => {
        result.current.lookupSymbol({
          query: 'AAPL',
          options: { maxSuggestions: 5 }
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockSuccessResponse);
        await pendingPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors correctly', async () => {
      mockSymbolLookupEndpoint.lookupSymbol.mockRejectedValue(mockError);
      const { result } = renderHook(() => useSymbolLookup());

      await act(async () => {
        try {
          await result.current.lookupSymbol({
            query: '',
            options: { maxSuggestions: 5 }
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBe(null);
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useSymbolLookup({ onSuccess }));

      await act(async () => {
        await result.current.lookupSymbol({
          query: 'AAPL',
          options: { maxSuggestions: 5 }
        });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockSuccessResponse);
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      mockSymbolLookupEndpoint.lookupSymbol.mockRejectedValue(mockError);
      const { result } = renderHook(() => useSymbolLookup({ onError }));

      await act(async () => {
        try {
          await result.current.lookupSymbol({
            query: '',
            options: { maxSuggestions: 5 }
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const retryableError: SymbolLookupEndpointError = {
        code: 'AI_SERVICE_ERROR',
        message: 'Temporary service error',
        retryable: true
      };

      mockSymbolLookupEndpoint.lookupSymbol
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useSymbolLookup({
        retryOnFailure: true,
        maxRetries: 3
      }));

      await act(async () => {
        await result.current.lookupSymbol({
          query: 'AAPL',
          options: { maxSuggestions: 5 }
        });
      });

      // Should have called the endpoint 3 times (original + 2 retries)
      expect(mockSymbolLookupEndpoint.lookupSymbol).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual(mockSuccessResponse);
      expect(result.current.retryCount).toBe(0); // Reset after success
    });

    it('should not retry on non-retryable errors', async () => {
      mockSymbolLookupEndpoint.lookupSymbol.mockRejectedValue(mockError);
      const { result } = renderHook(() => useSymbolLookup({
        retryOnFailure: true,
        maxRetries: 3
      }));

      await act(async () => {
        try {
          await result.current.lookupSymbol({
            query: '',
            options: { maxSuggestions: 5 }
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockSymbolLookupEndpoint.lookupSymbol).toHaveBeenCalledTimes(1);
      expect(result.current.error).toEqual(mockError);
    });

    it('should respect maxRetries limit', async () => {
      const retryableError: SymbolLookupEndpointError = {
        code: 'AI_SERVICE_ERROR',
        message: 'Temporary service error',
        retryable: true
      };

      mockSymbolLookupEndpoint.lookupSymbol.mockRejectedValue(retryableError);
      const { result } = renderHook(() => useSymbolLookup({
        retryOnFailure: true,
        maxRetries: 2
      }));

      await act(async () => {
        try {
          await result.current.lookupSymbol({
            query: 'AAPL',
            options: { maxSuggestions: 5 }
          });
        } catch (error) {
          // Expected to throw after max retries
        }
      });

      expect(mockSymbolLookupEndpoint.lookupSymbol).toHaveBeenCalledTimes(3); // Original + 2 retries
      expect(result.current.error).toEqual(retryableError);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      const rateLimitError: SymbolLookupEndpointError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Hourly rate limit exceeded',
        retryable: true,
        details: {
          limitType: 'hourly',
          resetTime: new Date(Date.now() + 3600000).toISOString()
        }
      };

      mockSymbolLookupEndpoint.lookupSymbol.mockRejectedValue(rateLimitError);
      const { result } = renderHook(() => useSymbolLookup());

      await act(async () => {
        try {
          await result.current.lookupSymbol({
            query: 'AAPL',
            options: { maxSuggestions: 5 }
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isRateLimited).toBe(true);
      expect(result.current.rateLimitInfo).toMatchObject({
        remainingRequests: 0,
        resetTime: expect.any(String),
        hourlyLimitReached: true,
        dailyLimitReached: false
      });
    });
  });

  describe('Utility Methods', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useSymbolLookup());

      act(() => {
        // Set error state manually for testing
        (result.current as any).error = mockError;
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should clear data state', () => {
      const { result } = renderHook(() => useSymbolLookup());

      act(() => {
        // Set data state manually for testing
        (result.current as any).data = mockSuccessResponse;
      });

      act(() => {
        result.current.clearData();
      });

      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should get health status', async () => {
      const { result } = renderHook(() => useSymbolLookup());

      let health: any;
      await act(async () => {
        health = await result.current.checkHealth();
      });

      expect(health).toMatchObject({
        status: 'healthy',
        uptime: 3600,
        providers: []
      });
    });

    it('should get usage statistics', async () => {
      const { result } = renderHook(() => useSymbolLookup());

      let stats: any;
      await act(async () => {
        stats = await result.current.getUsageStats();
      });

      expect(stats).toMatchObject({
        totalRequests: 100,
        successfulRequests: 95,
        errorCount: 5
      });
    });
  });

  describe('Cleanup', () => {
    it('should cancel ongoing requests', async () => {
      const { result } = renderHook(() => useSymbolLookup());

      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockSymbolLookupEndpoint.lookupSymbol.mockReturnValue(pendingPromise);

      act(() => {
        result.current.lookupSymbol({
          query: 'AAPL',
          options: { maxSuggestions: 5 }
        });
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useSymbolValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate symbols correctly', async () => {
    // Mock successful validation response
    mockSymbolLookupEndpoint.lookupSymbol.mockResolvedValue({
      ...mockSuccessResponse,
      data: {
        matches: [mockSuccessResponse.data.matches[0]],
        suggestions: []
      }
    });

    const { result } = renderHook(() => useSymbolValidation());

    let isValid: boolean;
    await act(async () => {
      isValid = await result.current.validateSymbol('AAPL');
    });

    expect(isValid!).toBe(true);
    expect(mockSymbolLookupEndpoint.lookupSymbol).toHaveBeenCalledWith({
      query: 'AAPL',
      options: {
        includeAlternatives: false,
        maxSuggestions: 1
      }
    });
  });

  it('should return false for invalid symbols', async () => {
    mockSymbolLookupEndpoint.lookupSymbol.mockResolvedValue({
      ...mockSuccessResponse,
      data: {
        matches: [],
        suggestions: []
      }
    });

    const { result } = renderHook(() => useSymbolValidation());

    let isValid: boolean;
    await act(async () => {
      isValid = await result.current.validateSymbol('INVALID');
    });

    expect(isValid!).toBe(false);
  });

  it('should get symbol suggestions', async () => {
    mockSymbolLookupEndpoint.lookupSymbol.mockResolvedValue(mockSuccessResponse);

    const { result } = renderHook(() => useSymbolValidation());

    let suggestions: string[];
    await act(async () => {
      suggestions = await result.current.getSuggestions('APP');
    });

    expect(suggestions!).toEqual(['AMZN']);
    expect(mockSymbolLookupEndpoint.lookupSymbol).toHaveBeenCalledWith({
      query: 'APP',
      options: {
        includeAlternatives: true,
        maxSuggestions: 5
      }
    });
  });

  it('should handle empty queries', async () => {
    const { result } = renderHook(() => useSymbolValidation());

    let isValid: boolean;
    await act(async () => {
      isValid = await result.current.validateSymbol('');
    });

    expect(isValid!).toBe(false);
    expect(mockSymbolLookupEndpoint.lookupSymbol).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockSymbolLookupEndpoint.lookupSymbol.mockRejectedValue(new Error('Service error'));

    const { result } = renderHook(() => useSymbolValidation());

    let suggestions: string[];
    await act(async () => {
      suggestions = await result.current.getSuggestions('AAPL');
    });

    expect(suggestions!).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
