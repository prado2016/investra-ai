/**
 * Email Status Tracking API
 * Task 6.2: Implement GET /api/email/status for processing status
 * API endpoints for monitoring email processing status and history
 */

import { ManualReviewQueue } from '../email/manualReviewQueue';
import { supabase } from '../../lib/supabase';
import type { APIResponse } from './emailProcessingAPI';
import type { ReviewQueueItem, ReviewQueueStats, ReviewQueueFilter } from '../email/manualReviewQueue';

/**
 * Email processing status interfaces
 */
export interface ProcessingStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'review-required';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  stages: {
    parsing: 'pending' | 'completed' | 'failed';
    duplicateCheck: 'pending' | 'completed' | 'failed';
    symbolProcessing: 'pending' | 'completed' | 'failed';
    transactionCreation: 'pending' | 'completed' | 'failed';
  };
  result?: {
    success: boolean;
    transactionId?: string;
    duplicateAction?: 'accept' | 'reject' | 'review';
    reviewQueueId?: string;
  };
  timestamps: {
    startedAt: string;
    completedAt?: string;
    lastUpdatedAt: string;
  };
  metadata: {
    emailSubject: string;
    fromEmail: string;
    portfolioId: string;
    processingTime?: number;
  };
  errors: string[];
  warnings: string[];
}

export interface ProcessingHistoryItem {
  id: string;
  emailSubject: string;
  fromEmail: string;
  portfolioId: string;
  status: ProcessingStatus['status'];
  processedAt: string;
  processingTime: number;
  success: boolean;
  duplicateAction?: 'accept' | 'reject' | 'review';
  transactionId?: string;
  reviewQueueId?: string;
  errorCount: number;
  warningCount: number;
}

export interface ProcessingHistoryResponse {
  items: ProcessingHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duplicates: number;
    reviewRequired: number;
    averageProcessingTime: number;
  };
}

export interface ProcessingStatsResponse {
  overview: {
    totalProcessed: number;
    successRate: number;
    averageProcessingTime: number;
    duplicateRate: number;
    reviewRate: number;
  };
  timeframes: {
    last24Hours: ProcessingTimeframeStats;
    last7Days: ProcessingTimeframeStats;
    last30Days: ProcessingTimeframeStats;
  };
  queue: ReviewQueueStats;
  trends: {
    processingVolume: Array<{ date: string; count: number }>;
    successRate: Array<{ date: string; rate: number }>;
    duplicateRate: Array<{ date: string; rate: number }>;
  };
}

export interface ProcessingTimeframeStats {
  processed: number;
  successful: number;
  failed: number;
  duplicates: number;
  reviewRequired: number;
  averageProcessingTime: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    emailParsing: 'operational' | 'degraded' | 'down';
    duplicateDetection: 'operational' | 'degraded' | 'down';
    symbolProcessing: 'operational' | 'degraded' | 'down';
    reviewQueue: 'operational' | 'degraded' | 'down';
  };
  performance: {
    averageResponseTime: number;
    queueDepth: number;
    errorRate: number;
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
  lastChecked: string;
}

/**
 * Email Status API Class
 */
export class EmailStatusAPI {
  // In-memory storage for processing status (in production, this would be a database)
  private static processingStatuses = new Map<string, ProcessingStatus>();
  private static processingHistory: ProcessingHistoryItem[] = [];
  private static startupTime = Date.now();

  /**
   * GET /api/email/status/:id - Get processing status by ID
   */
  static async getProcessingStatus(id: string): Promise<APIResponse<ProcessingStatus>> {
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
        return this.errorResponse('INVALID_REQUEST', 'Processing ID is required', requestId, startTime);
      }

      // Get status from storage
      const status = this.processingStatuses.get(id);
      if (!status) {
        return this.errorResponse('NOT_FOUND', 'Processing status not found', requestId, startTime);
      }

      console.log(`📊 Retrieved processing status: ${id}`);

