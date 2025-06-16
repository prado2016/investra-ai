/**
 * Email Processing API Endpoints
 * Task 6.1: Create POST /api/email/process for incoming emails
 * RESTful API interface for email processing operations
 */

import { EmailProcessingService } from '../email/emailProcessingService';
import { MultiLevelDuplicateDetection } from '../email/multiLevelDuplicateDetection';
import { ManualReviewQueue } from '../email/manualReviewQueue';
import { supabase } from '../../lib/supabase';
import type { EmailProcessingResult, ProcessingOptions } from '../email/emailProcessingService';
import type { User } from '@supabase/supabase-js';

/**
 * API Response interface following existing patterns
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    cached?: boolean;
    userId?: string;
  };
}

/**
 * Email processing request interfaces
 */
export interface EmailProcessRequest {
  subject: string;
  fromEmail: string;
  htmlContent: string;
  textContent?: string;
  receivedAt?: string;
  portfolioId?: string;
  options?: Partial<ProcessingOptions>;
}

export interface BatchEmailProcessRequest {
  emails: EmailProcessRequest[];
  portfolioId?: string;
  options?: Partial<ProcessingOptions>;
}

export interface EmailProcessResponse extends EmailProcessingResult {
  id: string;
  portfolioId: string;
  processedAt: string;
  duplicateCheckResult?: {
    isDuplicate: boolean;
    confidence: number;
    action: 'accept' | 'reject' | 'review';
    reviewQueueId?: string;
  };
}

export interface BatchProcessResponse {
  processed: EmailProcessResponse[];
  failed: {
    index: number;
    email: EmailProcessRequest;
    error: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duplicates: number;
    reviewRequired: number;
  };
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Email Processing API Class
 */
export class EmailProcessingAPI {
  /**
   * POST /api/email/process - Process single email
   */
  static async processEmail(request: EmailProcessRequest): Promise<APIResponse<EmailProcessResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate request
      const validation = this.validateEmailProcessRequest(request);
      if (!validation.isValid) {
        return this.errorResponse('INVALID_REQUEST', validation.errors.join(', '), requestId, startTime, { 
          validation: validation.errors 
        });
      }

      // Process email through existing service
      const processingResult = await EmailProcessingService.processEmail(
        request.subject,
        request.fromEmail,
        request.htmlContent,
        request.textContent,
        request.options
      );

      // Handle duplicate detection if processing was successful
      let duplicateCheckResult;
      let reviewQueueId;

      if (processingResult.success && processingResult.emailData) {
        const portfolioId = request.portfolioId || 'default';
        
        // Run duplicate detection
        const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
          processingResult.emailData,
          portfolioId
        );

        duplicateCheckResult = {
          isDuplicate: duplicateResult.recommendation === 'reject',
          confidence: duplicateResult.overallConfidence,
          action: duplicateResult.recommendation
        };

        // Add to review queue if needed
        if (duplicateResult.recommendation === 'review') {
          const identification = {
            messageId: `generated-${Date.now()}`,
            emailHash: `hash-${Date.now()}`,
            orderIds: [],
            confidence: 0.9
          };

          const queueItem = await ManualReviewQueue.addToQueue(
            processingResult.emailData,
            identification,
            duplicateResult,
            portfolioId
          );

          reviewQueueId = queueItem.id;
          duplicateCheckResult.reviewQueueId = reviewQueueId;
        }
      }

      // Build response
      const response: EmailProcessResponse = {
        ...processingResult,
        id: requestId,
        portfolioId: request.portfolioId || 'default',
        processedAt: new Date().toISOString(),
        duplicateCheckResult
      };

      console.log(`📧 Email processed successfully: ${requestId}`);
      
      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error(`❌ Email processing failed: ${requestId}`, error);
      
