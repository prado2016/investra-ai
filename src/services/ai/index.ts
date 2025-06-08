/**
 * AI Services Index
 * Task 18: Gemini AI Service Layer Integration
 */

// Export types
export * from '../../types/ai';

// Export base service
export { BaseAIService } from './baseAIService';

// Export service implementations
export { GeminiAIService } from './geminiService';

// Export service manager
export { AIServiceManager, aiServiceManager } from './aiServiceManager';

// Export default instance for easy consumption
export { aiServiceManager as default } from './aiServiceManager';
