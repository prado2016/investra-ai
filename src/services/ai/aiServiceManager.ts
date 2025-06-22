/**
 * AI Service Factory and Manager
 * Task 18: Gemini AI Service Layer Integration
 */

import type { 
  IAIService, 
  AIProvider, 
  AIServiceConfig,
  SymbolLookupRequest,
  SymbolLookupResponse,
  FinancialAnalysisRequest,
  FinancialAnalysisResponse,
  EmailParsingRequest,
  EmailParsingResponse
} from '../../types/ai';
import { GeminiAIService } from './geminiService';
import { ApiKeyService } from '../apiKeyService';
import { ApiKeyStorage } from '../../utils/apiKeyStorage';

export class AIServiceManager {
  private services: Map<AIProvider, IAIService> = new Map();
  private static instance: AIServiceManager;

  private constructor() {}

  static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  /**
   * Initialize AI service for a specific provider
   */
  async initializeService(provider: AIProvider, config?: Partial<AIServiceConfig>): Promise<boolean> {
    try {
      // Get API key from storage if not provided in config
      let apiKey = config?.apiKey;
      if (!apiKey) {
        try {
          // Try database first
          const activeKey = await ApiKeyService.getActiveKeyForProvider(provider);
          if (activeKey) {
            // Use the service method to get decrypted key
            apiKey = await ApiKeyService.getDecryptedApiKey(activeKey.id);
          }
        } catch (dbError) {
          console.warn(`Database API key lookup failed for ${provider}, using fallback:`, dbError);
          // Fallback to ApiKeyStorage utility (localStorage + env vars)
          apiKey = ApiKeyStorage.getApiKeyWithFallback(provider) || undefined;
          console.log(`Fallback API key lookup for ${provider}:`, apiKey ? 'Found' : 'Not found');
        }
      }

      if (!apiKey) {
        console.warn(`No API key found for provider: ${provider}`);
        return false;
      }

      const serviceConfig: AIServiceConfig = {
        provider,
        apiKey,
        model: config?.model,
        maxTokens: config?.maxTokens || 8192,
        temperature: config?.temperature || 0.1,
        timeout: config?.timeout || 30000,
        rateLimitPerHour: config?.rateLimitPerHour || 100,
        rateLimitPerDay: config?.rateLimitPerDay || 1000,
        enableCaching: config?.enableCaching !== false,
        cacheExpiryMinutes: config?.cacheExpiryMinutes || 60
      };

      const service = this.createService(provider, serviceConfig);
      if (service) {
        this.services.set(provider, service);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to initialize AI service for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Get AI service instance for a provider
   */
  getService(provider: AIProvider): IAIService | null {
    return this.services.get(provider) || null;
  }

  /**
   * Get all initialized services
   */
  getAllServices(): Map<AIProvider, IAIService> {
    return new Map(this.services);
  }

  /**
   * Symbol lookup using the best available AI service
   */
  async lookupSymbols(
    request: SymbolLookupRequest, 
    preferredProvider?: AIProvider
  ): Promise<SymbolLookupResponse> {
    const provider = preferredProvider || this.getBestProviderForSymbolLookup();
    const service = this.getService(provider);

    if (!service) {
      return {
        success: false,
        results: [],
        error: `No AI service available for provider: ${provider}`,
        timestamp: new Date()
      };
    }

    try {
      return await service.lookupSymbols(request);
    } catch (error) {
      // Try fallback provider if available
      const fallbackProvider = this.getFallbackProvider(provider);
      if (fallbackProvider) {
        const fallbackService = this.getService(fallbackProvider);
        if (fallbackService) {
          try {
            return await fallbackService.lookupSymbols(request);
          } catch (fallbackError) {
            console.error('Fallback service also failed:', fallbackError);
          }
        }
      }

      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Financial analysis using the best available AI service
   */
  async analyzeFinancialData(
    request: FinancialAnalysisRequest,
    preferredProvider?: AIProvider
  ): Promise<FinancialAnalysisResponse> {
    const provider = preferredProvider || this.getBestProviderForAnalysis();
    const service = this.getService(provider);

    if (!service) {
      return {
        success: false,
        error: `No AI service available for provider: ${provider}`,
        timestamp: new Date()
      };
    }

    try {
      return await service.analyzeFinancialData(request);
    } catch (error) {
      // Try fallback provider if available
      const fallbackProvider = this.getFallbackProvider(provider);
      if (fallbackProvider) {
        const fallbackService = this.getService(fallbackProvider);
        if (fallbackService) {
          try {
            return await fallbackService.analyzeFinancialData(request);
          } catch (fallbackError) {
            console.error('Fallback service also failed:', fallbackError);
          }
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Test connection for all services
   */
  async testAllConnections(): Promise<Record<AIProvider, { success: boolean; error?: string; latency?: number }>> {
    const results: Record<AIProvider, { success: boolean; error?: string; latency?: number }> = {
      openai: { success: false },
      gemini: { success: false },
      perplexity: { success: false }
    };
    
    for (const [provider, service] of this.services) {
      try {
        results[provider] = await service.testConnection();
      } catch (error) {
        results[provider] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }

    return results;
  }

  /**
   * Email parsing using the best available AI service
   */
  async parseEmailForTransaction(
    request: EmailParsingRequest,
    preferredProvider?: AIProvider
  ): Promise<EmailParsingResponse> {
    const provider = preferredProvider || this.getBestProviderForEmailParsing();
    const service = this.getService(provider);

    if (!service) {
      return {
        success: false,
        confidence: 0,
        parsingType: 'unknown',
        error: `No AI service available for provider: ${provider}`,
        timestamp: new Date()
      };
    }

    try {
      return await service.parseEmailForTransaction(request);
    } catch (error) {
      // Try fallback provider if available
      const fallbackProvider = this.getFallbackProvider(provider);
      if (fallbackProvider) {
        const fallbackService = this.getService(fallbackProvider);
        if (fallbackService) {
          try {
            return await fallbackService.parseEmailForTransaction(request);
          } catch (fallbackError) {
            console.error('Fallback service also failed:', fallbackError);
          }
        }
      }

      return {
        success: false,
        confidence: 0,
        parsingType: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Test connection for a specific provider
   */
  async testConnection(provider: AIProvider): Promise<{ success: boolean; error?: string; latency?: number }> {
    const service = this.getService(provider);
    if (!service) {
      return {
        success: false,
        error: `Service not initialized for provider: ${provider}`
      };
    }

    try {
      return await service.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get aggregated usage metrics from all services
   */
  async getAggregatedUsageMetrics(timeframe?: string) {
    const allMetrics = [];
    
    for (const [provider, service] of this.services) {
      try {
        const metrics = await service.getUsageMetrics(timeframe);
        allMetrics.push(...metrics);
      } catch (error) {
        console.error(`Failed to get metrics for ${provider}:`, error);
      }
    }

    return allMetrics;
  }

  /**
   * Clear cache for all services
   */
  clearCache(): void {
    for (const service of this.services.values()) {
      if (typeof service.clearCache === 'function') {
        service.clearCache();
      }
    }
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus() {
    const status: Record<string, unknown> = {};
    
    for (const [provider, service] of this.services) {
      try {
        const [connection, rateLimit, cacheStats] = await Promise.all([
          service.testConnection(),
          service.getRateLimitStatus(),
          Promise.resolve(service.getCacheStats())
        ]);

        status[provider] = {
          configured: service.isConfigured,
          connected: connection.success,
          rateLimit,
          cache: cacheStats,
          latency: connection.latency
        };
      } catch (error) {
        status[provider] = {
          configured: service.isConfigured,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return status;
  }

  // Private helper methods

  private createService(provider: AIProvider, config: AIServiceConfig): IAIService | null {
    switch (provider) {
      case 'gemini':
        return new GeminiAIService(config);
      case 'openai':
        // TODO: Implement OpenAI service
        console.warn('OpenAI service not yet implemented');
        return null;
      case 'perplexity':
        // TODO: Implement Perplexity service
        console.warn('Perplexity service not yet implemented');
        return null;
      default:
        console.error(`Unsupported AI provider: ${provider}`);
        return null;
    }
  }

  private getBestProviderForSymbolLookup(): AIProvider {
    // Priority order for symbol lookup
    const priorities: AIProvider[] = ['gemini', 'perplexity', 'openai'];
    
    for (const provider of priorities) {
      if (this.services.has(provider)) {
        const service = this.services.get(provider)!;
        if (service.isConfigured) {
          return provider;
        }
      }
    }

    // Return first available if none match priorities
    for (const [provider, service] of this.services) {
      if (service.isConfigured) {
        return provider;
      }
    }

    return 'gemini'; // Default fallback
  }

  private getBestProviderForAnalysis(): AIProvider {
    // Priority order for financial analysis
    const priorities: AIProvider[] = ['gemini', 'openai', 'perplexity'];
    
    for (const provider of priorities) {
      if (this.services.has(provider)) {
        const service = this.services.get(provider)!;
        if (service.isConfigured) {
          return provider;
        }
      }
    }

    // Return first available if none match priorities
    for (const [provider, service] of this.services) {
      if (service.isConfigured) {
        return provider;
      }
    }

    return 'gemini'; // Default fallback
  }

  private getBestProviderForEmailParsing(): AIProvider {
    // Priority order for email parsing
    const priorities: AIProvider[] = ['gemini', 'openai', 'perplexity'];
    
    for (const provider of priorities) {
      if (this.services.has(provider)) {
        const service = this.services.get(provider)!;
        if (service.isConfigured) {
          return provider;
        }
      }
    }

    // Return first available if none match priorities
    for (const [provider, service] of this.services) {
      if (service.isConfigured) {
        return provider;
      }
    }

    return 'gemini'; // Default fallback
  }

  private getFallbackProvider(currentProvider: AIProvider): AIProvider | null {
    const fallbackMap: Record<AIProvider, AIProvider[]> = {
      'gemini': ['openai', 'perplexity'],
      'openai': ['gemini', 'perplexity'],
      'perplexity': ['gemini', 'openai']
    };

    const fallbacks = fallbackMap[currentProvider] || [];
    
    for (const provider of fallbacks) {
      if (this.services.has(provider)) {
        const service = this.services.get(provider)!;
        if (service.isConfigured) {
          return provider;
        }
      }
    }

    return null;
  }

  // Helper method for decrypting API keys (currently unused but may be needed for encrypted storage)
  // private async decryptApiKey(encryptedKey: string): Promise<string> {
  //   try {
  //     return await ApiKeyEncryption.decryptApiKey(encryptedKey);
  //   } catch (error) {
  //     console.error('Failed to decrypt API key:', error);
  //     return '';
  //   }
  // }
}

// Export singleton instance
export const aiServiceManager = AIServiceManager.getInstance();
export default aiServiceManager;