      return this.errorResponse(
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Email processing failed',
        requestId,
        startTime,
        { stack: error instanceof Error ? error.stack : undefined }
      );
    }
  }

  /**
   * POST /api/email/batch - Process multiple emails
   */
  static async processBatchEmails(request: BatchEmailProcessRequest): Promise<APIResponse<BatchProcessResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate batch request
      if (!request.emails || !Array.isArray(request.emails) || request.emails.length === 0) {
        return this.errorResponse('INVALID_REQUEST', 'Emails array is required and cannot be empty', requestId, startTime);
      }

      if (request.emails.length > 50) {
        return this.errorResponse('INVALID_REQUEST', 'Batch size cannot exceed 50 emails', requestId, startTime);
      }

      const processed: EmailProcessResponse[] = [];
      const failed: BatchProcessResponse['failed'] = [];
      let duplicatesCount = 0;
      let reviewRequiredCount = 0;

      // Process emails in parallel (with concurrency limit)
      const concurrencyLimit = 5;
      const batches = this.chunkArray(request.emails, concurrencyLimit);

      for (const batch of batches) {
        const promises = batch.map(async (email, batchIndex) => {
          const globalIndex = processed.length + failed.length + batchIndex;
          
          try {
            const emailRequest: EmailProcessRequest = {
              ...email,
              portfolioId: email.portfolioId || request.portfolioId
            };

            const result = await this.processEmail(emailRequest);
            
            if (result.success && result.data) {
              processed.push(result.data);
              
              if (result.data.duplicateCheckResult?.isDuplicate) {
                duplicatesCount++;
              }
              
              if (result.data.duplicateCheckResult?.action === 'review') {
                reviewRequiredCount++;
              }
            } else {
              failed.push({
                index: globalIndex,
                email,
                error: result.error?.message || 'Processing failed'
              });
            }
          } catch (error) {
            failed.push({
              index: globalIndex,
              email,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        await Promise.all(promises);
      }

      const summary = {
        total: request.emails.length,
        successful: processed.length,
        failed: failed.length,
        duplicates: duplicatesCount,
        reviewRequired: reviewRequiredCount
      };

      const response: BatchProcessResponse = {
        processed,
        failed,
        summary
      };

      console.log(`📧 Batch processing completed: ${requestId}`, summary);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error(`❌ Batch processing failed: ${requestId}`, error);
      
      return this.errorResponse(
        'BATCH_PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Batch processing failed',
        requestId,
        startTime,
        { stack: error instanceof Error ? error.stack : undefined }
      );
    }
  }

  /**
   * POST /api/email/validate - Validate email without processing
   */
  static async validateEmail(request: Pick<EmailProcessRequest, 'subject' | 'fromEmail' | 'htmlContent'>): Promise<APIResponse<ValidationResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      const validation = this.validateEmailProcessRequest(request);
      
      return this.successResponse(validation, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Validation failed',
        requestId,
        startTime
      );
    }
  }

  /**
   * Validate email processing request
   */
  private static validateEmailProcessRequest(request: Partial<EmailProcessRequest>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!request.subject || request.subject.trim().length === 0) {
      errors.push('Subject is required');
    }

    if (!request.fromEmail || request.fromEmail.trim().length === 0) {
      errors.push('From email is required');
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.fromEmail)) {
        errors.push('From email format is invalid');
      }
    }

    if (!request.htmlContent || request.htmlContent.trim().length === 0) {
      errors.push('HTML content is required');
    }

    // Wealthsimple email validation
    if (request.fromEmail && !request.fromEmail.includes('wealthsimple')) {
      warnings.push('Email is not from Wealthsimple - processing may fail');
    }

    // Subject validation
    if (request.subject && !request.subject.toLowerCase().includes('trade confirmation')) {
      warnings.push('Subject does not appear to be a trade confirmation');
    }

    // Content size validation
    if (request.htmlContent && request.htmlContent.length > 100000) {
      warnings.push('HTML content is very large - may impact processing performance');
    }

    // Portfolio ID validation
    if (request.portfolioId && request.portfolioId.trim().length === 0) {
      errors.push('Portfolio ID cannot be empty if provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create success response
   */
  private static successResponse<T>(
    data: T,
    requestId: string,
    startTime: number,
    userId?: string,
    cached = false
  ): APIResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        cached,
        userId
      }
    };
  }

  /**
   * Create error response
   */
  private static errorResponse<T = never>(
    code: string,
    message: string,
    requestId: string,
    startTime: number,
    details?: unknown,
    userId?: string
  ): APIResponse<T> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        userId
      }
    };
  }

  /**
   * Utility function to chunk array for batch processing
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export default EmailProcessingAPI;