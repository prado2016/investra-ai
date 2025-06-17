/**
 * Type definitions for Email Processing API
 * Based on the frontend API interfaces
 */

export interface APIResponse<T = any> {
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
  };
}

export interface EmailProcessRequest {
  subject: string;
  fromEmail: string;
  htmlContent: string;
  textContent?: string;
  receivedDate?: string;
  messageId?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content?: string;
  }>;
}

export interface BatchEmailProcessRequest {
  emails: EmailProcessRequest[];
  batchId?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface EmailProcessResponse {
  emailId: string;
  status: 'processed' | 'failed' | 'pending';
  extractedData?: {
    transactions?: Array<{
      type: string;
      amount: number;
      currency: string;
      date: string;
      description: string;
      symbol?: string;
    }>;
    balances?: Array<{
      account: string;
      amount: number;
      currency: string;
      asOfDate: string;
    }>;
    metadata?: Record<string, any>;
  };
  processingTime?: number;
  errors?: string[];
}

export interface ProcessingStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  emailCount?: number;
  processedCount?: number;
  failedCount?: number;
  errors?: string[];
}

export interface ProcessingHistoryItem {
  id: string;
  timestamp: string;
  emailSubject: string;
  fromEmail: string;
  status: 'success' | 'failed' | 'partial';
  transactionsExtracted: number;
  processingTime: number;
  errors?: string[];
}

export interface ProcessingStatsResponse {
  totalEmails: number;
  successfullyProcessed: number;
  failed: number;
  averageProcessingTime: number;
  lastProcessedDate?: string;
  processingRatePerHour: number;
  mostCommonErrors: Array<{
    error: string;
    count: number;
  }>;
}

export interface ImportJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  source: 'imap' | 'manual' | 'bulk';
  startTime: string;
  endTime?: string;
  totalEmails: number;
  processedEmails: number;
  failedEmails: number;
  progress: number;
  errors?: string[];
  config?: Record<string, any>;
}

export interface ReviewQueueItem {
  id: string;
  emailId: string;
  subject: string;
  fromEmail: string;
  receivedDate: string;
  reason: 'parsing_failed' | 'low_confidence' | 'manual_review_required';
  confidence?: number;
  suggestedActions: string[];
  extractedData?: any;
  originalContent?: string;
}

export interface IMAPServiceStatus {
  status: 'running' | 'stopped' | 'error';
  lastSync?: string;
  emailsProcessed?: number;
  errors?: string[];
  config?: {
    server: string;
    port: number;
    username: string;
    useSSL: boolean;
    folder: string;
  };
}
