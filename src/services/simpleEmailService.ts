/**
 * Simple Email Service
 * Direct Supabase queries for email inbox viewing
 */

import { supabase } from '../lib/supabase';

export interface EmailItem {
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

export interface EmailStats {
  total: number;
  pending: number;
  processing: number;
  error: number;
  latest_email?: string;
}

export interface EmailPullerStatus {
  isConnected: boolean;
  lastSync?: string;
  emailCount: number;
  error?: string;
}

class SimpleEmailService {
  /**
   * Get all emails from inbox for current user
   */
  async getEmails(
    status?: 'pending' | 'processing' | 'error',
    limit: number = 100
  ): Promise<{ data: EmailItem[] | null; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for getEmails:', authError?.message);
        return { 
          data: null, 
          error: authError?.message || 'Authentication required' 
        };
      }

      let query = supabase
        .from('imap_inbox')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching emails:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Failed to fetch emails:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Failed to fetch emails' 
      };
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(): Promise<{ data: EmailStats | null; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for getEmailStats:', authError?.message);
        return { 
          data: { total: 0, pending: 0, processing: 0, error: 0 }, 
          error: authError?.message || 'Authentication required' 
        };
      }

      const { data, error } = await supabase
        .from('imap_inbox')
        .select('status, received_at');

      if (error) {
        console.error('Error fetching email stats:', error);
        return { data: null, error: error.message };
      }

      if (!data) {
        return { 
          data: { 
            total: 0, 
            pending: 0, 
            processing: 0, 
            error: 0 
          }, 
          error: null 
        };
      }

      const stats: EmailStats = {
        total: data.length,
        pending: data.filter(email => email.status === 'pending').length,
        processing: data.filter(email => email.status === 'processing').length,
        error: data.filter(email => email.status === 'error').length,
        latest_email: data.length > 0 ? data[0].received_at : undefined
      };

