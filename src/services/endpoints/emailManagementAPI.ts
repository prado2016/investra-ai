/**
 * Email Import Management API
 * Task 6.3: Create endpoints for import history and manual review
 * API endpoints for managing email imports, retries, and manual reviews
 */

import { ManualReviewQueue } from '../email/manualReviewQueue';
import { EmailProcessingService } from '../email/emailProcessingService';
import { supabase } from '../../lib/supabase';
import type { APIResponse } from './emailProcessingAPI';
import type { ReviewQueueItem, ReviewQueueFilter, ReviewAction } from '../email/manualReviewQueue';

/**
 * Import management interfaces
 */
export interface ImportJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'single' | 'batch' | 'scheduled';
  source: {
    type: 'manual' | 'imap' | 'upload';
    details: Record<string, unknown>;
  };
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  results: {
    transactionsCreated: number;
    duplicatesRejected: number;
    reviewQueueItems: number;
    errors: string[];
    warnings: string[];
  };
  timestamps: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    lastUpdatedAt: string;
  };
  settings: {
    portfolioId?: string;
    duplicateHandling: 'strict' | 'lenient' | 'manual';
    retryOnFailure: boolean;
    maxRetries: number;
  };
  createdBy: string;
}

export interface ImportJobCreateRequest {
  name: string;
  description?: string;
  type: ImportJob['type'];
  source: ImportJob['source'];
  settings: Partial<ImportJob['settings']>;
}

export interface ImportJobListResponse {
  jobs: ImportJob[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
  };
}

export interface RetryRequest {
  itemIds?: string[];
  filter?: {
    status?: 'failed' | 'review-required';
    portfolioId?: string;
    dateRange?: { start: string; end: string };
  };
  options?: {
    resetManualReviews?: boolean;
    forceReprocess?: boolean;
  };
}

export interface RetryResponse {
  jobId: string;
  itemsToRetry: number;
  estimatedDuration: number;
}

export interface ReviewManagementRequest {
  action: 'approve-all' | 'reject-all' | 'escalate-all' | 'bulk-action';
  filter?: ReviewQueueFilter;
  bulkAction?: {
    action: ReviewAction['action'];
    reason: string;
    notes?: string;
  };
  reviewerId: string;
}

