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
import { OpenRouterAIService } from './openrouterService';
// import { ApiKeyService } from '../apiKeyService'; // TODO: Re-enable when database is set up
import { ApiKeyStorage } from '../../utils/apiKeyStorage';
import { dynamicProviderSelector, type ProviderSelectionContext } from './dynamicProviderSelector';
// providerHealthMonitor is used in dynamicProviderSelector - no direct import needed here

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
        // For now, use direct environment variable access (same as EnhancedSymbolInput)
        // This bypasses the database requirement until proper API key management is set up
        apiKey = ApiKeyStorage.getApiKeyWithFallback(provider) || undefined;
        
        // TODO: Uncomment this when api_keys table is properly set up in database
        // try {
        //   // Try database first
        //   const activeKey = await ApiKeyService.getActiveKeyForProvider(provider);
        //   if (activeKey) {
        //     // Use the service method to get decrypted key
        //     apiKey = await ApiKeyService.getDecryptedApiKey(activeKey.id);
        //   }
        // } catch (dbError) {
        //   console.warn(`Database API key lookup failed for ${provider}, using fallback:`, dbError);
        //   // Fallback to ApiKeyStorage utility (localStorage + env vars)
        //   apiKey = ApiKeyStorage.getApiKeyWithFallback(provider) || undefined;
        // }
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
    const provider = preferredProvider || await this.getBestProviderForSymbolLookup();
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
      // Use dynamic provider selector for intelligent fallback
      const context: ProviderSelectionContext = {
        useCase: 'symbol_lookup',
        urgency: 'high', // High urgency since primary failed
        maxResponseTime: 5000,
        fallbackEnabled: true,
        costSensitive: false
      };

      const availableServices = new Set(
        Array.from(this.services.entries())
          .filter(([p, service]) => p !== provider && service.isConfigured) // Exclude failed provider
          .map(([provider]) => provider)
      );

      const fallbackProvider = await dynamicProviderSelector.getFallbackProvider(provider, context, availableServices);
      
      if (fallbackProvider) {
        const fallbackService = this.getService(fallbackProvider);
        if (fallbackService) {
          try {
            return await fallbackService.lookupSymbols(request);
          } catch (fallbackError) {
            console.error('Intelligent fallback service also failed:', fallbackError);
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
    const provider = preferredProvider || await this.getBestProviderForAnalysis();
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
      // Use dynamic provider selector for intelligent fallback
      const context: ProviderSelectionContext = {
        useCase: 'financial_analysis',
        urgency: 'high', // High urgency since primary failed
        maxResponseTime: 20000,
        fallbackEnabled: true,
        costSensitive: false
      };

      const availableServices = new Set(
        Array.from(this.services.entries())
          .filter(([p, service]) => p !== provider && service.isConfigured) // Exclude failed provider
          .map(([provider]) => provider)
      );

      const fallbackProvider = await dynamicProviderSelector.getFallbackProvider(provider, context, availableServices);
      
      if (fallbackProvider) {
        const fallbackService = this.getService(fallbackProvider);
        if (fallbackService) {
          try {
            return await fallbackService.analyzeFinancialData(request);
          } catch (fallbackError) {
            console.error('Intelligent fallback service also failed:', fallbackError);
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
      openrouter: { success: false },
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
    const provider = preferredProvider || await this.getBestProviderForEmailParsing();
    let service = this.getService(provider);

    // If service is not available, try to initialize it
    if (!service) {
      console.log(`AI service not initialized for ${provider}, attempting to initialize...`);
      const initialized = await this.initializeService(provider);
      if (initialized) {
        service = this.getService(provider);
      }
    }

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
      const result = await service.parseEmailForTransaction(request);
      
      // Check if the result indicates failure (e.g., 503 errors, API overload)
      if (!result.success && result.error) {
        console.warn(`Primary AI service ${provider} failed:`, result.error);
        
        // Trigger fallback for failed responses, not just exceptions
        const context: ProviderSelectionContext = {
          useCase: 'email_parsing',
          urgency: 'high', // High urgency since primary failed
          maxResponseTime: 15000,
          fallbackEnabled: true,
          costSensitive: false
        };

        const availableServices = new Set(
          Array.from(this.services.entries())
            .filter(([p, service]) => p !== provider && service.isConfigured) // Exclude failed provider
            .map(([provider]) => provider)
        );

        const fallbackProvider = await dynamicProviderSelector.getFallbackProvider(provider, context, availableServices);
        
        if (fallbackProvider) {
          console.log(`Attempting fallback to ${fallbackProvider} after ${provider} failed`);
          const fallbackService = this.getService(fallbackProvider);
          if (fallbackService) {
            try {
              const fallbackResult = await fallbackService.parseEmailForTransaction(request);
              if (fallbackResult.success) {
                console.log(`Fallback to ${fallbackProvider} successful`);
                return fallbackResult;
              } else {
                console.error('Fallback service also returned failure:', fallbackResult.error);
              }
            } catch (fallbackError) {
              console.error('Fallback service threw exception:', fallbackError);
            }
          }
        }
        
        // Return the original failure if no fallback succeeded
        return result;
      }
      
      return result;
    } catch (error) {
      // Handle exceptions (network errors, etc.)
      console.error(`Primary AI service ${provider} threw exception:`, error);
      
      // Use dynamic provider selector for intelligent fallback
      const context: ProviderSelectionContext = {
        useCase: 'email_parsing',
        urgency: 'high', // High urgency since primary failed
        maxResponseTime: 15000,
        fallbackEnabled: true,
        costSensitive: false
      };

      const availableServices = new Set(
        Array.from(this.services.entries())
          .filter(([p, service]) => p !== provider && service.isConfigured) // Exclude failed provider
          .map(([provider]) => provider)
      );

      const fallbackProvider = await dynamicProviderSelector.getFallbackProvider(provider, context, availableServices);
      
      if (fallbackProvider) {
        console.log(`Attempting fallback to ${fallbackProvider} after ${provider} exception`);
        const fallbackService = this.getService(fallbackProvider);
        if (fallbackService) {
          try {
            const fallbackResult = await fallbackService.parseEmailForTransaction(request);
            if (fallbackResult.success) {
              console.log(`Fallback to ${fallbackProvider} successful`);
              return fallbackResult;
            } else {
              console.error('Fallback service also returned failure:', fallbackResult.error);
            }
          } catch (fallbackError) {
            console.error('Fallback service also threw exception:', fallbackError);
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
      case 'openrouter':
        return new OpenRouterAIService(config);
      case 'perplexity':
        // TODO: Implement Perplexity service
        console.warn('Perplexity service not yet implemented');
        return null;
      default:
        console.error(`Unsupported AI provider: ${provider}`);
        return null;
    }
  }

  private async getBestProviderForSymbolLookup(): Promise<AIProvider> {
    const context: ProviderSelectionContext = {
      useCase: 'symbol_lookup',
      urgency: 'medium',
      maxResponseTime: 5000,
      fallbackEnabled: true,
      costSensitive: false
    };

    const availableServices = new Set(
      Array.from(this.services.entries())
        .filter(([, service]) => service.isConfigured)
        .map(([provider]) => provider)
    );

    const selectedProvider = await dynamicProviderSelector.selectBestProvider(context, availableServices);
    
    // If dynamic selection fails, try to get any available provider
    if (!selectedProvider) {
      console.warn('Dynamic provider selection failed for symbol lookup, selecting first available');
      return this.getFirstAvailableProvider(availableServices);
    }

    return selectedProvider;
  }

  private async getBestProviderForAnalysis(): Promise<AIProvider> {
    const context: ProviderSelectionContext = {
      useCase: 'financial_analysis',
      urgency: 'medium',
      maxResponseTime: 20000,
      fallbackEnabled: true,
      costSensitive: false
    };

    const availableServices = new Set(
      Array.from(this.services.entries())
        .filter(([, service]) => service.isConfigured)
        .map(([provider]) => provider)
    );

    const selectedProvider = await dynamicProviderSelector.selectBestProvider(context, availableServices);
    
    // If dynamic selection fails, try to get any available provider
    if (!selectedProvider) {
      console.warn('Dynamic provider selection failed for financial analysis, selecting first available');
      return this.getFirstAvailableProvider(availableServices);
    }

    return selectedProvider;
  }

  private async getBestProviderForEmailParsing(): Promise<AIProvider> {
    // Get user's preferred provider
    const defaultProvider = ApiKeyStorage.getDefaultProvider() as AIProvider;
    console.log('🔍 Default provider from storage:', defaultProvider);
    console.log('🔍 Available services:', Array.from(this.services.keys()));
    
    const context: ProviderSelectionContext = {
      useCase: 'email_parsing',
      urgency: 'medium',
      maxResponseTime: 15000,
      preferredProvider: defaultProvider,
      fallbackEnabled: true,
      costSensitive: false
    };

    const availableServices = new Set(
      Array.from(this.services.entries())
        .filter(([, service]) => service.isConfigured)
        .map(([provider]) => provider)
    );

    const selectedProvider = await dynamicProviderSelector.selectBestProvider(context, availableServices);
    
    // If dynamic selection fails, try to get any available provider
    if (!selectedProvider) {
      console.warn('Dynamic provider selection failed for email parsing, selecting first available');
      return this.getFirstAvailableProvider(availableServices);
    }

    console.log('✅ Using dynamically selected provider for email parsing:', selectedProvider);
    return selectedProvider;
  }


  /**
   * Helper method to get first available provider when dynamic selection fails
   */
  private getFirstAvailableProvider(availableServices: Set<AIProvider>): AIProvider {
    // Try to find any configured service from available ones
    for (const provider of availableServices) {
      const service = this.services.get(provider);
      if (service && service.isConfigured) {
        return provider;
      }
    }

    // If no available services are configured, return first configured service
    for (const [provider, service] of this.services) {
      if (service.isConfigured) {
        return provider;
      }
    }

    // Ultimate fallback - return gemini as it's most likely to be configured
    return 'gemini';
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
