/**
 * Email Services Export Index
 * Central export point for all email processing services
 */

// Core parsing service
export { 
  WealthsimpleEmailParser,
  type WealthsimpleEmailData,
  type EmailParseResult 
} from './wealthsimpleEmailParser';

// Portfolio mapping service
export { 
  PortfolioMappingService,
  type AccountPortfolioMapping,
  type MappingResult 
} from './portfolioMappingService';

// Integration service
export { 
  EmailProcessingService,
  type EmailProcessingResult,
  type ProcessingOptions 
} from './emailProcessingService';

// Test utilities (for development)
export { 
  EmailParserTestSuite,
  type TestResult 
} from './tests/emailParserTests';

export { 
  MOCK_WEALTHSIMPLE_EMAILS,
  INVALID_EMAILS,
  EDGE_CASES 
} from './tests/mockWealthsimpleEmails';

// Re-export default for convenience
export { default as WealthsimpleEmailParser } from './wealthsimpleEmailParser';
export { default as PortfolioMappingService } from './portfolioMappingService';
export { default as EmailProcessingService } from './emailProcessingService';
export { default as EmailParserTestSuite } from './tests/emailParserTests';