export interface ReviewManagementResponse {
  processed: number;
  successful: number;
  failed: number;
  results: {
    itemId: string;
    action: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Email Management API Class
 */
export class EmailManagementAPI {
  // In-memory storage for import jobs (in production, this would be a database)
  private static importJobs = new Map<string, ImportJob>();
  private static jobIdCounter = 1;

  /**
   * GET /api/email/import/jobs - List import jobs with pagination
   */
  static async getImportJobs(
    page = 1,
    pageSize = 20,
    filter?: {
      status?: ImportJob['status'];
      type?: ImportJob['type'];
      dateRange?: { start: string; end: string };
    }
  ): Promise<APIResponse<ImportJobListResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate pagination
      if (page < 1 || pageSize < 1 || pageSize > 100) {
        return this.errorResponse('INVALID_REQUEST', 'Invalid pagination parameters', requestId, startTime);
      }

      // Get all jobs for the user
      let jobs = Array.from(this.importJobs.values()).filter(job => job.createdBy === user.id);

      // Apply filters
      if (filter?.status) {
        jobs = jobs.filter(job => job.status === filter.status);
      }

      if (filter?.type) {
        jobs = jobs.filter(job => job.type === filter.type);
      }

      if (filter?.dateRange) {
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);
        jobs = jobs.filter(job => {
          const jobDate = new Date(job.timestamps.createdAt);
          return jobDate >= startDate && jobDate <= endDate;
        });
      }

      // Sort by creation date (newest first)
      jobs.sort((a, b) => new Date(b.timestamps.createdAt).getTime() - new Date(a.timestamps.createdAt).getTime());

      // Apply pagination
      const total = jobs.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedJobs = jobs.slice(startIndex, startIndex + pageSize);

      // Calculate summary
      const summary = {
        totalJobs: total,
        runningJobs: jobs.filter(job => job.status === 'running').length,
        completedJobs: jobs.filter(job => job.status === 'completed').length,
        failedJobs: jobs.filter(job => job.status === 'failed').length,
        pendingJobs: jobs.filter(job => job.status === 'pending').length
      };

      const response: ImportJobListResponse = {
        jobs: paginatedJobs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        summary
      };

      console.log(`📋 Retrieved import jobs: ${paginatedJobs.length} items (page ${page}/${totalPages})`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'JOBS_RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve import jobs',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/email/import/jobs/:id - Get specific import job
   */
  static async getImportJob(id: string): Promise<APIResponse<ImportJob>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate ID
      if (!id || id.trim().length === 0) {
        return this.errorResponse('INVALID_REQUEST', 'Import job ID is required', requestId, startTime);
      }

      // Get job from storage
      const job = this.importJobs.get(id);
      if (!job) {
        return this.errorResponse('NOT_FOUND', 'Import job not found', requestId, startTime);
      }

      // Check ownership
      if (job.createdBy !== user.id) {
        return this.errorResponse('FORBIDDEN', 'Access denied to this import job', requestId, startTime);
      }

      console.log(`📋 Retrieved import job: ${id}`);

      return this.successResponse(job, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'JOB_RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve import job',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/email/import/jobs - Create new import job
   */
  static async createImportJob(request: ImportJobCreateRequest): Promise<APIResponse<ImportJob>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate request
      const validation = this.validateImportJobRequest(request);
      if (!validation.isValid) {
        return this.errorResponse('INVALID_REQUEST', validation.errors.join(', '), requestId, startTime);
      }

      // Create job
      const job: ImportJob = {
        id: `job-${this.jobIdCounter++}-${Date.now()}`,
        name: request.name,
        description: request.description,
        status: 'pending',
        type: request.type,
        source: request.source,
        progress: {
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0
        },
        results: {
          transactionsCreated: 0,
          duplicatesRejected: 0,
          reviewQueueItems: 0,
          errors: [],
          warnings: []
        },
        timestamps: {
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        },
        settings: {
          duplicateHandling: 'manual',
          retryOnFailure: true,
          maxRetries: 3,
          ...request.settings
        },
        createdBy: user.id
      };

      // Store job
      this.importJobs.set(job.id, job);

      console.log(`📋 Created import job: ${job.id} - ${job.name}`);

      return this.successResponse(job, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'JOB_CREATION_ERROR',
        error instanceof Error ? error.message : 'Failed to create import job',
        requestId,
        startTime
      );
    }
  }

  /**
   * PUT /api/email/import/jobs/:id/cancel - Cancel import job
   */
  static async cancelImportJob(id: string): Promise<APIResponse<ImportJob>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get job from storage
      const job = this.importJobs.get(id);
      if (!job) {
        return this.errorResponse('NOT_FOUND', 'Import job not found', requestId, startTime);
      }

      // Check ownership
      if (job.createdBy !== user.id) {
        return this.errorResponse('FORBIDDEN', 'Access denied to this import job', requestId, startTime);
      }

      // Check if job can be cancelled
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return this.errorResponse('INVALID_STATE', 'Job cannot be cancelled in current state', requestId, startTime);
      }

      // Update job status
      job.status = 'cancelled';
      job.timestamps.lastUpdatedAt = new Date().toISOString();
      job.timestamps.completedAt = new Date().toISOString();

      console.log(`❌ Cancelled import job: ${id}`);

