/**
 * Email API Endpoints - Main Export
 * Task 6: Email Processing API Endpoints
 * Unified interface for all email processing API endpoints
 */

// Core API classes
export { EmailProcessingAPI } from './emailProcessingAPI';
export { EmailStatusAPI } from './emailStatusAPI';
export { EmailManagementAPI } from './emailManagementAPI';
export { EmailAPIMiddleware } from './emailAPIMiddleware';

// Import for internal use
import { EmailProcessingAPI, type EmailProcessRequest, type BatchEmailProcessRequest } from './emailProcessingAPI';
import { EmailStatusAPI } from './emailStatusAPI';
import { EmailManagementAPI, type ImportJobCreateRequest, type ReviewManagementRequest, type RetryRequest } from './emailManagementAPI';

// Types and interfaces
export type {
  APIResponse,
  EmailProcessRequest,
  BatchEmailProcessRequest,
  EmailProcessResponse,
  BatchProcessResponse
} from './emailProcessingAPI';

export type {
  ProcessingStatus,
  ProcessingHistoryItem,
  ProcessingHistoryResponse,
  ProcessingStatsResponse,
  HealthCheckResponse
} from './emailStatusAPI';

export type {
  ImportJob,
  ImportJobCreateRequest,
  ImportJobListResponse,
  RetryRequest,
  RetryResponse,
  ReviewManagementRequest,
  ReviewManagementResponse
} from './emailManagementAPI';

export type {
  AuthResult,
  RateLimitConfig,
  ValidationRule,
  ValidationSchema,
  ValidationResult,
  RequestContext
} from './emailAPIMiddleware';

// Predefined schemas and configurations
export { EmailAPISchemas, RateLimitConfigs } from './emailAPIMiddleware';

/**
 * Unified Email API Class
 * Provides a single interface for all email processing operations
 */
export class EmailAPI {
  /**
   * Process single email
   */
  static async processEmail(request: EmailProcessRequest) {
    return EmailProcessingAPI.processEmail(request);
  }

  /**
   * Process batch of emails
   */
  static async processBatchEmails(request: BatchEmailProcessRequest) {
    return EmailProcessingAPI.processBatchEmails(request);
  }

  /**
   * Validate email without processing
   */
  static async validateEmail(request: Pick<EmailProcessRequest, 'subject' | 'fromEmail' | 'htmlContent'>) {
    return EmailProcessingAPI.validateEmail(request);
  }

  /**
   * Get processing status
   */
  static async getProcessingStatus(id: string) {
    return EmailStatusAPI.getProcessingStatus(id);
  }

  /**
   * Get processing history
   */
  static async getProcessingHistory(page?: number, pageSize?: number, filter?: any) {
    return EmailStatusAPI.getProcessingHistory(page, pageSize, filter);
  }

  /**
   * Get processing statistics
   */
  static async getProcessingStats() {
    return EmailStatusAPI.getProcessingStats();
  }

  /**
   * Get system health check
   */
  static async getHealthCheck() {
    return EmailStatusAPI.getHealthCheck();
  }

  /**
   * Get import jobs
   */
  static async getImportJobs(page?: number, pageSize?: number, filter?: any) {
    return EmailManagementAPI.getImportJobs(page, pageSize, filter);
  }

  /**
   * Create import job
   */
  static async createImportJob(request: ImportJobCreateRequest) {
    return EmailManagementAPI.createImportJob(request);
  }

  /**
   * Get review queue
   */
  static async getReviewQueue(page?: number, pageSize?: number, filter?: any) {
    return EmailManagementAPI.getReviewQueue(page, pageSize, filter);
  }

  /**
   * Manage review queue
   */
  static async manageReviewQueue(request: ReviewManagementRequest) {
    return EmailManagementAPI.manageReviewQueue(request);
  }

  /**
   * Retry failed processing
   */
  static async retryProcessing(request: RetryRequest) {
    return EmailManagementAPI.retryProcessing(request);
  }
}

export default EmailAPI;