      return { data: stats, error: null };
    } catch (err) {
      console.error('Failed to fetch email stats:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Failed to fetch email stats' 
      };
    }
  }

  /**
   * Search emails by subject or sender
   */
  async searchEmails(
    searchTerm: string,
    status?: 'pending' | 'processing' | 'error'
  ): Promise<{ data: EmailItem[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('imap_inbox')
        .select('*')
        .or(`subject.ilike.%${searchTerm}%,from_email.ilike.%${searchTerm}%,from_name.ilike.%${searchTerm}%`)
        .order('received_at', { ascending: false })
        .limit(50);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching emails:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Failed to search emails:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Failed to search emails' 
      };
    }
  }

  /**
   * Get email puller status by checking recent activity
   */
  async getEmailPullerStatus(): Promise<{ data: EmailPullerStatus | null; error: string | null }> {
    try {
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error in getEmailPullerStatus:', authError);
        return { 
          data: { 
            isConnected: false, 
            emailCount: 0, 
            error: `Authentication error: ${authError.message}` 
          }, 
          error: null 
        };
      }

      if (!user) {
        console.log('No authenticated user for email puller status check');
        return { 
          data: { 
            isConnected: false, 
            emailCount: 0, 
            error: 'No authenticated user' 
          }, 
          error: null 
        };
      }

      console.log('Checking email puller status for user:', user.id);

      // Check if there's an IMAP configuration for this user
      const { data: imapConfig, error: configError } = await supabase
        .from('imap_configurations')
        .select('id, is_active, sync_status, last_error')
        .eq('user_id', user.id)
        .limit(1);

      if (configError) {
        console.error('Error checking IMAP configuration:', configError);
        return { 
          data: { 
            isConnected: false, 
            emailCount: 0, 
            error: `Configuration error: ${configError.message}` 
          }, 
          error: null 
        };
      }

      if (!imapConfig || imapConfig.length === 0) {
        console.log('No IMAP configuration found for user');
        return { 
          data: { 
            isConnected: false, 
            emailCount: 0, 
            error: 'No IMAP configuration found. Please set up email pulling configuration.' 
          }, 
          error: null 
        };
      }

      const config = imapConfig[0];
      console.log('IMAP config found:', { id: config.id, active: config.is_active, status: config.sync_status });

      // Check for recent emails (within last hour) to determine if puller is active
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentEmails, error: recentError } = await supabase
        .from('imap_inbox')
        .select('created_at')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentError) {
        console.error('Error checking recent emails:', recentError);
        return { 
          data: { 
            isConnected: false, 
            emailCount: 0, 
            error: `Database error: ${recentError.message}` 
          }, 
          error: null 
        };
      }

      // Get total email count
      const { count, error: countError } = await supabase
        .from('imap_inbox')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error getting email count:', countError);
        return { 
          data: { 
            isConnected: false, 
            emailCount: 0, 
            error: `Count error: ${countError.message}` 
          }, 
          error: null 
        };
      }

      // Get latest email timestamp (don't use .single() as it may return no rows)
      const { data: latestEmails, error: latestError } = await supabase
        .from('imap_inbox')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const latestEmail = latestEmails && latestEmails.length > 0 ? latestEmails[0] : null;

      const status: EmailPullerStatus = {
        isConnected: (recentEmails && recentEmails.length > 0) || (count || 0) > 0,
        lastSync: latestEmail?.created_at,
        emailCount: count || 0,
        // Only report database errors, not "no rows found" errors
        error: latestError && latestError.code !== 'PGRST116' ? latestError.message : undefined
      };

      return { data: status, error: null };
    } catch (err) {
      console.error('Failed to get email puller status:', err);
      return { 
        data: { 
          isConnected: false, 
          emailCount: 0, 
          error: err instanceof Error ? err.message : 'Failed to check status' 
        }, 
        error: null 
      };
    }
  }

  /**
   * Get a single email by ID
   */
  async getEmailById(id: string): Promise<{ data: EmailItem | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('imap_inbox')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching email:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Failed to fetch email:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Failed to fetch email' 
      };
    }
  }

  /**
   * Delete an email from inbox
   */
  async deleteEmail(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('imap_inbox')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting email:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Failed to delete email:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete email' 
      };
    }
  }

  /**
   * Update email status
   */
  async updateEmailStatus(
    id: string, 
    status: 'pending' | 'processing' | 'error',
    errorMessage?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateData: any = { status };
      if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('imap_inbox')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating email status:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Failed to update email status:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update email status' 
      };
    }
  }

  /**
   * Process email - create transaction and move to processed table
   */
  async processEmail(
    emailId: string, 
    transactionData: {
      type: 'income' | 'expense';
      amount: number;
      description: string;
      category?: string;
      date?: string;
    }
  ): Promise<{ success: boolean; transactionId?: string; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for processEmail:', authError?.message);
        return { 
          success: false, 
          error: authError?.message || 'Authentication required' 
        };
      }

      // Get the email first
      const emailResult = await this.getEmailById(emailId);
      if (emailResult.error || !emailResult.data) {
        return { success: false, error: emailResult.error || 'Email not found' };
      }

      const email = emailResult.data;

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          category: transactionData.category || 'Email Import',
          date: transactionData.date || email.received_at,
          source: 'email',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        return { success: false, error: transactionError.message };
      }

      // Move email to processed table
      const { error: processedError } = await supabase
        .from('imap_processed')
        .insert([{
          user_id: user.id,
          original_inbox_id: email.id,
          message_id: email.message_id,
          subject: email.subject,
          from_email: email.from_email,
          received_at: email.received_at,
          processing_result: 'approved',
          transaction_id: transaction.id,
          processed_at: new Date().toISOString(),
          processed_by_user_id: user.id,
          processing_notes: `Processed as ${transactionData.type}: ${transactionData.description}`,
          created_at: new Date().toISOString()
        }]);

      if (processedError) {
        console.error('Error moving to processed:', processedError);
        // Try to delete the transaction we just created
        await supabase.from('transactions').delete().eq('id', transaction.id);
        return { success: false, error: processedError.message };
      }

      // Delete from inbox
      const { error: deleteError } = await supabase
        .from('imap_inbox')
        .delete()
        .eq('id', emailId);

      if (deleteError) {
        console.error('Error deleting from inbox:', deleteError);
        // Don't fail the whole operation if delete fails - email is already processed
        console.warn('Email processed but not removed from inbox');
      }

      return { success: true, transactionId: transaction.id, error: null };
    } catch (err) {
      console.error('Failed to process email:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process email' 
      };
    }
  }
}

/**
 * Parse email content to extract transaction information
 */