      return this.successResponse(job, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'JOB_CANCELLATION_ERROR',
        error instanceof Error ? error.message : 'Failed to cancel import job',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/email/import/retry - Retry failed processing
   */
  static async retryProcessing(request: RetryRequest): Promise<APIResponse<RetryResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Create retry job
      const retryJob: ImportJob = {
        id: `retry-${this.jobIdCounter++}-${Date.now()}`,
        name: `Retry Processing - ${new Date().toISOString()}`,
        description: 'Retrying failed email processing',
        status: 'pending',
        type: 'batch',
        source: {
          type: 'manual',
          details: { retry: true, originalRequest: request }
        },
        progress: {
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0
        },
        results: {
          transactionsCreated: 0,
          duplicatesRejected: 0,
          reviewQueueItems: 0,
          errors: [],
          warnings: []
        },
        timestamps: {
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        },
        settings: {
          duplicateHandling: 'manual',
          retryOnFailure: true,
          maxRetries: 3,
          ...request.options
        },
        createdBy: user.id
      };

      // Store retry job
      this.importJobs.set(retryJob.id, retryJob);

      // Estimate number of items to retry (simplified)
      const itemsToRetry = request.itemIds?.length || 10;
      const estimatedDuration = itemsToRetry * 2; // 2 seconds per item estimate

      const response: RetryResponse = {
        jobId: retryJob.id,
        itemsToRetry,
        estimatedDuration
      };

      console.log(`🔄 Created retry job: ${retryJob.id} for ${itemsToRetry} items`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'RETRY_CREATION_ERROR',
        error instanceof Error ? error.message : 'Failed to create retry job',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/email/review/queue - Get manual review queue items
   */
  static async getReviewQueue(
    page = 1,
    pageSize = 20,
    filter?: ReviewQueueFilter
  ): Promise<APIResponse<{ items: ReviewQueueItem[]; pagination: any; stats: any }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get queue items with pagination
      const offset = (page - 1) * pageSize;
      const items = ManualReviewQueue.getQueueItems(filter, 'priority', 'desc', pageSize, offset);
      const allItems = ManualReviewQueue.getQueueItems(filter);
      const stats = ManualReviewQueue.getQueueStats();

      const total = allItems.length;
      const totalPages = Math.ceil(total / pageSize);

      const response = {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        stats
      };

      console.log(`🔍 Retrieved review queue: ${items.length} items (page ${page}/${totalPages})`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'QUEUE_RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve review queue',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/email/review/manage - Bulk review management
   */
  static async manageReviewQueue(request: ReviewManagementRequest): Promise<APIResponse<ReviewManagementResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get items to process
      const items = ManualReviewQueue.getQueueItems(request.filter);
      
      if (items.length === 0) {
        return this.errorResponse('NOT_FOUND', 'No items match the specified criteria', requestId, startTime);
      }

      if (items.length > 100) {
        return this.errorResponse('INVALID_REQUEST', 'Cannot process more than 100 items at once', requestId, startTime);
      }

      const results: ReviewManagementResponse['results'] = [];

      // Process items based on action
      for (const item of items) {
        try {
          let action: ReviewAction;

          switch (request.action) {
            case 'approve-all':
              action = {
                action: 'approve',
                reason: 'Bulk approval',
                reviewerId: request.reviewerId
              };
              break;
            case 'reject-all':
              action = {
                action: 'reject',
                reason: 'Bulk rejection',
                reviewerId: request.reviewerId
              };
              break;
            case 'escalate-all':
              action = {
                action: 'escalate',
                reason: 'Bulk escalation',
                reviewerId: request.reviewerId
              };
              break;
            case 'bulk-action':
              if (!request.bulkAction) {
                throw new Error('Bulk action details required');
              }
              action = {
                action: request.bulkAction.action,
                reason: request.bulkAction.reason,
                notes: request.bulkAction.notes,
                reviewerId: request.reviewerId
              };
              break;
            default:
              throw new Error('Invalid action type');
          }

          const result = await ManualReviewQueue.processReviewAction(item.id, action);
          
          results.push({
            itemId: item.id,
            action: action.action,
            success: result.success,
            error: result.error
          });

        } catch (error) {
          results.push({
            itemId: item.id,
            action: request.action,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const response: ReviewManagementResponse = {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      console.log(`⚡ Bulk review action completed: ${response.successful}/${response.processed} successful`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'REVIEW_MANAGEMENT_ERROR',
        error instanceof Error ? error.message : 'Failed to manage review queue',
        requestId,
        startTime
      );
    }
  }

  /**
   * Validate import job creation request
   */
  private static validateImportJobRequest(request: ImportJobCreateRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.name || request.name.trim().length === 0) {
      errors.push('Job name is required');
    }

    if (!request.type || !['single', 'batch', 'scheduled'].includes(request.type)) {
      errors.push('Valid job type is required (single, batch, or scheduled)');
    }

    if (!request.source || !request.source.type) {
      errors.push('Source type is required');
    }

    if (request.source && !['manual', 'imap', 'upload'].includes(request.source.type)) {
      errors.push('Valid source type is required (manual, imap, or upload)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `mgmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
}

export default EmailManagementAPI;