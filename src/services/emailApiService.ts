/**
 * Email API Service
 * Provides typed interfaces to email processing endpoints
 */

import { ApiClient } from './apiClient';

// Types for email processing
export interface EmailProcessingStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  duplicates: number;
  reviewRequired: number;
  averageProcessingTime: number;
  lastProcessedAt?: string;
}

export interface IMAPServiceStatus {
  status: 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting';
  healthy: boolean;
  uptime: number;
  lastError?: string;
  startedAt?: string;
}

export interface ProcessingQueueItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'review-required';
  emailSubject: string;
  fromEmail: string;
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
  timestamps: {
    startedAt: string;
    completedAt?: string;
    lastUpdatedAt: string;
  };
  errors: string[];
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

// API Response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}

export class EmailApiService {
  // Email Processing Stats
  static async getProcessingStats(): Promise<EmailProcessingStats> {
    const response = await ApiClient.get<ApiResponse<{
      overview: {
        totalProcessed: number;
        successRate: number;
        averageProcessingTime: number;
        duplicateRate: number;
        reviewRate: number;
      };
      timeframes: {
        last30Days: {
          processed: number;
          successful: number;
          failed: number;
          duplicates: number;
          reviewRequired: number;
          averageProcessingTime: number;
        };
      };
    }>>('/api/email/stats');

    // Transform the API response to match our interface
    const { overview, timeframes } = response.data;
    return {
      totalProcessed: overview.totalProcessed,
      successful: timeframes.last30Days.successful,
      failed: timeframes.last30Days.failed,
      duplicates: timeframes.last30Days.duplicates,
      reviewRequired: timeframes.last30Days.reviewRequired,
      averageProcessingTime: overview.averageProcessingTime,
      lastProcessedAt: new Date().toISOString()
    };
  }

  // IMAP Service Management
  static async getIMAPStatus(): Promise<IMAPServiceStatus> {
    const response = await ApiClient.get<ApiResponse<{
      status: string;
      isRunning: boolean;
      stats: {
        connected: boolean;
        lastSync: string;
        totalProcessed: number;
        errors: number;
      };
    }>>('/api/imap/status');

    // Transform the API response to match our interface
    const { isRunning, stats } = response.data;
    return {
      status: isRunning ? 'running' : 'stopped',
      healthy: stats.connected,
      uptime: Date.now() - new Date(stats.lastSync).getTime(), // Approximate uptime
      startedAt: stats.lastSync
    };
  }

  static async startIMAPService(): Promise<IMAPServiceStatus> {
    return ApiClient.post<IMAPServiceStatus>('/api/imap/start');
  }

  static async stopIMAPService(): Promise<IMAPServiceStatus> {
    return ApiClient.post<IMAPServiceStatus>('/api/imap/stop');
  }

  static async restartIMAPService(): Promise<IMAPServiceStatus> {
    return ApiClient.post<IMAPServiceStatus>('/api/imap/restart');
  }

  // Processing Queue
  static async getProcessingQueue(): Promise<ProcessingQueueItem[]> {
    const response = await ApiClient.get<ApiResponse<ProcessingQueueItem[]>>('/api/email/review/queue');
    return response.data;
  }

  static async processEmailsNow(): Promise<{ success: boolean; message: string }> {
    return ApiClient.post<{ success: boolean; message: string }>('/api/imap/process-now');
  }

  // Health Check
  static async getHealthCheck(): Promise<HealthCheckResponse> {
    const response = await ApiClient.get<ApiResponse<HealthCheckResponse>>('/api/email/health');
    return response.data;
  }

  // Processing History
  static async getProcessingHistory(page = 1, pageSize = 20): Promise<{
    items: ProcessingQueueItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    return ApiClient.get(`/api/email/history?page=${page}&pageSize=${pageSize}`);
  }
}

export default EmailApiService;
