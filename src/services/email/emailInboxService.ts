/**
 * Email Inbox Service
 * Manages emails in the IMAP inbox (pending review)
 */

import { supabase } from '../../lib/supabase';

export interface EmailInboxItem {
  id: string;
  user_id: string;
  message_id: string;
  thread_id?: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_email?: string;
  reply_to?: string;
  received_at: string;
  raw_content?: string;
  text_content?: string;
  html_content?: string;
  attachments_info?: any[];
  email_size?: number;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'processing' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailProcessResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class EmailInboxService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
    
    if (import.meta.env.MODE === 'production' && apiUrl) {
      return apiUrl;
    }
    
    return '';
  }

  /**
   * Get authentication headers with Supabase JWT token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.warn('Failed to get authentication token:', error);
    }

    return headers;
  }

  /**
   * Get all emails in the inbox for the current user
   */
  async getInboxEmails(
    status?: 'pending' | 'processing' | 'error',
    limit: number = 100
  ): Promise<ServiceResponse<EmailInboxItem[]>> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      
      if (status) {
        params.append('status', status);
      }
      params.append('limit', limit.toString());

      const response = await fetch(`${this.baseUrl}/api/imap/inbox?${params}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: [],
            message: 'No emails found'
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('Failed to get inbox emails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get inbox emails'
      };
    }
  }

  /**
   * Get a specific email by ID
   */
  async getEmail(emailId: string): Promise<ServiceResponse<EmailInboxItem>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/inbox/${emailId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Email not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Failed to get email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get email'
      };
    }
  }

  /**
   * Approve an email and process it into a transaction
   */
  async approveEmail(emailId: string, notes?: string): Promise<ServiceResponse<EmailProcessResult>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emailId,
          processingNotes: notes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Approval failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: {
          success: result.success,
          transactionId: result.transactionId,
          message: result.message
        },
        message: result.message || 'Email approved and processed'
      };
    } catch (error) {
      console.error('Failed to approve email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve email'
      };
    }
  }

  /**
   * Reject an email (move to processed without creating transaction)
   */
  async rejectEmail(emailId: string, reason?: string): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emailId,
          rejectionReason: reason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Rejection failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Email rejected successfully'
      };
    } catch (error) {
      console.error('Failed to reject email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject email'
      };
    }
  }

  /**
   * Delete an email permanently
   */
  async deleteEmail(emailId: string): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/inbox/${emailId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Deletion failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Email deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete email'
      };
    }
  }

  /**
   * Get inbox statistics
   */
  async getInboxStats(): Promise<ServiceResponse<{
    total: number;
    pending: number;
    processing: number;
    error: number;
    totalSize: number;
    latestEmail?: string;
  }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/inbox/stats`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: {
              total: 0,
              pending: 0,
              processing: 0,
              error: 0,
              totalSize: 0
            }
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Failed to get inbox stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get inbox stats'
      };
    }
  }

  /**
   * Search emails in the inbox
   */
  async searchEmails(
    query: string,
    filters?: {
      status?: 'pending' | 'processing' | 'error';
      fromDate?: string;
      toDate?: string;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<ServiceResponse<EmailInboxItem[]>> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      
      params.append('q', query);
      
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.fromDate) params.append('fromDate', filters.fromDate);
        if (filters.toDate) params.append('toDate', filters.toDate);
        if (filters.priority) params.append('priority', filters.priority);
      }

      const response = await fetch(`${this.baseUrl}/api/imap/inbox/search?${params}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('Failed to search emails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search emails'
      };
    }
  }

  /**
   * Update email status (for internal processing)
   */
  async updateEmailStatus(
    emailId: string,
    status: 'pending' | 'processing' | 'error',
    errorMessage?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/inbox/${emailId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          error_message: errorMessage || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Status update failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Email status updated successfully'
      };
    } catch (error) {
      console.error('Failed to update email status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update email status'
      };
    }
  }

  /**
   * Bulk operations on multiple emails
   */
  async bulkOperation(
    emailIds: string[],
    operation: 'approve' | 'reject' | 'delete',
    reason?: string
  ): Promise<ServiceResponse<{
    successful: string[];
    failed: Array<{ emailId: string; error: string }>;
  }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/inbox/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emailIds,
          operation,
          reason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Bulk operation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data,
        message: `Bulk ${operation} completed`
      };
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation'
      };
    }
  }
}

export const emailInboxService = new EmailInboxService();