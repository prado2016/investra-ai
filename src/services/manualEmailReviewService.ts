/**
 * Manual Email Review Service
 * Connects to enhanced email server for manual email review workflow
 */

interface EmailReviewItem {
  id: string;
  subject: string;
  from: string;
  received_at: string;
  status: 'pending' | 'processed' | 'rejected';
  preview: string;
  has_attachments: boolean;
  estimated_transactions: number;
  full_content?: string;
  email_hash?: string;
}

interface EmailReviewStats {
  total: number;
  pending: number;
  processed: number;
  rejected: number;
}

interface ProcessEmailResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

class ManualEmailReviewService {
  private baseUrl: string;

  constructor() {
    // Use the same detection logic as useEmailProcessing
    this.baseUrl = this.detectServerUrl();
  }

  private detectServerUrl(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // In production, try enhanced server first, then fallback
      return 'http://localhost:3001';
    } else {
      // In development, use the Vite dev proxy or direct connection
      return 'http://localhost:3001';
    }
  }

  /**
   * Get all emails for manual review
   */
  async getEmailsForReview(): Promise<{ success: boolean; data?: EmailReviewItem[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/manual-review/emails`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform server response to our interface
      const emails = result.data?.map((email: any) => ({
        id: email.id || email.messageId || String(Date.now() + Math.random()),
        subject: email.subject || 'No Subject',
        from: email.from || email.fromEmail || 'Unknown Sender',
        received_at: email.received_at || email.receivedAt || email.timestamp || new Date().toISOString(),
        status: email.status || 'pending',
        preview: email.preview || email.textContent?.substring(0, 150) || 'No preview available',
        has_attachments: email.has_attachments || false,
        estimated_transactions: email.estimated_transactions || (email.subject?.toLowerCase().includes('order') || email.subject?.toLowerCase().includes('dividend') ? 1 : 0),
        full_content: email.full_content || email.htmlContent || email.textContent,
        email_hash: email.email_hash || email.emailHash
      })) || [];

      return { success: true, data: emails };
    } catch (error) {
      console.error('Failed to fetch emails for review:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch emails' 
      };
    }
  }

  /**
   * Process a specific email (create transactions)
   */
  async processEmail(emailId: string): Promise<ProcessEmailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/manual-review/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        transactionId: result.transactionId,
        error: result.error
      };
    } catch (error) {
      console.error('Failed to process email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process email'
      };
    }
  }

  /**
   * Reject a specific email
   */
  async rejectEmail(emailId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/manual-review/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: result.success || false, error: result.error };
    } catch (error) {
      console.error('Failed to reject email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject email'
      };
    }
  }

  /**
   * Delete a specific email
   */
  async deleteEmail(emailId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/manual-review/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: result.success || false, error: result.error };
    } catch (error) {
      console.error('Failed to delete email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete email'
      };
    }
  }

  /**
   * Get email review statistics
   */
  async getEmailStats(): Promise<{ success: boolean; data?: EmailReviewStats; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/manual-review/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { 
        success: true, 
        data: result.data || { total: 0, pending: 0, processed: 0, rejected: 0 }
      };
    } catch (error) {
      console.error('Failed to fetch email stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch stats' 
      };
    }
  }

  /**
   * Test connection to the email review service
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

export const manualEmailReviewService = new ManualEmailReviewService();
export type { EmailReviewItem, EmailReviewStats, ProcessEmailResponse };