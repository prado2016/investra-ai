/**
 * Enhanced Email API Service
 * Compatible with standalone-enhanced-server.ts endpoints
 * Provides full IMAP processing capabilities
 */

import { ApiClient } from './apiClient';

// Enhanced types for the production server with full IMAP capabilities
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
  lastSync?: string;
  emailsProcessed?: number;
  config?: {
    server: string;
    port: number;
    username: string;
    useSSL: boolean;
    folder: string;
  };
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
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  services: {
    api: boolean;
    database: boolean;
    imap: boolean;
    monitoring: boolean;
  };
  lastChecked: string;
}

export interface ManualReviewItem {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'escalated';
  emailSubject: string;
  fromEmail: string;
  flaggedReason: string;
  confidence: number;
  similarTransactions: {
    id: string;
    date: string;
    symbol: string;
    amount: number;
    type: string;
  }[];
  timestamps: {
    flaggedAt: string;
    lastUpdatedAt: string;
    completedAt?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  slaTarget: string;
  extractedData: {
    symbol: string;
    amount: number;
    date: string;
    type: string;
  };
}

export interface ManualReviewStats {
  pendingReviews: number;
  completedToday: number;
  averageReviewTime: number;
  slaCompliance: number;
  escalatedItems: number;
  queueHealth: 'good' | 'warning' | 'critical';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime?: number;
  };
}

/**
 * Enhanced Email API Service - for production server with full IMAP capabilities
 */
export class EnhancedEmailApiService {
  
  // Email Processing Statistics
  static async getProcessingStats(): Promise<EmailProcessingStats> {
    try {
      const response = await ApiClient.get<ApiResponse<EmailProcessingStats>>('/api/email/stats');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch processing stats');
    } catch (error) {
      console.error('Failed to fetch processing stats:', error);
      // Return fallback stats
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
        reviewRequired: 0,
        averageProcessingTime: 0
      };
    }
  }

  // IMAP Service Management - FULL implementation for enhanced server
  static async getIMAPStatus(): Promise<IMAPServiceStatus> {
    try {
      const response = await ApiClient.get<ApiResponse<IMAPServiceStatus>>('/api/imap/status');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch IMAP status');
    } catch (error) {
      console.error('Failed to fetch IMAP status:', error);
      return {
        status: 'error',
        healthy: false,
        uptime: 0,
        lastError: 'Cannot connect to IMAP service',
        startedAt: undefined
      };
    }
  }

  static async startIMAPService(): Promise<IMAPServiceStatus> {
    try {
      const response = await ApiClient.post<ApiResponse<IMAPServiceStatus>>('/api/imap/start', {});
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to start IMAP service');
    } catch (error) {
      console.error('Failed to start IMAP service:', error);
      return {
        status: 'error',
        healthy: false,
        uptime: 0,
        lastError: 'Failed to start IMAP service',
        startedAt: undefined
      };
    }
  }

  static async stopIMAPService(): Promise<IMAPServiceStatus> {
    try {
      const response = await ApiClient.post<ApiResponse<IMAPServiceStatus>>('/api/imap/stop', {});
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to stop IMAP service');
    } catch (error) {
      console.error('Failed to stop IMAP service:', error);
      return {
        status: 'error',
        healthy: false,
        uptime: 0,
        lastError: 'Failed to stop IMAP service',
        startedAt: undefined
      };
    }
  }

  static async restartIMAPService(): Promise<IMAPServiceStatus> {
    try {
      const response = await ApiClient.post<ApiResponse<IMAPServiceStatus>>('/api/imap/restart', {});
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to restart IMAP service');
    } catch (error) {
      console.error('Failed to restart IMAP service:', error);
      return {
        status: 'error',
        healthy: false,
        uptime: 0,
        lastError: 'Failed to restart IMAP service',
        startedAt: undefined
      };
    }
  }

  // Manual email processing
  static async processEmailsNow(): Promise<void> {
    try {
      const response = await ApiClient.post<ApiResponse<any>>('/api/imap/process-now', {});
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to process emails');
      }
    } catch (error) {
      console.error('Failed to process emails manually:', error);
      throw error;
    }
  }

  // Processing Queue
  static async getProcessingQueue(): Promise<ProcessingQueueItem[]> {
    try {
      const response = await ApiClient.get<ApiResponse<ProcessingQueueItem[]>>('/api/email/processing/queue');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch processing queue');
    } catch (error) {
      console.error('Failed to fetch processing queue:', error);
      return [];
    }
  }

  // Health Check
  static async getHealthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await ApiClient.get<ApiResponse<HealthCheckResponse>>('/health');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch health status');
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      return {
        status: 'unhealthy',
        uptime: 0,
        services: {
          api: false,
          database: false,
          imap: false,
          monitoring: false
        },
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Email Connection Test - Available on enhanced server
  static async testEmailConnection(config: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ApiClient.post<ApiResponse<any>>('/api/email/test-connection', config);
      return {
        success: response.success,
        message: response.data?.message || 'Connection test completed'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  // Manual Review Queue Management
  static async getManualReviewQueue(): Promise<ManualReviewItem[]> {
    try {
      const response = await ApiClient.get<ApiResponse<ManualReviewItem[]>>('/api/manual-review/queue');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch manual review queue');
    } catch (error) {
      console.error('Failed to fetch manual review queue:', error);
      return [];
    }
  }

  static async processReviewAction(itemId: string, action: string, decision: 'approve' | 'reject' | 'escalate', notes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ApiClient.post<ApiResponse<any>>('/api/manual-review/action', {
        itemId,
        action,
        decision,
        notes
      });
      
      return {
        success: response.success,
        message: response.data?.message || 'Review action processed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process review action'
      };
    }
  }

  static async getManualReviewStats(): Promise<ManualReviewStats> {
    try {
      const response = await ApiClient.get<ApiResponse<ManualReviewStats>>('/api/manual-review/stats');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch manual review stats');
    } catch (error) {
      console.error('Failed to fetch manual review stats:', error);
      return {
        pendingReviews: 0,
        completedToday: 0,
        averageReviewTime: 0,
        slaCompliance: 0,
        escalatedItems: 0,
        queueHealth: 'critical'
      };
    }
  }
}
