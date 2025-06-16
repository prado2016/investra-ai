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

// Enhanced AI symbol processing
export { 
  EnhancedEmailSymbolParser,
  type EmailSymbolParseResult 
} from './enhancedEmailSymbolParser';

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

// Email identification service (Task 5.1)
export { 
  EmailIdentificationService,
  type EmailIdentification,
  type DuplicateDetectionData 
} from './emailIdentificationService';

// Multi-level duplicate detection service (Task 5.2)
export { 
  MultiLevelDuplicateDetection,
  type DuplicateDetectionResult,
  type DuplicateMatch,
  type StoredEmailRecord 
} from './multiLevelDuplicateDetection';

// Time window processing service (Task 5.3)
export { 
  TimeWindowProcessing,
  type TimeWindowAnalysis,
  type TimeWindowConfig,
  type RapidTradingPattern,
  type PartialFillAnalysis,
  type SplitOrderAnalysis 
} from './timeWindowProcessing';

// Manual review queue service (Task 5.4)
export { 
  ManualReviewQueue,
  type ReviewQueueItem,
  type ReviewQueueFilter,
  type ReviewQueueStats,
  type ReviewAction,
  type QueueConfiguration 
} from './manualReviewQueue';

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
export { default as EnhancedEmailSymbolParser } from './enhancedEmailSymbolParser';
export { default as PortfolioMappingService } from './portfolioMappingService';
export { default as EmailProcessingService } from './emailProcessingService';
export { default as EmailIdentificationService } from './emailIdentificationService';
export { default as MultiLevelDuplicateDetection } from './multiLevelDuplicateDetection';
export { default as TimeWindowProcessing } from './timeWindowProcessing';
export { default as ManualReviewQueue } from './manualReviewQueue';
export { default as EmailParserTestSuite } from './tests/emailParserTests';
