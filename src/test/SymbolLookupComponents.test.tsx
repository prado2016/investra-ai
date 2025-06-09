import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SymbolLookupComponent from '../components/SymbolLookupComponent';
import SymbolInputWithAI from '../components/SymbolInputWithAI';
import type { SymbolLookupEndpointResponse } from '../services/endpoints/symbolLookupEndpoint';

// Mock the hooks
const mockUseSymbolLookup = {
  isLoading: false,
  error: null,
  data: null,
  rateLimitInfo: null,
  lookupSymbol: vi.fn(),
  clearError: vi.fn(),
  clearData: vi.fn(),
  cancel: vi.fn(),
  checkHealth: vi.fn(),
  getUsageStats: vi.fn(),
  canRetry: false,
  retryCount: 0,
  isRateLimited: false,
};

const mockUseSymbolValidation = {
  validateSymbol: vi.fn(),
  getSuggestions: vi.fn(),
  isLoading: false,
  error: null,
};

vi.mock('../hooks/useSymbolLookup', () => ({
  useSymbolLookup: () => mockUseSymbolLookup,
  useSymbolValidation: () => mockUseSymbolValidation,
}));

describe('SymbolLookupComponent', () => {
  const mockResponse: SymbolLookupEndpointResponse = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockUseSymbolLookup, {
      isLoading: false,
      error: null,
      data: null,
      rateLimitInfo: null,
      canRetry: false,
      retryCount: 0,
      isRateLimited: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default placeholder', () => {
      render(<SymbolLookupComponent />);
      
      expect(screen.getByPlaceholderText(/enter stock symbol/i)).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<SymbolLookupComponent placeholder="Search for symbols..." />);
      
      expect(screen.getByPlaceholderText('Search for symbols...')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<SymbolLookupComponent disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should trigger lookup on input change', async () => {
      const user = userEvent.setup();
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'AAPL');
      
      // Should debounce and then call lookup
      await waitFor(() => {
        expect(mockUseSymbolLookup.lookupSymbol).toHaveBeenCalledWith({
          query: 'AAPL',
          options: {
            includeAlternatives: true,
            maxSuggestions: 8,
          },
        });
      }, { timeout: 1000 });
    });

    it('should not trigger lookup for short queries', async () => {
      const user = userEvent.setup();
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'A');
      
      // Wait and ensure lookup was not called
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(mockUseSymbolLookup.lookupSymbol).not.toHaveBeenCalled();
    });

    it('should call onSymbolSelect when symbol is selected', async () => {
      const onSymbolSelect = vi.fn();
      const user = userEvent.setup();
      
      // Set up mock data
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      render(<SymbolLookupComponent onSymbolSelect={onSymbolSelect} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'AAPL');
      
      // Focus to show results
      await user.click(input);
      
      // Click on the first match
      const symbolButton = screen.getByText('AAPL');
      await user.click(symbolButton);
      
      expect(onSymbolSelect).toHaveBeenCalledWith('AAPL', mockResponse.data.matches[0]);
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when loading', () => {
      Object.assign(mockUseSymbolLookup, {
        isLoading: true,
      });
      
      render(<SymbolLookupComponent />);
      
      expect(screen.getByRole('textbox')).toBeDisabled();
      // Loading spinner should be present (div with animate-spin class)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      Object.assign(mockUseSymbolLookup, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid symbol',
          retryable: false,
        },
      });
      
      render(<SymbolLookupComponent />);
      
      expect(screen.getByText('Invalid symbol')).toBeInTheDocument();
    });

    it('should show retry button for retryable errors', () => {
      Object.assign(mockUseSymbolLookup, {
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'Service temporarily unavailable',
          retryable: true,
        },
        canRetry: true,
        retryCount: 1,
      });
      
      render(<SymbolLookupComponent />);
      
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();
    });

    it('should display rate limit warning', () => {
      Object.assign(mockUseSymbolLookup, {
        rateLimitInfo: {
          hourlyLimitReached: true,
          resetTime: '15:30:00',
          remainingRequests: 0,
          dailyLimitReached: false,
        },
      });
      
      render(<SymbolLookupComponent />);
      
      expect(screen.getByText(/hourly rate limit reached/i)).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('should display exact matches', () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      render(<SymbolLookupComponent />);
      
      // Input some text to trigger showing results
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(screen.getByText('Exact Matches')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should display suggestions when enabled', () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      render(<SymbolLookupComponent showSuggestions={true} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('AMZN')).toBeInTheDocument();
    });

    it('should hide suggestions when disabled', () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      render(<SymbolLookupComponent showSuggestions={false} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
    });

    it('should display no results message', () => {
      Object.assign(mockUseSymbolLookup, {
        data: {
          ...mockResponse,
          data: {
            matches: [],
            suggestions: [],
          },
        },
      });
      
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(screen.getByText(/no symbols found/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate results with arrow keys', async () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      const user = userEvent.setup();
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      // Arrow down should select first item
      await user.keyboard('{ArrowDown}');
      
      // Enter should select the highlighted item
      await user.keyboard('{Enter}');
      
      // Should update input value
      expect(input).toHaveValue('AAPL');
    });

    it('should close results with Escape key', async () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      const user = userEvent.setup();
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      // Results should be visible
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      
      // Results should be hidden
      expect(screen.queryByText('Exact Matches')).not.toBeInTheDocument();
    });
  });

  describe('Confidence Indicators', () => {
    it('should display confidence percentages', () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('should show response metadata in footer', () => {
      Object.assign(mockUseSymbolLookup, {
        data: mockResponse,
      });
      
      render(<SymbolLookupComponent />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(screen.getByText(/response time: 250ms/i)).toBeInTheDocument();
      expect(screen.getByText(/requests remaining: 99/i)).toBeInTheDocument();
    });
  });
});

describe('SymbolInputWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockUseSymbolValidation, {
      isLoading: false,
      error: null,
    });
  });

  describe('Basic Functionality', () => {
    it('should render input field', () => {
      const onChange = vi.fn();
      render(<SymbolInputWithAI value="" onChange={onChange} />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should call onChange with uppercase value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<SymbolInputWithAI value="" onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'aapl');
      
      expect(onChange).toHaveBeenCalledWith('A');
      expect(onChange).toHaveBeenCalledWith('AA');
      expect(onChange).toHaveBeenCalledWith('AAP');
      expect(onChange).toHaveBeenCalledWith('AAPL');
    });

    it('should validate symbol on blur', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      mockUseSymbolValidation.validateSymbol.mockResolvedValue(true);
      
      render(<SymbolInputWithAI value="AAPL" onChange={onChange} validateOnBlur />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab(); // Blur the input
      
      await waitFor(() => {
        expect(mockUseSymbolValidation.validateSymbol).toHaveBeenCalledWith('AAPL');
      });
    });
  });

  describe('Validation States', () => {
    it('should show loading state during validation', () => {
      Object.assign(mockUseSymbolValidation, {
        isLoading: true,
      });
      
      const onChange = vi.fn();
      render(<SymbolInputWithAI value="AAPL" onChange={onChange} showValidation />);
      
      // Should show loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show valid state for valid symbols', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      mockUseSymbolValidation.validateSymbol.mockResolvedValue(true);
      
      render(<SymbolInputWithAI value="" onChange={onChange} showValidation />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'AAPL');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('Valid symbol')).toBeInTheDocument();
      });
    });

    it('should show invalid state for invalid symbols', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      mockUseSymbolValidation.validateSymbol.mockResolvedValue(false);
      
      render(<SymbolInputWithAI value="" onChange={onChange} showValidation />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'INVALID');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('Invalid or unknown symbol')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Complete Suggestions', () => {
    it('should show suggestions for invalid symbols', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      mockUseSymbolValidation.validateSymbol.mockResolvedValue(false);
      mockUseSymbolValidation.getSuggestions.mockResolvedValue(['AAPL', 'AMZN', 'GOOGL']);
      
      render(<SymbolInputWithAI value="" onChange={onChange} autoComplete />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'APP');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('Did you mean:')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('should select suggestion when clicked', async () => {
      const onChange = vi.fn();
      const onValidSymbol = vi.fn();
      const user = userEvent.setup();
      
      mockUseSymbolValidation.validateSymbol.mockResolvedValue(false);
      mockUseSymbolValidation.getSuggestions.mockResolvedValue(['AAPL']);
      
      render(
        <SymbolInputWithAI 
          value="" 
          onChange={onChange} 
          onValidSymbol={onValidSymbol}
          autoComplete 
        />
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'APP');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
      
      const suggestion = screen.getByText('AAPL');
      await user.click(suggestion);
      
      expect(onChange).toHaveBeenCalledWith('AAPL');
      expect(onValidSymbol).toHaveBeenCalledWith('AAPL', true);
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors', () => {
      Object.assign(mockUseSymbolValidation, {
        error: {
          message: 'Service temporarily unavailable',
        },
      });
      
      const onChange = vi.fn();
      render(<SymbolInputWithAI value="AAPL" onChange={onChange} showValidation />);
      
      expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should support required attribute', () => {
      const onChange = vi.fn();
      render(<SymbolInputWithAI value="" onChange={onChange} required />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('should support disabled attribute', () => {
      const onChange = vi.fn();
      render(<SymbolInputWithAI value="" onChange={onChange} disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should have proper ARIA attributes', () => {
      const onChange = vi.fn();
      render(<SymbolInputWithAI value="" onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '10');
    });
  });
});
