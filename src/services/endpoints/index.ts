/**
 * Services Endpoints Export Index
 * Central export point for all API endpoint services
 */

// Portfolio API
export { 
  PortfolioAPI,
  type PortfolioCreateRequest,
  type PortfolioUpdateRequest
} from './portfolioAPI';

// AI Symbol Lookup API
export { 
  AISymbolLookupAPI,
  type APIResponse as AIAPIResponse,
  type SymbolSuggestionResponse,
  type SymbolValidationResponse,
  type BatchLookupResponse,
  type MarketInsightsResponse
} from './aiSymbolLookupAPI';

// Symbol Lookup Endpoint
export { 
  symbolLookupEndpoint,
  type SymbolLookupEndpointRequest,
  type SymbolLookupEndpointResponse,
  type EndpointConfig
} from './symbolLookupEndpoint';

// Email Processing API (removed - system redesigned)
// export { 
//   EmailAPI,
//   EmailProcessingAPI,
//   EmailStatusAPI,
//   EmailManagementAPI,
//   EmailAPIMiddleware
// } from './emailAPI';

// IMAP Service API (removed - system redesigned)
// export { 
//   IMAPServiceAPI,
//   type IMAPServiceStatusResponse,
//   type IMAPServiceConfigResponse,
//   type IMAPConnectionTestResponse,
//   type IMAPProcessEmailsResponse
// } from './imapServiceAPI';

// Email types removed - system redesigned
// export type {
//   APIResponse,
//   EmailProcessRequest,
//   BatchEmailProcessRequest,
//   EmailProcessResponse,
//   BatchProcessResponse,
//   ProcessingStatus,
//   ProcessingHistoryResponse,
//   ProcessingStatsResponse,
//   HealthCheckResponse,
//   ImportJob,
//   ImportJobCreateRequest,
//   ImportJobListResponse,
//   RetryRequest,
//   RetryResponse,
//   ReviewManagementRequest,
//   ReviewManagementResponse,
//   AuthResult,
//   RateLimitConfig,
//   ValidationSchema,
//   RequestContext
// } from './emailAPI';

// export { EmailAPISchemas, RateLimitConfigs } from './emailAPI';

// Re-export defaults for convenience
export { default as PortfolioAPIDefault } from './portfolioAPI';
export { default as AISymbolLookupAPIDefault } from './aiSymbolLookupAPI';
// export { default as EmailAPIDefault } from './emailAPI';
// export { default as IMAPServiceAPIDefault } from './imapServiceAPI';