export function parseEmailForTransaction(email: EmailItem): {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  portfolio?: string;
  movementType?: string;
  status?: string;
  to?: string;
  currency?: string;
  notes?: string;
} | null {
  try {
    const content = email.text_content || email.html_content || '';
    const subject = email.subject || '';
    
    console.log('Parsing email content:', { subject, contentLength: content.length });
    
    // Extract amount - look for currency patterns
    const amountPatterns = [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,           // $123.45 or $1,234.56
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD/gi,         // 123.45 USD
      /USD\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,  // USD $123.45
      /amount[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, // Amount: $123.45
      /(\d+(?:\.\d{2})?)\s*dollars?/gi                // 123.45 dollars
    ];
    
    let amount = 0;
    let currency = 'USD';
    
    for (const pattern of amountPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        const amountStr = matches[0][1].replace(/,/g, '');
        amount = parseFloat(amountStr);
        console.log('Found amount:', amount, 'from pattern:', pattern);
        break;
      }
    }
  
    // Extract currency
    const currencyMatch = content.match(/(USD|CAD|EUR|GBP)\s*[\($]/gi);
    if (currencyMatch) {
      currency = currencyMatch[0].replace(/[\s\($]/g, '').toUpperCase();
    }
    
    // Extract portfolio
    const portfolioMatch = content.match(/portfolio[:\s]*([A-Z]{3,4}|[A-Za-z\s]+Account)/gi);
    const portfolio = portfolioMatch ? portfolioMatch[0].split(/[:\s]+/)[1] : undefined;
    
    // Extract movement type
    const movementPatterns = [
      /movement\s+type[:\s]*(\w+)/gi,
      /(deposit|withdrawal|transfer|buy|sell|dividend)/gi
    ];
    
    let movementType = '';
    for (const pattern of movementPatterns) {
      const match = content.match(pattern);
      if (match) {
        movementType = match[1] || match[0];
        break;
      }
    }
    
    // Extract status
    const statusMatch = content.match(/status[:\s]*(\w+)/gi);
    const status = statusMatch && statusMatch[1] ? statusMatch[1] : undefined;
    
    // Extract "To" field
    const toPatterns = [
      /to[:\s]*([A-Za-z0-9\s]+(?:account|chequing|savings|bank)\s*\d*)/gi,
      /destination[:\s]*([A-Za-z0-9\s]+)/gi
    ];
    
    let to = '';
    for (const pattern of toPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && typeof match[1] === 'string') {
        to = match[1].trim();
        break;
      }
    }
    
    // Determine transaction type based on keywords
    let type: 'income' | 'expense' = 'expense';
    const incomeKeywords = ['deposit', 'dividend', 'interest', 'credit', 'received', 'incoming'];
    const expenseKeywords = ['withdrawal', 'withdraw', 'fee', 'charge', 'debit', 'outgoing', 'transfer out'];
    
    const lowerContent = content.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    const allText = lowerContent + ' ' + lowerSubject;
    
    if (incomeKeywords.some(keyword => allText.includes(keyword))) {
      type = 'income';
    } else if (expenseKeywords.some(keyword => allText.includes(keyword))) {
      type = 'expense';
    }
    
    // Generate description from subject and extracted info
    let description = subject;
    if (movementType) {
      description = `${movementType}: ${subject}`;
    }
    if (to) {
      description += ` to ${to}`;
    }
    
    // Determine category
    let category = 'Email Import';
    if (movementType.toLowerCase().includes('deposit')) category = 'Banking';
    if (movementType.toLowerCase().includes('withdrawal')) category = 'Banking';
    if (movementType.toLowerCase().includes('transfer')) category = 'Banking';
    if (movementType.toLowerCase().includes('dividend')) category = 'Investment';
    if (allText.includes('trading') || allText.includes('buy') || allText.includes('sell')) category = 'Trading';
    
    // Extract additional notes
    const notesPatterns = [
      /notes?[:\s]*([^\n\r]{10,100})/gi,
      /additional\s+info[:\s]*([^\n\r]{10,100})/gi
    ];
    
    let notes = '';
    for (const pattern of notesPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && typeof match[1] === 'string') {
        notes = match[1].trim();
        break;
      }
    }
    
    console.log('Parsed email data:', {
      type, amount, description, category, portfolio, movementType, status, to, currency, notes
    });
    
    // Only return data if we found a valid amount
    if (amount > 0) {
      return {
        type,
        amount,
        description: description || 'Email transaction',
        category,
        portfolio,
        movementType,
        status,
        to,
        currency,
        notes
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing email for transaction:', error);
    return null;
  }
}

export const simpleEmailService = new SimpleEmailService();