      return this.successResponse(status, requestId, startTime, user.id);

    } catch (error) {
      console.error(`❌ Failed to get processing status: ${id}`, error);

      return this.errorResponse(
        'STATUS_RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve status',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/email/status - Get processing status for multiple IDs
   */
  static async getMultipleProcessingStatus(ids: string[]): Promise<APIResponse<ProcessingStatus[]>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate IDs
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return this.errorResponse('INVALID_REQUEST', 'Processing IDs array is required', requestId, startTime);
      }

      if (ids.length > 100) {
        return this.errorResponse('INVALID_REQUEST', 'Cannot request more than 100 statuses at once', requestId, startTime);
      }

      // Get statuses from storage
      const statuses: ProcessingStatus[] = [];
      for (const id of ids) {
        const status = this.processingStatuses.get(id);
        if (status) {
          statuses.push(status);
        }
      }

      console.log(`📊 Retrieved ${statuses.length}/${ids.length} processing statuses`);

      return this.successResponse(statuses, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'MULTIPLE_STATUS_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve statuses',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/email/history - Get processing history with pagination
   */
  static async getProcessingHistory(
    page = 1,
    pageSize = 20,
    filter?: {
      status?: ProcessingStatus['status'];
      portfolioId?: string;
      dateRange?: { start: string; end: string };
    }
  ): Promise<APIResponse<ProcessingHistoryResponse>> {
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

      // Apply filters
      let filteredHistory = [...this.processingHistory];

      if (filter?.status) {
        filteredHistory = filteredHistory.filter(item => item.status === filter.status);
      }

      if (filter?.portfolioId) {
        filteredHistory = filteredHistory.filter(item => item.portfolioId === filter.portfolioId);
      }

      if (filter?.dateRange) {
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);
        filteredHistory = filteredHistory.filter(item => {
          const itemDate = new Date(item.processedAt);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      // Sort by processed date (newest first)
      filteredHistory.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());

      // Apply pagination
      const total = filteredHistory.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const items = filteredHistory.slice(startIndex, startIndex + pageSize);

      // Calculate summary
      const summary = {
        totalProcessed: total,
        successful: filteredHistory.filter(item => item.success).length,
        failed: filteredHistory.filter(item => !item.success).length,
        duplicates: filteredHistory.filter(item => item.duplicateAction === 'reject').length,
        reviewRequired: filteredHistory.filter(item => item.duplicateAction === 'review').length,
        averageProcessingTime: total > 0 
          ? filteredHistory.reduce((sum, item) => sum + item.processingTime, 0) / total
          : 0
      };

      const response: ProcessingHistoryResponse = {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        summary
      };

      console.log(`📚 Retrieved processing history: ${items.length} items (page ${page}/${totalPages})`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'HISTORY_RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve history',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/email/stats - Get processing statistics
   */
  static async getProcessingStats(): Promise<APIResponse<ProcessingStatsResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate timeframe stats
      const last24HoursStats = this.calculateTimeframeStats(last24Hours, now);
      const last7DaysStats = this.calculateTimeframeStats(last7Days, now);
      const last30DaysStats = this.calculateTimeframeStats(last30Days, now);

      // Overall stats
      const totalProcessed = this.processingHistory.length;
      const successful = this.processingHistory.filter(item => item.success).length;
      const duplicates = this.processingHistory.filter(item => item.duplicateAction === 'reject').length;
      const reviewRequired = this.processingHistory.filter(item => item.duplicateAction === 'review').length;

      const overview = {
        totalProcessed,
        successRate: totalProcessed > 0 ? (successful / totalProcessed) * 100 : 0,
        averageProcessingTime: totalProcessed > 0 
          ? this.processingHistory.reduce((sum, item) => sum + item.processingTime, 0) / totalProcessed
          : 0,
        duplicateRate: totalProcessed > 0 ? (duplicates / totalProcessed) * 100 : 0,
        reviewRate: totalProcessed > 0 ? (reviewRequired / totalProcessed) * 100 : 0
      };

      // Get queue stats
      const queueStats = ManualReviewQueue.getQueueStats();

      // Generate trend data (simplified for now)
      const trends = {
        processingVolume: this.generateTrendData('volume', 7),
        successRate: this.generateTrendData('success', 7),
        duplicateRate: this.generateTrendData('duplicate', 7)
      };

      const response: ProcessingStatsResponse = {
        overview,
        timeframes: {
          last24Hours: last24HoursStats,
          last7Days: last7DaysStats,
          last30Days: last30DaysStats
        },
        queue: queueStats,
        trends
      };

      console.log(`📈 Retrieved processing statistics`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'STATS_RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Failed to retrieve statistics',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/email/health - Health check endpoint
   */
  static async getHealthCheck(): Promise<APIResponse<HealthCheckResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Calculate uptime
      const uptimeSeconds = Math.floor((Date.now() - this.startupTime) / 1000);
      const uptimeFormatted = this.formatUptime(uptimeSeconds);

      // Check service health (simplified)
      const services = {
        emailParsing: 'operational' as const,
        duplicateDetection: 'operational' as const,
        symbolProcessing: 'operational' as const,
        reviewQueue: 'operational' as const
      };

      // Calculate performance metrics
      const queueStats = ManualReviewQueue.getQueueStats();
      const recentItems = this.processingHistory.filter(item => 
        new Date(item.processedAt).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
      );

      const performance = {
        averageResponseTime: recentItems.length > 0 
          ? recentItems.reduce((sum, item) => sum + item.processingTime, 0) / recentItems.length
          : 0,
        queueDepth: queueStats.byStatus.pending + queueStats.byStatus['in-review'],
        errorRate: recentItems.length > 0 
          ? (recentItems.filter(item => !item.success).length / recentItems.length) * 100
          : 0
      };

      // Determine overall health
      let status: HealthCheckResponse['status'] = 'healthy';
      if (performance.errorRate > 10 || performance.queueDepth > 100) {
        status = 'degraded';
      }
      if (performance.errorRate > 50 || performance.queueDepth > 500) {
        status = 'unhealthy';
      }

      const response: HealthCheckResponse = {
        status,
        services,
        performance,
        uptime: {
          seconds: uptimeSeconds,
          formatted: uptimeFormatted
        },
        lastChecked: new Date().toISOString()
      };

      return this.successResponse(response, requestId, startTime);

    } catch (error) {
      return this.errorResponse(
        'HEALTH_CHECK_ERROR',
        error instanceof Error ? error.message : 'Health check failed',
        requestId,
        startTime
      );
    }
  }

  /**
   * Internal method to add processing status
   */
  static addProcessingStatus(status: ProcessingStatus): void {
    this.processingStatuses.set(status.id, status);
    
    // Add to history when completed
    if (status.status === 'completed' || status.status === 'failed') {
      const historyItem: ProcessingHistoryItem = {
        id: status.id,
        emailSubject: status.metadata.emailSubject,
        fromEmail: status.metadata.fromEmail,
        portfolioId: status.metadata.portfolioId,
        status: status.status,
        processedAt: status.timestamps.completedAt || status.timestamps.lastUpdatedAt,
        processingTime: status.metadata.processingTime || 0,
        success: status.status === 'completed' && status.result?.success === true,
        duplicateAction: status.result?.duplicateAction,
        transactionId: status.result?.transactionId,
        reviewQueueId: status.result?.reviewQueueId,
        errorCount: status.errors.length,
        warningCount: status.warnings.length
      };

      this.processingHistory.push(historyItem);

      // Keep only last 1000 items in memory
      if (this.processingHistory.length > 1000) {
        this.processingHistory = this.processingHistory.slice(-1000);
      }
    }
  }

  /**
   * Internal method to update processing status
   */
  static updateProcessingStatus(id: string, updates: Partial<ProcessingStatus>): void {
    const existing = this.processingStatuses.get(id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        timestamps: {
          ...existing.timestamps,
          ...updates.timestamps,
          lastUpdatedAt: new Date().toISOString()
        }
      };
      this.processingStatuses.set(id, updated);
    }
  }

  /**
   * Calculate timeframe statistics
   */
  private static calculateTimeframeStats(startDate: Date, endDate: Date): ProcessingTimeframeStats {
    const items = this.processingHistory.filter(item => {
      const itemDate = new Date(item.processedAt);
      return itemDate >= startDate && itemDate <= endDate;
    });

    return {
      processed: items.length,
      successful: items.filter(item => item.success).length,
      failed: items.filter(item => !item.success).length,
      duplicates: items.filter(item => item.duplicateAction === 'reject').length,
      reviewRequired: items.filter(item => item.duplicateAction === 'review').length,
      averageProcessingTime: items.length > 0 
        ? items.reduce((sum, item) => sum + item.processingTime, 0) / items.length
        : 0
    };
  }

  /**
   * Generate trend data for charts
   */
  private static generateTrendData(type: 'volume' | 'success' | 'duplicate', days: number) {
    const trends = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayItems = this.processingHistory.filter(item => 
        item.processedAt.startsWith(dateStr)
      );

      let value = 0;
      switch (type) {
        case 'volume':
          value = dayItems.length;
          break;
        case 'success':
          value = dayItems.length > 0 ? (dayItems.filter(item => item.success).length / dayItems.length) * 100 : 0;
          break;
        case 'duplicate':
          value = dayItems.length > 0 ? (dayItems.filter(item => item.duplicateAction === 'reject').length / dayItems.length) * 100 : 0;
          break;
      }

      trends.push({ date: dateStr, [type === 'volume' ? 'count' : 'rate']: value });
    }

    return trends;
  }

  /**
   * Format uptime duration
   */
  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

export default EmailStatusAPI;