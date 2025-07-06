/**
 * AI Services React Hook
 * Task 6: Gemini AI Service Layer Integration
 */

import { useState, useEffect, useCallback } from 'react';
import { aiServiceManager } from '../services/ai';
import type {
  AIProvider,
  SymbolLookupRequest,
  SymbolLookupResponse,
  FinancialAnalysisRequest,
  FinancialAnalysisResponse,
  EmailParsingRequest,
  EmailParsingResponse,
  UsageMetrics
} from '../types/ai';

interface UseAIServicesReturn {
  // Service status
  isInitialized: boolean;
  availableProviders: AIProvider[];
  activeProvider: AIProvider | null;
  
  // Symbol lookup
  lookupSymbols: (request: SymbolLookupRequest, provider?: AIProvider) => Promise<SymbolLookupResponse>;
  isLookingUp: boolean;
  
  // Financial analysis
  analyzeFinancialData: (request: FinancialAnalysisRequest, provider?: AIProvider) => Promise<FinancialAnalysisResponse>;
  isAnalyzing: boolean;
  
  // Email parsing
  parseEmailForTransaction: (request: EmailParsingRequest, provider?: AIProvider) => Promise<EmailParsingResponse>;
  isParsing: boolean;
  
  // Service management
  initializeProvider: (provider: AIProvider) => Promise<boolean>;
  testConnection: (provider?: AIProvider) => Promise<{ success: boolean; error?: string; latency?: number }>;
  getUsageMetrics: (timeframe?: string) => Promise<UsageMetrics[]>;
  clearCache: () => void;
  
  // Health status
  healthStatus: Record<string, { available: boolean; latency?: number; error?: string }>;
  refreshHealthStatus: () => Promise<void>;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export const useAIServices = (): UseAIServicesReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<string, { available: boolean; latency?: number; error?: string }>>({});
  const [lastError, setLastError] = useState<string | null>(null);

  // Initialize services on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Try to initialize both Gemini and OpenRouter services
        const providers: AIProvider[] = ['gemini', 'openrouter'];
        const initializedProviders: AIProvider[] = [];
        let firstProvider: AIProvider | null = null;

        console.log('🚀 Initializing AI services:', providers);

        for (const provider of providers) {
          try {
            console.log(`🔧 Attempting to initialize ${provider} service...`);
            const success = await aiServiceManager.initializeService(provider);
            if (success) {
              console.log(`✅ ${provider} service initialized successfully`);
              initializedProviders.push(provider);
              if (!firstProvider) {
                firstProvider = provider;
              }
            } else {
              console.log(`❌ ${provider} service initialization failed`);
            }
          } catch (error) {
            console.warn(`❌ Failed to initialize ${provider} service:`, error);
          }
        }

        console.log('🎯 Initialized providers:', initializedProviders);

        setAvailableProviders(initializedProviders);
        if (firstProvider && !activeProvider) {
          setActiveProvider(firstProvider);
        }
        setIsInitialized(true);

        // Initial health status will be fetched by the refreshHealthStatus function
      } catch (error) {
        console.error('Failed to initialize AI services:', error);
        setLastError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    initializeServices();
  }, [activeProvider]);

  // Symbol lookup function
  const lookupSymbols = useCallback(async (
    request: SymbolLookupRequest,
    provider?: AIProvider
  ): Promise<SymbolLookupResponse> => {
    setIsLookingUp(true);
    setLastError(null);

    try {
      const response = await aiServiceManager.lookupSymbols(request, provider);
      
      if (!response.success && response.error) {
        setLastError(response.error);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMessage);
      
      return {
        success: false,
        results: [],
        error: errorMessage,
        timestamp: new Date()
      };
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // Financial analysis function
  const analyzeFinancialData = useCallback(async (
    request: FinancialAnalysisRequest,
    provider?: AIProvider
  ): Promise<FinancialAnalysisResponse> => {
    setIsAnalyzing(true);
    setLastError(null);

    try {
      const response = await aiServiceManager.analyzeFinancialData(request, provider);
      
      if (!response.success && response.error) {
        setLastError(response.error);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Email parsing function
  const parseEmailForTransaction = useCallback(async (
    request: EmailParsingRequest,
    provider?: AIProvider
  ): Promise<EmailParsingResponse> => {
    setIsParsing(true);
    setLastError(null);

    try {
      const response = await aiServiceManager.parseEmailForTransaction(request, provider);
      
      if (!response.success && response.error) {
        setLastError(response.error);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMessage);
      
      return {
        success: false,
        confidence: 0,
        parsingType: 'unknown',
        error: errorMessage,
        timestamp: new Date()
      };
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Initialize a specific provider
  const initializeProvider = useCallback(async (provider: AIProvider): Promise<boolean> => {
    try {
      const success = await aiServiceManager.initializeService(provider);
      
      if (success) {
        setAvailableProviders(prev => {
          if (!prev.includes(provider)) {
            return [...prev, provider];
          }
          return prev;
        });
        
        if (!activeProvider) {
          setActiveProvider(provider);
        }
      }
      
      return success;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Unknown error occurred');
      return false;
    }
  }, [activeProvider]);

  // Test connection
  const testConnection = useCallback(async (provider?: AIProvider) => {
    try {
      if (provider) {
        const service = aiServiceManager.getService(provider);
        if (service) {
          return await service.testConnection();
        } else {
          return {
            success: false,
            error: `Service not available for provider: ${provider}`
          };
        }
      } else {
        // Test all connections
        const results = await aiServiceManager.testAllConnections();
        
        // Return result for active provider or first available
        const testProvider = activeProvider || availableProviders[0];
        return results[testProvider] || { success: false, error: 'No provider available' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }, [activeProvider, availableProviders]);

  // Get usage metrics
  const getUsageMetrics = useCallback(async (timeframe?: string): Promise<UsageMetrics[]> => {
    try {
      return await aiServiceManager.getAggregatedUsageMetrics(timeframe);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to get usage metrics');
      return [];
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    aiServiceManager.clearCache();
  }, []);

  // Refresh health status
  const refreshHealthStatus = useCallback(async () => {
    try {
      const status = await aiServiceManager.getHealthStatus();
      // Type assertion to match expected type
      setHealthStatus(status as Record<string, { available: boolean; latency?: number; error?: string }>);
    } catch (error) {
      console.error('Failed to get health status:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to get health status');
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    // Service status
    isInitialized,
    availableProviders,
    activeProvider,
    
    // Symbol lookup
    lookupSymbols,
    isLookingUp,
    
    // Financial analysis
    analyzeFinancialData,
    isAnalyzing,
    
    // Email parsing
    parseEmailForTransaction,
    isParsing,
    
    // Service management
    initializeProvider,
    testConnection,
    getUsageMetrics,
    clearCache,
    
    // Health status
    healthStatus,
    refreshHealthStatus,
    
    // Error handling
    lastError,
    clearError
  };
};

export default useAIServices;
