/**
 * Services Endpoints Export Index
 * Central export point for all API endpoint services
 */

// Portfolio API
export { 
  PortfolioAPI,
  type PortfolioCreateRequest,
  type PortfolioUpdateRequest,
  type PortfolioDeleteRequest 
} from './portfolioAPI';

// AI Symbol Lookup API
export { 
  AISymbolLookupAPI,
  type SymbolLookupRequest,
  type SymbolLookupResponse,
  type CompanyInfo 
} from './aiSymbolLookupAPI';

// Symbol Lookup Endpoint
export { 
  SymbolLookupEndpoint,
  type LookupResult,
  type LookupError 
} from './symbolLookupEndpoint';

// Email Processing API (Task 6)
export { 
  EmailAPI,
  EmailProcessingAPI,
  EmailStatusAPI,
  EmailManagementAPI,
  EmailAPIMiddleware
} from './emailAPI';

export type {
  APIResponse,
  EmailProcessRequest,
  BatchEmailProcessRequest,
  EmailProcessResponse,
  BatchProcessResponse,
  ProcessingStatus,
  ProcessingHistoryResponse,
  ProcessingStatsResponse,
  HealthCheckResponse,
  ImportJob,
  ImportJobCreateRequest,
  ImportJobListResponse,
  RetryRequest,
  RetryResponse,
  ReviewManagementRequest,
  ReviewManagementResponse,
  AuthResult,
  RateLimitConfig,
  ValidationSchema,
  RequestContext
} from './emailAPI';

export { EmailAPISchemas, RateLimitConfigs } from './emailAPI';

// Re-export defaults for convenience
export { default as PortfolioAPI } from './portfolioAPI';
export { default as AISymbolLookupAPI } from './aiSymbolLookupAPI';
export { default as EmailAPI } from './emailAPI';