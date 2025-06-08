/**
 * AI Service Hook
 * Task 18: Gemini AI Service Layer Integration
 */

import { useState, useEffect, useCallback } from 'react';
import { aiServiceManager } from '../services/ai';
import type { 
  AIProvider,
  SymbolLookupRequest,
  SymbolLookupResponse,
  FinancialAnalysisRequest,
  FinancialAnalysisResponse
} from '../types/ai';

interface UseAIServiceReturn {
  // Service management
  isInitialized: boolean;
  initializeService: (provider: AIProvider, config?: any) => Promise<boolean>;
  
  // Symbol lookup
  lookupSymbols: (request: SymbolLookupRequest, provider?: AIProvider) => Promise<SymbolLookupResponse>;
  isLookingUp: boolean;
  lookupError: string | null;
  
  // Financial analysis
  analyzeFinancialData: (request: FinancialAnalysisRequest, provider?: AIProvider) => Promise<FinancialAnalysisResponse>;
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // Service health
  testConnection: (provider: AIProvider) => Promise<{ success: boolean; error?: string; latency?: number }>;
  getHealthStatus: () => Promise<Record<string, any>>;
  
  // Cache management
  clearCache: () => void;
}

export function useAIService(): UseAIServiceReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Check initialization status
  useEffect(() => {
    const checkInitialization = () => {
      const services = aiServiceManager.getAllServices();
      setIsInitialized(services.size > 0);
    };

    checkInitialization();
  }, []);

  const initializeService = useCallback(async (provider: AIProvider, config?: any): Promise<boolean> => {
    try {
      const success = await aiServiceManager.initializeService(provider, config);
      if (success) {
        setIsInitialized(true);
      }
      return success;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      return false;
    }
  }, []);

  const lookupSymbols = useCallback(async (
    request: SymbolLookupRequest, 
    provider?: AIProvider
  ): Promise<SymbolLookupResponse> => {
    setIsLookingUp(true);
    setLookupError(null);
    
    try {
      const response = await aiServiceManager.lookupSymbols(request, provider);
      
      if (!response.success && response.error) {
        setLookupError(response.error);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLookupError(errorMessage);
      
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

  const analyzeFinancialData = useCallback(async (
    request: FinancialAnalysisRequest,
    provider?: AIProvider
  ): Promise<FinancialAnalysisResponse> => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const response = await aiServiceManager.analyzeFinancialData(request, provider);
      
      if (!response.success && response.error) {
        setAnalysisError(response.error);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const testConnection = useCallback(async (provider: AIProvider) => {
    const service = aiServiceManager.getService(provider);
    if (!service) {
      return {
        success: false,
        error: `Service not initialized for provider: ${provider}`
      };
    }
    
    return await service.testConnection();
  }, []);

  const getHealthStatus = useCallback(async () => {
    return await aiServiceManager.getHealthStatus();
  }, []);

  const clearCache = useCallback(() => {
    aiServiceManager.clearAllCaches();
  }, []);

  return {
    isInitialized,
    initializeService,
    lookupSymbols,
    isLookingUp,
    lookupError,
    analyzeFinancialData,
    isAnalyzing,
    analysisError,
    testConnection,
    getHealthStatus,
    clearCache
  };
}

export default useAIService;
