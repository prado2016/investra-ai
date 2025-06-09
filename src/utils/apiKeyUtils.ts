/**
 * API Key Utilities for validation, encryption, and testing
 * Task 13: Enhanced API key management utilities
 */

import type { ApiProvider } from '../lib/database/enhanced-types';

/**
 * API Key validation utilities
 */
export class ApiKeyValidator {
  /**
   * Validate API key format based on provider
   */
  static validateKeyFormat(provider: ApiProvider, apiKey: string): { valid: boolean; message: string } {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      return { valid: false, message: 'API key cannot be empty' };
    }

    switch (provider) {
      case 'gemini':
        // Gemini API keys are typically 39 characters long and start with specific patterns
        if (!/^[A-Za-z0-9_-]{20,50}$/.test(trimmedKey)) {
          return { 
            valid: false, 
            message: 'Gemini API keys should be 20-50 alphanumeric characters (including _ and -)' 
          };
        }
        break;

      case 'openai':
        // OpenAI API keys start with "sk-" and are 51 characters long
        if (!trimmedKey.startsWith('sk-') || trimmedKey.length !== 51) {
          return { 
            valid: false, 
            message: 'OpenAI API keys should start with "sk-" and be 51 characters long' 
          };
        }
        break;

      case 'yahoo_finance':
        // Yahoo Finance API keys are typically 32-64 characters alphanumeric
        if (!/^[a-zA-Z0-9]{16,64}$/.test(trimmedKey)) {
          return { 
            valid: false, 
            message: 'Yahoo Finance API keys should be 16-64 alphanumeric characters'
          };
        }
        break;

      case 'perplexity':
        // Perplexity API keys start with "pplx-" and are 56 characters long
        if (!trimmedKey.startsWith('pplx-') || trimmedKey.length !== 56) {
          return { 
            valid: false, 
            message: 'Perplexity API keys should start with "pplx-" and be 56 characters long' 
          };
        }
        break;

      default:
        // Generic validation for unknown providers
        if (trimmedKey.length < 16) {
          return { 
            valid: false, 
            message: 'API key should be at least 16 characters long' 
          };
        }
        break;
    }

    return { valid: true, message: 'API key format is valid' };
  }

  /**
   * Sanitize API key (remove whitespace, etc.)
   */
  static sanitizeApiKey(apiKey: string): string {
    return apiKey.trim().replace(/\s+/g, '');
  }

  /**
   * Mask API key for display (show first 4 and last 4 characters)
   */
  static maskApiKey(apiKey: string, showLength: number = 4): string {
    if (apiKey.length <= showLength * 2) {
      return '•'.repeat(8);
    }
    
    const start = apiKey.substring(0, showLength);
    const end = apiKey.substring(apiKey.length - showLength);
    const middle = '•'.repeat(Math.max(8, apiKey.length - showLength * 2));
    
    return `${start}${middle}${end}`;
  }
}

/**
 * API Key encryption utilities (placeholder for security)
 */
export class ApiKeyEncryption {
  /**
   * Encrypt API key for storage (in production, use proper encryption)
   */
  static async encryptApiKey(apiKey: string): Promise<string> {
    // In a real implementation, use proper encryption
    // For now, we'll use base64 encoding as a placeholder
    return btoa(apiKey);
  }

  /**
   * Decrypt API key from storage
   */
  static async decryptApiKey(encryptedKey: string): Promise<string> {
    // In a real implementation, use proper decryption
    // For now, we'll use base64 decoding as a placeholder
    try {
      return atob(encryptedKey);
    } catch {
      throw new Error('Failed to decrypt API key');
    }
  }
}

/**
 * API Key testing utilities
 */
export class ApiTester {
  /**
   * Test API key validity by making a test request
   */
  static async testApiKey(provider: ApiProvider, apiKey: string): Promise<{ 
    success: boolean; 
    message: string; 
    responseTime?: number 
  }> {
    const startTime = Date.now();

    try {
      switch (provider) {
        case 'gemini':
          return await this.testGeminiApiKey(apiKey, startTime);
        
        case 'openai':
          return await this.testOpenAiApiKey(apiKey, startTime);
        
        case 'yahoo_finance':
          return await this.testYahooFinanceApiKey(apiKey, startTime);
        
        case 'perplexity':
          return await this.testPerplexityApiKey(apiKey, startTime);
        
        default:
          return {
            success: false,
            message: `Testing not implemented for provider: ${provider}`
          };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        responseTime
      };
    }
  }

  /**
   * Test Gemini API key
   */
  private static async testGeminiApiKey(apiKey: string, startTime: number): Promise<{ 
    success: boolean; 
    message: string; 
    responseTime: number 
  }> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'Gemini API key is valid and working',
          responseTime
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return {
          success: false,
          message: `Gemini API error: ${errorData.error?.message || response.statusText}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Network error testing Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime
      };
    }
  }

  /**
   * Test OpenAI API key
   */
  private static async testOpenAiApiKey(apiKey: string, startTime: number): Promise<{ 
    success: boolean; 
    message: string; 
    responseTime: number 
  }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'OpenAI API key is valid and working',
          responseTime
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return {
          success: false,
          message: `OpenAI API error: ${errorData.error?.message || response.statusText}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Network error testing OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime
      };
    }
  }

  /**
   * Test Yahoo Finance API key
   */
  private static async testYahooFinanceApiKey(apiKey: string, startTime: number): Promise<{ 
    success: boolean; 
    message: string; 
    responseTime: number 
  }> {
    try {
      // Yahoo Finance API test endpoint (using a simple quote request)
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/AAPL`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'Yahoo Finance API key is valid and working',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Yahoo Finance API error: ${response.statusText}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Network error testing Yahoo Finance API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime
      };
    }
  }

  /**
   * Test Perplexity API key
   */
  private static async testPerplexityApiKey(apiKey: string, startTime: number): Promise<{ 
    success: boolean; 
    message: string; 
    responseTime: number 
  }> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: 'Test connection'
            }
          ],
          max_tokens: 1
        })
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'Perplexity API key is valid and working',
          responseTime
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return {
          success: false,
          message: `Perplexity API error: ${errorData.error?.message || response.statusText}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Network error testing Perplexity API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime
      };
    }
  }
}

// Default export for backward compatibility
const ApiKeyUtils = {
  ApiKeyValidator,
  ApiKeyEncryption,
  ApiTester
};

export default ApiKeyUtils;
