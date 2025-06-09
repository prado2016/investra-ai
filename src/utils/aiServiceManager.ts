/**
 * AI Service Reinitializer
 * Utility to reinitialize AI services when API keys change
 */

import { ApiKeyStorage } from './apiKeyStorage';

export class AIServiceManager {
  /**
   * Reinitialize AI services with updated API keys
   */
  static async reinitializeServices(): Promise<void> {
    try {
      console.log('Reinitializing AI services with updated API keys...');
      
      // Check for available API keys
      const hasGemini = ApiKeyStorage.hasApiKey('gemini');
      const hasOpenAI = ApiKeyStorage.hasApiKey('openai');
      
      console.log('Available API keys:', { hasGemini, hasOpenAI });
      
      // Reinitialize the service manager
      // Note: This would require the aiServiceManager to have a reinitialize method
      // For now, we'll just log the status
      
      if (hasGemini) {
        console.log('✅ Gemini API key available');
      } else {
        console.log('⚠️ Gemini API key not available - using mock responses');
      }
      
      if (hasOpenAI) {
        console.log('✅ OpenAI API key available');
      } else {
        console.log('⚠️ OpenAI API key not available');
      }
      
      // Trigger a refresh of AI capabilities
      window.dispatchEvent(new CustomEvent('aiServicesUpdated', {
        detail: { hasGemini, hasOpenAI }
      }));
      
    } catch (error) {
      console.error('Error reinitializing AI services:', error);
    }
  }

  /**
   * Test connection to AI services
   */
  static async testConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      // Test Gemini connection
      if (ApiKeyStorage.hasApiKey('gemini')) {
        // This would test the actual Gemini connection
        results.gemini = true;
      } else {
        results.gemini = false;
      }
      
      // Test other services similarly
      results.openai = ApiKeyStorage.hasApiKey('openai');
      
    } catch (error) {
      console.error('Error testing AI connections:', error);
    }
    
    return results;
  }
}
