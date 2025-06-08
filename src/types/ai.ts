// AI Service types
export * from './ai';

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    cached?: boolean;
  };
}

export interface SymbolSuggestionResponse {
  suggestions: string[];
  query: string;
  provider: AIProvider;
}

export interface SymbolValidationResponse {
  isValid: boolean;
  symbol: string;
  suggestion?: string;
  confidence: number;
  details?: {
    name: string;
    exchange: string;
    assetType: string;
  };
}

export interface BatchLookupResponse {
  results: Array<{
    query: string;
    success: boolean;
    symbols: Array<{
      symbol: string;
      name: string;
      confidence: number;
    }>;
    error?: string;
  }>;
  totalQueries: number;
  successfulQueries: number;
}

export interface MarketInsightsResponse {
  symbol: string;
  insights: {
    summary: string;
    keyPoints: string[];
    sentiment: 'bullish' | 'bearish' | 'neutral';
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
  };
  recommendations: string[];
  metadata: {
    analysisType: string;
    dataPoints: number;
  };
}

// AI Provider types
export type AIProvider = 'gemini' | 'openai' | 'perplexity';

// Asset types (copied from portfolio types to avoid circular dependencies)
export type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';

// Symbol lookup types
export interface SymbolLookupRequest {
  query: string;
  context?: string;
  maxResults?: number;
  includeAnalysis?: boolean;
}

export interface SymbolLookupResult {
  symbol: string;
  name: string;
  exchange: string;
  assetType: AssetType;
  confidence: number;
  description?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  currency?: string;
}

export interface SymbolLookupResponse {
  success: boolean;
  results: SymbolLookupResult[];
  error?: string;
  timestamp: Date;
  cached?: boolean;
  tokensUsed?: number;
  processingTime?: number;
}

// Financial analysis types
export interface FinancialAnalysisRequest {
  symbol: string;
  data: FinancialDataInput;
  analysisType: 'trend' | 'risk' | 'valuation' | 'comparison' | 'sentiment';
  timeframe?: string;
}

export interface FinancialDataInput {
  prices?: number[];
  volumes?: number[];
  marketData?: Record<string, any>;
  newsData?: string[];
  fundamentals?: Record<string, any>;
}

export interface FinancialAnalysisResult {
  symbol: string;
  analysisType: string;
  insights: string[];
  score: number;
  confidence: number;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  metadata: Record<string, any>;
}

export interface FinancialAnalysisResponse {
  success: boolean;
  result?: FinancialAnalysisResult;
  error?: string;
  timestamp: Date;
  tokensUsed?: number;
  processingTime?: number;
}

// AI Service configuration
export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  enableCaching?: boolean;
  cacheExpiryMinutes?: number;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  tokensUsed?: number;
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  entriesCount: number;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

// Error types
export interface AIServiceError {
  code: string;
  message: string;
  provider: AIProvider;
  type: 'api_error' | 'validation_error' | 'rate_limit' | 'timeout' | 'quota_exceeded';
  details?: any;
  retryable: boolean;
}

// Rate limiting types
export interface RateLimitStatus {
  provider: AIProvider;
  requestsThisHour: number;
  requestsToday: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  resetTime: Date;
  available: boolean;
}

// Usage tracking types
export interface UsageMetrics {
  provider: AIProvider;
  endpoint: string;
  tokensUsed: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  totalCost?: number;
  timestamp: Date;
}

// AI Service interface
export interface IAIService {
  readonly provider: AIProvider;
  readonly isConfigured: boolean;
  
  // Symbol lookup
  lookupSymbols(request: SymbolLookupRequest): Promise<SymbolLookupResponse>;
  
  // Financial analysis
  analyzeFinancialData(request: FinancialAnalysisRequest): Promise<FinancialAnalysisResponse>;
  
  // Health check
  testConnection(): Promise<{ success: boolean; error?: string; latency?: number }>;
  
  // Rate limiting
  getRateLimitStatus(): Promise<RateLimitStatus>;
  
  // Usage metrics
  getUsageMetrics(timeframe?: string): Promise<UsageMetrics[]>;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
}
