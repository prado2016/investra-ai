/**
 * Simple Email API Service
 * Compatible with simple-production-server.ts endpoints
 * Provides graceful fallbacks for missing advanced features
 */

import { ApiClient } from './apiClient';

// Simplified types for the basic production server
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
  checks: {
    database: boolean;
    imap: boolean;
    emailProcessing: boolean;
  };
  uptime: number;
  version: string;
}

// API Response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class SimpleEmailApiService {
  // Email Processing Stats - Mock fallback since advanced server not available
  static async getProcessingStats(): Promise<EmailProcessingStats> {
    try {
      // Check server health first
      await ApiClient.get<ApiResponse<any>>('/api/status');
      
      // Simple server is available but doesn't provide detailed stats
      // Return mock data indicating the server is functional
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
        reviewRequired: 0,
        averageProcessingTime: 0,
        lastProcessedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Simple production server not available, using offline data');
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

  // IMAP Service Management - Mock since simple server doesn't have IMAP endpoints
  static async getIMAPStatus(): Promise<IMAPServiceStatus> {
    try {
      // Check if server is responsive using the status endpoint
      await ApiClient.get<ApiResponse<any>>('/api/status');
      
      // Server is running but doesn't have IMAP management
      return {
        status: 'stopped',
        healthy: false,
        uptime: 0,
        lastError: 'IMAP service not available on simple production server',
        startedAt: undefined
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        uptime: 0,
        lastError: 'Cannot connect to API server',
        startedAt: undefined
      };
    }
  }

  static async startIMAPService(): Promise<IMAPServiceStatus> {
    console.warn('IMAP service management not available on simple production server');
    return {
      status: 'error',
      healthy: false,
      uptime: 0,
      lastError: 'IMAP service management not available',
      startedAt: undefined
    };
  }

  static async stopIMAPService(): Promise<IMAPServiceStatus> {
    console.warn('IMAP service management not available on simple production server');
    return {
      status: 'stopped',
      healthy: false,
      uptime: 0,
      lastError: 'IMAP service management not available',
      startedAt: undefined
    };
  }

  static async restartIMAPService(): Promise<IMAPServiceStatus> {
    console.warn('IMAP service management not available on simple production server');
    return {
      status: 'error',
      healthy: false,
      uptime: 0,
      lastError: 'IMAP service management not available',
      startedAt: undefined
    };
  }

  // Processing Queue - Mock since advanced queue not available
  static async getProcessingQueue(): Promise<ProcessingQueueItem[]> {
    console.warn('Processing queue not available on simple production server');
    return [];
  }

  static async processEmailsNow(): Promise<{ success: boolean; message: string }> {
    console.warn('Manual email processing not available on simple production server');
    return {
      success: false,
      message: 'Manual email processing not available on simple production server'
    };
  }

  // Health Check - Use available health endpoint
  static async getHealthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await ApiClient.get<ApiResponse<any>>('/health');
      
      return {
        status: 'healthy',
        checks: {
          database: false,  // Not available
          imap: false,     // Not available
          emailProcessing: true
        },
        uptime: response.data?.uptime || 0,
        version: '1.0.0'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: {
          database: false,
          imap: false,
          emailProcessing: false
        },
        uptime: 0,
        version: '1.0.0'
      };
    }
  }

  // Processing History - Mock since not available
  static async getProcessingHistory(_page = 1, _pageSize = 20): Promise<{
    items: ProcessingQueueItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    console.warn('Processing history not available on simple production server');
    return {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
      }
    };
  }

  // Email Connection Test - This IS available on simple production server
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

  // Email Processing - This IS available on simple production server
  static async processEmail(emailData: {
    subject: string;
    fromEmail: string;
    htmlContent: string;
    textContent?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await ApiClient.post<ApiResponse<any>>('/api/email/process', emailData);
      return {
        success: response.success,
        data: response.data,
        message: 'Email processed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Email processing failed'
      };
    }
  }
}

export default SimpleEmailApiService;
