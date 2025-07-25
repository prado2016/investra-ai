/**
 * Simple Email Service
 * Direct Supabase queries for email inbox viewing
 */

import { supabase } from '../lib/supabase';

export interface EmailItem {
  id: string;
  user_id?: string;
  message_id?: string;
  thread_id?: string;
  subject: string;
  from_email?: string;
  from_name?: string;
  from?: string; // Added for transformed data
  to_email?: string;
  reply_to?: string;
  received_at: string;
  raw_content?: string;
  text_content?: string;
  html_content?: string;
  attachments_info?: any[];
  email_size?: number;
  priority?: 'low' | 'normal' | 'high';
  status: 'pending' | 'processing' | 'error' | 'processed';
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  // Added for UI display
  preview?: string;
  has_attachments?: boolean;
  estimated_transactions?: number;
  full_content?: string;
  email_hash?: string;
  source?: 'inbox' | 'processed';
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
  // Enhanced status information
  configurationActive: boolean;
  syncStatus?: 'running' | 'idle' | 'error' | 'never_ran';
  lastSuccessfulSync?: string;
  nextScheduledSync?: string;
  syncInterval?: number; // in minutes
  recentActivity: {
    last24Hours: number;
    lastHour: number;
    lastWeek: number;
  };
  configuration?: {
    provider: string;
    emailAddress: string;
    host: string;
    port: number;
    autoImportEnabled: boolean;
    lastTested?: string;
    lastTestSuccess?: boolean;
    syncInterval?: number;
    maxEmailsPerSync?: number;
    emailsSynced?: number;
    lastSyncStatus?: string;
  };
}

class SimpleEmailService {
  /**
   * Get all emails from inbox for current user
   */
  async getEmails(
    status?: 'pending' | 'processing' | 'error' | 'processed',
    limit: number = 100,
    includeProcessed: boolean = true
  ): Promise<{ data: EmailItem[] | null; error: string | null }> {
    try {
      console.log(`🔄 Fetching emails from database (inbox${includeProcessed ? ' and processed' : ' only'})`);
      
      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Authentication error:', userError);
        return { data: [], error: 'User not authenticated' };
      }

      console.log('✅ User authenticated:', user.id);
      
      // Always query inbox - try with archived_in_gmail filter first, fallback without
      console.log('📡 Querying imap_inbox for pending emails...');
      const { data: inboxEmails, error: inboxError } = await supabase
        .from('imap_inbox')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived_in_gmail', false) // Only show non-archived emails
        .order('received_at', { ascending: false })
        .limit(limit);
      
      // If we get a 400 error that might indicate the column doesn't exist, retry without the filter
      if (inboxError && inboxError.message && inboxError.message.includes('column')) {
        console.log('⚠️ archived_in_gmail column might not exist, trying without filter...');
        const { data: fallbackEmails, error: fallbackError } = await supabase
          .from('imap_inbox')
          .select('*')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false })
          .limit(limit);
        
        if (!fallbackError) {
          console.log('✅ Fallback query successful, proceeding with emails...');
          
          console.log(`📧 Found ${fallbackEmails?.length || 0} emails in inbox, ${0} in processed`);
          console.log(`📧 Total combined emails: ${fallbackEmails?.length || 0}`);
          
          if (!fallbackEmails || fallbackEmails.length === 0) {
            console.log('📭 No emails found in either inbox or processed tables');
            return { data: [], error: null };
          }
          
          return { data: fallbackEmails || [], error: null };
        }
      }

      let processedEmails = null;
      let processedError = null;

      // Only query processed emails if requested
      if (includeProcessed) {
        console.log('📡 Querying imap_processed for completed emails...');
        const processedResult = await supabase
          .from('imap_processed')
          .select('*')
          .eq('user_id', user.id)
          .order('processed_at', { ascending: false })
          .limit(limit);
        
        processedEmails = processedResult.data;
        processedError = processedResult.error;
      }

      if (inboxError && (includeProcessed && processedError)) {
        console.error('❌ Query failed:', { inboxError, processedError });
        return { data: [], error: 'Database query failed' };
      }

      // Combine results from both tables (if processed emails are included)
      const allEmails = [
        ...(inboxEmails || []).map(email => ({ ...email, source: 'inbox' })),
        ...(includeProcessed && processedEmails ? processedEmails.map(email => ({ ...email, source: 'processed', received_at: email.processed_at || email.received_at })) : [])
      ];

      console.log(`📧 Found ${inboxEmails?.length || 0} emails in inbox, ${processedEmails?.length || 0} in processed`);
      console.log(`📧 Total combined emails: ${allEmails.length}`);

      // Sort combined results by received_at
      allEmails.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

      // Apply status filter if specified (for inbox emails only, processed emails are inherently "completed")
      let filteredEmails = allEmails;
      if (status) {
        filteredEmails = allEmails.filter(email => 
          email.source === 'processed' || email.status === status
        );
        console.log(`🔍 After status filter (${status}): ${filteredEmails.length} emails`);
      }

      // Apply limit to final results
      const emails = filteredEmails.slice(0, limit);

      if (!emails || emails.length === 0) {
        console.log('📭 No emails found in either inbox or processed tables');
        return { data: [], error: null };
      }

      console.log(`📧 Found ${emails.length} real emails from database`);
      
      // Transform database emails to expected EmailItem format
      const transformedEmails = emails.map((email: any) => ({
        id: email.id?.toString() || '',
        user_id: email.user_id,
        message_id: email.message_id,
        thread_id: email.thread_id,
        subject: email.subject || 'No Subject',
        from_email: email.from_email,
        from_name: email.from_name,
        from: email.from_email || 'Unknown Sender', // For UI compatibility
        to_email: email.to_email,
        reply_to: email.reply_to,
        received_at: email.received_at,
        raw_content: email.raw_content,
        text_content: email.text_content,
        html_content: email.html_content,
        attachments_info: email.attachments_info,
        email_size: email.email_size,
        priority: email.priority || 'normal',
        status: email.source === 'processed' ? 'processed' : (email.status || 'pending'),
        error_message: email.error_message,
        created_at: email.created_at,
        updated_at: email.updated_at,
        // UI display properties
        preview: email.text_content ? email.text_content.substring(0, 100) + '...' : email.subject,
        has_attachments: email.attachments_info && email.attachments_info.length > 0,
        estimated_transactions: 1,
        full_content: email.text_content || email.html_content || email.raw_content,
        email_hash: `hash-${email.id}`,
        source: email.source // Track whether email is from inbox or processed table
      }));
      
      console.log(`✅ Transformed real emails:`, transformedEmails.length, transformedEmails);
      return { data: transformedEmails, error: null };

    } catch (err) {
      console.error('Failed to fetch real emails from database:', err);
      return { 
        data: [], 
        error: err instanceof Error ? err.message : 'Failed to fetch emails'
      };
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(): Promise<{ data: EmailStats | null; error: string | null }> {
    try {
      // Use API endpoint for stats to match the working puller status
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.0.0.89:3001';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`${apiBaseUrl}/api/email/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const apiData = result.data;
          return {
            data: {
              total: apiData.totalProcessed || 0,
              pending: apiData.reviewRequired || 0,
              processing: 0, // API doesn't have processing count
              error: apiData.failed || 0,
              latest_email: apiData.lastProcessedAt
            },
            error: null
          };
        } else {
          throw new Error(result.error || 'Invalid API response');
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('Email stats request timed out');
          return {
            data: { total: 0, pending: 0, processing: 0, error: 0 },
            error: null
          };
        }
        
        throw fetchError;
      }

    } catch (err) {
      console.error('Failed to fetch email stats via API:', err);
      return { 
        data: { total: 0, pending: 0, processing: 0, error: 0 }, 
        error: err instanceof Error ? err.message : 'Failed to fetch email stats' 
      };
    }
  }

  /**
   * Search emails by subject or sender
   */
  async searchEmails(
    searchTerm: string,
    status?: 'pending' | 'processing' | 'error' | 'processed'
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
   * Get enhanced email puller status with detailed information
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
            configurationActive: false,
            recentActivity: { last24Hours: 0, lastHour: 0, lastWeek: 0 },
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
            configurationActive: false,
            recentActivity: { last24Hours: 0, lastHour: 0, lastWeek: 0 },
            error: 'No authenticated user' 
          }, 
          error: null 
        };
      }

      console.log('Checking email puller status via API for user:', user.id);

      // Use API endpoint instead of direct database access to avoid hanging
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.0.0.89:3001';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`${apiBaseUrl}/api/imap/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const apiData = result.data;
          return {
            data: {
              isConnected: apiData.healthy || false,
              emailCount: apiData.emailsProcessed || 0,
              configurationActive: apiData.status === 'running',
              syncStatus: apiData.healthy ? 'running' : 'error',
              lastSync: apiData.lastSync,
              recentActivity: { 
                last24Hours: apiData.emailsProcessed || 0, 
                lastHour: 0, 
                lastWeek: apiData.emailsProcessed || 0 
              },
              configuration: {
                provider: 'gmail',
                emailAddress: apiData.config?.username || 'investra.transactions@gmail.com',
                host: apiData.config?.server || 'imap.gmail.com',
                port: apiData.config?.port || 993,
                autoImportEnabled: apiData.status === 'running',
                lastTested: apiData.lastSync,
                lastTestSuccess: apiData.healthy,
                syncInterval: 30,
                maxEmailsPerSync: 50,
                emailsSynced: apiData.emailsProcessed || 0,
                lastSyncStatus: apiData.status
              }
            },
            error: null
          };
        } else {
          throw new Error(result.error || 'Invalid API response');
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('Email puller status request timed out');
          return {
            data: {
              isConnected: false,
              emailCount: 0,
              configurationActive: false,
              syncStatus: 'error',
              recentActivity: { last24Hours: 0, lastHour: 0, lastWeek: 0 },
              error: 'Status check timed out'
            },
            error: null
          };
        }
        
        throw fetchError;
      }

    } catch (err) {
      console.error('Failed to get email puller status via API:', err);
      return { 
        data: { 
          isConnected: false, 
          emailCount: 0, 
          configurationActive: false,
          syncStatus: 'error',
          recentActivity: { last24Hours: 0, lastHour: 0, lastWeek: 0 },
          error: err instanceof Error ? err.message : 'Failed to check status' 
        }, 
        error: null 
      };
    }
  }
  /**
   * Move processed emails to archive (both in database and Gmail)
   */
  async moveProcessedEmailsToArchive(): Promise<{ data: { archived: number; error?: string } | null; error: string | null }> {
    try {
      console.log('📁 Moving processed emails to archive...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Get all emails from inbox that haven't been archived
      let unArchivedEmails = null;
      let fetchError = null;
      
      // Try with full schema first (including uid and archived_in_gmail columns)
      const result = await supabase
        .from('imap_inbox')
        .select('id, message_id, uid, subject, from_email')
        .eq('user_id', user.id)
        .eq('archived_in_gmail', false);
      
      unArchivedEmails = result.data;
      fetchError = result.error;
      
      // If archived_in_gmail column doesn't exist, try without the filter
      if (fetchError && fetchError.message && fetchError.message.includes('archived_in_gmail')) {
        console.log('⚠️ archived_in_gmail column might not exist, trying without filter...');
        const fallbackResult = await supabase
          .from('imap_inbox')
          .select('id, message_id, uid, subject, from_email')
          .eq('user_id', user.id);
        
        unArchivedEmails = fallbackResult.data;
        fetchError = fallbackResult.error;
      }
      
      // If uid column also doesn't exist, try with minimal schema
      if (fetchError && fetchError.message && fetchError.message.includes('uid')) {
        console.log('⚠️ uid column might not exist, trying with minimal schema...');
        const minimalResult = await supabase
          .from('imap_inbox')
          .select('id, message_id, subject, from_email')
          .eq('user_id', user.id);
        
        unArchivedEmails = minimalResult.data;
        fetchError = minimalResult.error;
      }

      if (fetchError) {
        console.error('Failed to fetch unarchived emails:', fetchError);
        return { data: null, error: 'Failed to fetch emails' };
      }

      if (!unArchivedEmails || unArchivedEmails.length === 0) {
        console.log('✅ No emails to archive');
        return { data: { archived: 0 }, error: null };
      }

      console.log(`📧 Found ${unArchivedEmails.length} emails to archive`);

      // Mark emails as archived in database
      const messageIds = unArchivedEmails.map(email => email.message_id);
      const archiveFolder = 'Investra/Processed';
      
      // Try to update with archiving columns
      let updateData = null;
      let updateError = null;
      
      const updateResult = await supabase
        .from('imap_inbox')
        .update({
          archived_in_gmail: true,
          archive_folder: archiveFolder,
          updated_at: new Date().toISOString()
        })
        .in('message_id', messageIds)
        .eq('user_id', user.id)
        .select('id');

      updateData = updateResult.data;
      updateError = updateResult.error;

      // If archiving columns don't exist, just update the timestamp
      if (updateError && (
        updateError.message.includes('archived_in_gmail') || 
        updateError.message.includes('archive_folder')
      )) {
        console.log('⚠️ Archive columns might not exist, updating timestamp only...');
        const fallbackUpdate = await supabase
          .from('imap_inbox')
          .update({
            updated_at: new Date().toISOString()
          })
          .in('message_id', messageIds)
          .eq('user_id', user.id)
          .select('id');
        
        updateData = fallbackUpdate.data;
        updateError = fallbackUpdate.error;
      }

      if (updateError) {
        console.error('Failed to mark emails as archived:', updateError);
        return { data: null, error: 'Failed to update email archive status' };
      }

      const archivedCount = updateData?.length || 0;
      console.log(`✅ Marked ${archivedCount} emails as archived in database`);

      // Note: Actual Gmail archiving would need to be done by the email collector
      // For now, we just mark them as archived in the database
      
      return { 
        data: { 
          archived: archivedCount,
          error: archivedCount === 0 ? 'No emails were archived' : undefined
        }, 
        error: null 
      };

    } catch (error) {
      console.error('Error moving emails to archive:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get a single email by ID
   */
  async getEmailById(id: string): Promise<{ data: EmailItem | null; error: string | null }> {
    try {
      console.log('🔍 Looking for email by ID:', id);
      
      // Try imap_inbox first
      const { data: inboxData } = await supabase
        .from('imap_inbox')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows found

      if (inboxData) {
        console.log('✅ Found email in imap_inbox');
        return { data: { ...inboxData, source: 'inbox' }, error: null };
      }

      // Try imap_processed if not found in inbox
      console.log('🔍 Email not in inbox, checking imap_processed...');
      const { data: processedData } = await supabase
        .from('imap_processed')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (processedData) {
        console.log('✅ Found email in imap_processed');
        return { 
          data: { 
            ...processedData, 
            source: 'processed',
            received_at: processedData.processed_at || processedData.received_at 
          }, 
          error: null 
        };
      }

      // Email not found in either table
      console.log('❌ Email not found in either table');
      return { data: null, error: 'Email not found' };

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

      // Check if email is already processed
      if (email.source === 'processed') {
        console.log('✅ Email already processed, skipping');
        return { success: true, transactionId: undefined, error: null };
      }

      // Skip transaction creation for simple expense/income records
      // The transactions table is for trading transactions only
      console.log('📝 Skipping transaction creation - email processed as reviewed');
      
      // For future enhancement: could create expense records in a separate expenses table
      // if needed for non-trading email tracking

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
          transaction_id: null, // No transaction created for non-trading emails
          processed_at: new Date().toISOString(),
          processed_by_user_id: user.id,
          processing_notes: `Reviewed as ${transactionData.type}: ${transactionData.description}`,
          created_at: new Date().toISOString()
        }]);

      if (processedError) {
        console.error('Error moving to processed:', processedError);
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

      return { success: true, transactionId: undefined, error: null };
    } catch (err) {
      console.error('Failed to process email:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process email' 
      };
    }
  }

  /**
   * Create a trading transaction from parsed email data
   */
  async createTradingTransaction(data: {
    portfolioName: string;
    symbol: string;
    assetType: 'stock' | 'option';
    transactionType: 'buy' | 'sell';
    quantity: number;
    price: number;
    totalAmount: number;
    fees: number;
    currency: string;
    transactionDate: string;
    emailId: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for createTradingTransaction:', authError?.message);
        return { 
          success: false, 
          error: authError?.message || 'Authentication required' 
        };
      }

      // Get portfolio ID
      const portfolioResult = await this.getPortfolioByName(data.portfolioName);
      if (portfolioResult.error || !portfolioResult.data) {
        console.error('Portfolio not found:', data.portfolioName);
        return { success: false, error: `Portfolio '${data.portfolioName}' not found` };
      }

      // Create the transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          portfolio_id: portfolioResult.data.id,
          symbol: data.symbol,
          asset_type: data.assetType,
          transaction_type: data.transactionType,
          quantity: data.quantity,
          price: data.price,
          total_amount: data.totalAmount,
          fees: data.fees,
          currency: data.currency,
          transaction_date: data.transactionDate,
          source: 'email',
          email_id: data.emailId,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (transactionError) {
        console.error('Error creating trading transaction:', transactionError);
        return { success: false, error: transactionError.message };
      }

      console.log('✅ Trading transaction created:', transaction.id);
      return { success: true, transactionId: transaction.id };

    } catch (err) {
      console.error('Failed to create trading transaction:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create trading transaction' 
      };
    }
  }

  /**
   * Process email and link it to a transaction
   */
  async processEmailWithTransaction(
    emailId: string, 
    transactionId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for processEmailWithTransaction:', authError?.message);
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

      // Move email to processed table with transaction reference
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
          transaction_id: transactionId,
          processed_at: new Date().toISOString(),
          processed_by_user_id: user.id,
          processing_notes: 'Processed with trading transaction',
          created_at: new Date().toISOString()
        }]);

      if (processedError) {
        console.error('Error moving to processed:', processedError);
        return { success: false, error: processedError.message };
      }

      // Delete from inbox
      const { error: deleteError } = await supabase
        .from('imap_inbox')
        .delete()
        .eq('id', emailId);

      if (deleteError) {
        console.error('Error deleting from inbox:', deleteError);
        console.warn('Email processed but not removed from inbox');
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Failed to process email with transaction:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process email with transaction' 
      };
    }
  }

  /**
   * Get portfolio ID by name
   */
  async getPortfolioByName(portfolioName: string): Promise<{ data: { id: string, name: string } | null; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for getPortfolioByName:', authError?.message);
        return { 
          data: null, 
          error: authError?.message || 'Authentication required' 
        };
      }

      // Normalize the portfolio name for matching
      const normalizedName = portfolioName.toUpperCase().trim();
      
      // Common portfolio name variations
      const nameVariations = [
        normalizedName,
        normalizedName.replace(/\s+/g, ''), // Remove spaces
        normalizedName.replace(/ACCOUNT$/i, ''), // Remove "ACCOUNT" suffix
        normalizedName.replace(/^.*\s/, ''), // Get last word only
      ];

      console.log('Looking up portfolio for variations:', nameVariations);

      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching portfolios:', error);
        return { data: null, error: error.message };
      }

      if (!data || data.length === 0) {
        return { data: null, error: 'No portfolios found for user' };
      }

      // Try to find a matching portfolio
      for (const variation of nameVariations) {
        const matchingPortfolio = data.find(p => 
          p.name.toUpperCase() === variation ||
          p.name.toUpperCase().includes(variation) ||
          variation.includes(p.name.toUpperCase())
        );
        
        if (matchingPortfolio) {
          console.log(`Found portfolio match: ${matchingPortfolio.name} (${matchingPortfolio.id}) for "${portfolioName}"`);
          return { data: matchingPortfolio, error: null };
        }
      }

      console.log(`No portfolio match found for "${portfolioName}". Available portfolios:`, data.map(p => p.name));
      return { data: null, error: `No portfolio found matching "${portfolioName}"` };
    } catch (err) {
      console.error('Failed to lookup portfolio:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Failed to lookup portfolio' 
      };
    }
  }

  /**
   * Get asset by symbol, or create if not exists
   */
  async getOrCreateAsset(symbol: string, assetType: 'stock' | 'option'): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for getOrCreateAsset:', authError?.message);
        return { 
          data: null, 
          error: authError?.message || 'Authentication required' 
        };
      }

      const normalizedSymbol = symbol.toUpperCase().trim();
      
      // First, try to find existing asset
      const { data: existingAsset, error: lookupError } = await supabase
        .from('assets')
        .select('id, symbol, name, asset_type')
        .eq('symbol', normalizedSymbol)
        .single();

      if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error looking up asset:', lookupError);
        return { data: null, error: lookupError.message };
      }

      // If asset exists, return it
      if (existingAsset) {
        console.log(`Found existing asset: ${existingAsset.symbol} (${existingAsset.id})`);
        return { data: { id: existingAsset.id }, error: null };
      }

      // Create new asset
      const assetName = assetType === 'option' 
        ? `${normalizedSymbol} Option` 
        : normalizedSymbol;

      const { data: newAsset, error: createError } = await supabase
        .from('assets')
        .insert([{
          symbol: normalizedSymbol,
          name: assetName,
          asset_type: assetType,
          currency: 'USD', // Default to USD
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating asset:', createError);
        return { data: null, error: createError.message };
      }

      console.log(`Created new asset: ${normalizedSymbol} (${newAsset.id})`);
      return { data: { id: newAsset.id }, error: null };
    } catch (err) {
      console.error('Failed to get or create asset:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Failed to get or create asset' 
      };
    }
  }

  /**
   * Process trading email - create trading transaction and move to processed table
   */
  async processTradingEmail(
    emailId: string, 
    tradingData: {
      portfolio_id: string;
      asset_id: string;
      transaction_type: 'buy' | 'sell';
      quantity: number;
      price: number;
      total_amount: number;
      fees: number;
      transaction_date: string;
      currency: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; transactionId?: string; error: string | null }> {
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication required for processTradingEmail:', authError?.message);
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

      // Create trading transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          portfolio_id: tradingData.portfolio_id,
          asset_id: tradingData.asset_id,
          transaction_type: tradingData.transaction_type,
          quantity: tradingData.quantity,
          price: tradingData.price,
          total_amount: tradingData.total_amount,
          fees: tradingData.fees,
          transaction_date: tradingData.transaction_date,
          currency: tradingData.currency,
          notes: tradingData.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (transactionError) {
        console.error('Error creating trading transaction:', transactionError);
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
          processing_notes: `Processed as trading transaction: ${tradingData.transaction_type.toUpperCase()} ${tradingData.quantity} ${tradingData.asset_id}`,
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
      console.error('Failed to process trading email:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process trading email' 
      };
    }
  }
}

import { aiServiceManager } from './ai/aiServiceManager';
import type { EmailParsingRequest, EmailParsingResponse } from '../types/ai';

/**
 * Parse email content to extract trading transaction information using AI
 */
export async function parseEmailForTransaction(email: EmailItem): Promise<{
  // Trading transaction fields
  portfolioName?: string;
  symbol?: string;
  assetType?: 'stock' | 'option';
  transactionType?: 'buy' | 'sell';
  quantity?: number;
  price?: number;
  totalAmount?: number;
  fees?: number;
  currency?: string;
  transactionDate?: string; // YYYY-MM-DD format only
  // AI-specific fields
  confidence?: number; // 0-1 scale
  parsingType?: 'trading' | 'basic' | 'unknown';
  aiParsed?: boolean;
  error?: string; // Error message when parsing fails
  // Raw data for audit trail
  rawData?: any;
  // Legacy fields for backward compatibility
  type?: 'income' | 'expense';
  amount?: number;
  description?: string;
  category?: string;
} | null> {
  try {
    const content = email.text_content || email.html_content || '';
    const subject = email.subject || '';
    
    console.log('Parsing email content with AI:', { subject, contentLength: content.length });
    
    // Prepare AI parsing request
    const aiRequest: EmailParsingRequest = {
      emailContent: content,
      emailSubject: subject,
      emailFrom: email.from_email,
      receivedAt: email.received_at,
      context: 'Trading transaction email processing'
    };

    // Try AI parsing first - use the default AI provider
    try {
      const aiResponse: EmailParsingResponse = await aiServiceManager.parseEmailForTransaction(aiRequest);
      
      // Enhanced logging for debugging AI confidence issues
      console.log('🤖 AI Response Details:', {
        success: aiResponse.success,
        confidence: aiResponse.confidence,
        hasExtractedData: !!aiResponse.extractedData,
        parsingType: aiResponse.parsingType,
        error: aiResponse.error,
        timestamp: aiResponse.timestamp
      });
      
      if (aiResponse.success && aiResponse.extractedData && aiResponse.confidence > 0.3) {
        console.log('AI parsing successful:', { 
          confidence: aiResponse.confidence, 
          parsingType: aiResponse.parsingType,
          extractedData: aiResponse.extractedData 
        });
        
        const aiData = aiResponse.extractedData;
        
        // Convert AI response to expected format
        const result = {
          // Trading transaction fields
          portfolioName: aiData.portfolioName,
          symbol: aiData.symbol,
          assetType: aiData.assetType,
          transactionType: aiData.transactionType,
          quantity: aiData.quantity,
          price: aiData.price,
          totalAmount: aiData.totalAmount,
          fees: aiData.fees,
          currency: aiData.currency || 'USD',
          transactionDate: aiData.transactionDate,
          // AI-specific fields
          confidence: aiResponse.confidence,
          parsingType: aiResponse.parsingType,
          aiParsed: true,
          // Raw data for audit trail
          rawData: {
            ...aiResponse.rawData,
            aiResponse: aiResponse,
            originalEmail: {
              subject,
              content: content.substring(0, 1000),
              parsed_at: new Date().toISOString()
            }
          },
          // Legacy fields for backward compatibility
          type: (aiData.transactionType === 'buy' ? 'expense' : 'income') as 'income' | 'expense',
          amount: aiData.totalAmount || (aiData.quantity && aiData.price ? aiData.quantity * aiData.price : 0),
          description: aiData.notes || `${aiData.transactionType?.toUpperCase() || 'TRADE'} ${aiData.quantity || ''} ${aiData.assetType === 'option' ? 'contracts' : 'shares'} of ${aiData.symbol || 'Unknown'}`.trim(),
          category: 'Trading'
        };
        
        return result;
      } else {
        console.log('❌ AI parsing failed or low confidence:', { 
          success: aiResponse.success, 
          confidence: aiResponse.confidence,
          hasExtractedData: !!aiResponse.extractedData,
          requiredConfidence: 0.3,
          error: aiResponse.error,
          parsingType: aiResponse.parsingType
        });
        
        // Return error information instead of null
        return {
          aiParsed: false,
          confidence: aiResponse.confidence || 0,
          parsingType: aiResponse.parsingType || 'unknown',
          error: aiResponse.error || 'AI parsing failed or confidence too low',
          rawData: {
            aiResponse: aiResponse,
            originalEmail: {
              subject,
              content: content.substring(0, 500),
              parsed_at: new Date().toISOString()
            }
          }
        };
      }
    } catch (aiError) {
      console.error('❌ AI parsing error:', aiError);
      
      // Return error information instead of null
      return {
        aiParsed: false,
        confidence: 0,
        parsingType: 'unknown',
        error: aiError instanceof Error ? aiError.message : 'Unknown AI parsing error',
        rawData: {
          parseError: aiError instanceof Error ? aiError.message : 'Unknown error',
          originalEmail: {
            subject,
            content: content.substring(0, 500),
            parsed_at: new Date().toISOString()
          }
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing email for transaction:', error);
    
    // Return error information instead of null
    return {
      aiParsed: false,
      confidence: 0,
      parsingType: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error during email parsing',
      rawData: {
        parseError: error instanceof Error ? error.message : 'Unknown error',
        originalEmail: {
          subject: email.subject || 'Unknown subject',
          content: (email.text_content || email.html_content || '').substring(0, 500),
          parsed_at: new Date().toISOString()
        }
      }
    };
  }
}

// Additional utility functions
export async function triggerManualEmailSync(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔄 Triggering manual email sync...');
      
      // Force a session refresh to ensure we have a valid token
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Session refresh failed:', refreshError?.message);
        return { 
          success: false, 
          error: 'Session refresh failed. Please log in again.' 
        };
      }

      // Use the refreshed session
      const session = refreshedSession;
      const token = session?.access_token;
      
      if (!session || !token) {
        console.error('❌ No valid session after refresh');
        return { 
          success: false, 
          error: 'No valid session. Please log in again.' 
        };
      }

      // Verify user from the refreshed session
      const user = session.user;
      if (!user) {
        console.error('❌ No user in refreshed session');
        return { 
          success: false, 
          error: 'No user found. Please log in again.' 
        };
      }
      
      console.log('🔐 Auth debug:', { 
        hasSession: !!session, 
        hasToken: !!token, 
        tokenLength: token?.length,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        sessionUser: user?.email,
        userId: user?.id,
        tokenType: session?.token_type,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
      
      if (!token) {
        console.error('❌ No authentication token available after refresh');
        return { 
          success: false, 
          error: 'Authentication token unavailable. Please log in again.' 
        };
      }
      
      // Make API call to the server endpoint
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.0.0.89:3001';
      const response = await fetch(`${apiBaseUrl}/api/email/manual-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Include authentication cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('❌ Manual sync trigger failed:', errorData);
        
        // If we get a 401, try to refresh the session once more
        if (response.status === 401) {
          console.log('🔄 401 error - attempting token refresh...');
          
          try {
            // Force refresh the session
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !refreshedSession?.access_token) {
              console.error('❌ Token refresh failed:', refreshError?.message);
              return { 
                success: false, 
                error: 'Authentication token expired. Please log in again.' 
              };
            }
            
            console.log('✅ Token refreshed, retrying request...');
            
            // Retry the request with the new token
            const retryResponse = await fetch(`${apiBaseUrl}/api/email/manual-sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshedSession.access_token}`,
              },
              credentials: 'include',
            });

            if (!retryResponse.ok) {
              const retryErrorData = await retryResponse.json().catch(() => ({ error: 'Network error on retry' }));
              console.error('❌ Manual sync still failed after token refresh:', retryErrorData);
              return { 
                success: false, 
                error: retryErrorData.error || `Retry failed: HTTP ${retryResponse.status}` 
              };
            }

            const retryResult = await retryResponse.json();
            console.log('✅ Manual sync succeeded after token refresh:', retryResult);
            
            return { 
              success: true, 
              data: retryResult.data
            };
            
          } catch (refreshErr) {
            console.error('❌ Token refresh attempt failed:', refreshErr);
            return { 
              success: false, 
              error: 'Token refresh failed. Please log in again.' 
            };
          }
        }
        
        return { 
          success: false, 
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const result = await response.json();
      console.log('✅ Manual sync triggered successfully:', result);
      
      return { 
        success: true, 
        data: result.data
      };
      
    } catch (err) {
      console.error('❌ Failed to trigger manual sync:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to trigger manual sync' 
      };
    }
}

// Database-driven manual sync trigger function (NO AUTHENTICATION ISSUES!)
export async function triggerManualSyncViaDatabase(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔄 Triggering manual sync via database with email-puller restart...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return { 
        success: false, 
        error: 'No authenticated user. Please log in again.' 
      };
    }

    console.log('✅ User authenticated for database sync:', user.email);
    
    // Step 1: Restart the email-puller service to ensure latest code is running
    console.log('🔄 Step 1: Restarting email-puller service...');
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.0.0.89:3001';
    
    try {
      const restartResponse = await fetch(`${apiBaseUrl}/api/imap/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout for restart
      });
      
      if (restartResponse.ok) {
        const restartResult = await restartResponse.json();
        console.log('✅ Email-puller restart initiated:', restartResult.message);
        
        // Wait a few seconds for the service to restart before creating sync request
        console.log('⏳ Waiting for service restart...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second wait
      } else {
        console.warn('⚠️ Restart request failed but continuing with sync:', restartResponse.status);
      }
    } catch (restartError) {
      console.warn('⚠️ Email-puller restart failed but continuing with sync:', restartError);
      // Continue with sync even if restart fails - the old process might still work
    }
    
    // Step 2: Insert sync request into database
    console.log('📝 Step 2: Creating sync request in database...');
    const { data: syncRequest, error: insertError } = await supabase
      .from('sync_requests')
      .insert({
        user_id: user.id,
        request_type: 'manual_sync_with_restart',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create sync request:', insertError);
      return { 
        success: false, 
        error: `Failed to create sync request: ${insertError.message}` 
      };
    }

    console.log('✅ Sync request created with restart:', syncRequest.id);
    
    // Poll for completion with timeout
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    const pollInterval = 1000; // 1 second
    
    console.log('⏳ Polling for sync completion...');
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const { data: updatedRequest, error: pollError } = await supabase
        .from('sync_requests')
        .select('*')
        .eq('id', syncRequest.id)
        .single();

      if (pollError) {
        console.warn('⚠️  Poll error (continuing):', pollError.message);
        attempts++;
        continue;
      }
      
      if (updatedRequest.status === 'completed') {
        console.log('✅ Sync completed successfully');
        return { 
          success: true, 
          data: {
            requestId: syncRequest.id,
            completedAt: updatedRequest.processed_at,
            result: updatedRequest.result
          }
        };
      } else if (updatedRequest.status === 'failed') {
        console.log('❌ Sync failed');
        return { 
          success: false, 
          error: `Sync failed: ${updatedRequest.result?.error || 'Unknown error'}` 
        };
      }
      
      attempts++;
      
      // Log progress every 5 seconds
      if (attempts % 5 === 0) {
        console.log(`⏳ Still waiting for sync completion... (${attempts}/${maxAttempts})`);
      }
    }
    
    // Timeout - but sync might still be running
    console.log('⏰ Sync request timeout, but sync may still be running in background');
    return { 
      success: true, 
      data: {
        requestId: syncRequest.id,
        status: 'timeout',
        message: 'Sync initiated but completion status unknown (check email list in a few moments)'
      }
    };
    
  } catch (error) {
    console.error('❌ Database sync trigger error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database sync error' 
    };
  }
}

// Alternative: Non-blocking version (fire and forget)
export async function triggerManualSyncNonBlocking(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔄 Triggering manual sync (non-blocking)...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return { 
        success: false, 
        error: 'No authenticated user. Please log in again.' 
      };
    }

    // Insert sync request into database
    const { data: syncRequest, error: insertError } = await supabase
      .from('sync_requests')
      .insert({
        user_id: user.id,
        request_type: 'manual_sync',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create sync request:', insertError);
      return { 
        success: false, 
        error: `Failed to create sync request: ${insertError.message}` 
      };
    }

    console.log('✅ Sync request created (non-blocking):', syncRequest.id);
    
    return { 
      success: true, 
      data: {
        requestId: syncRequest.id,
        message: 'Sync request submitted successfully. Check email list in a few moments.'
      }
    };
    
  } catch (error) {
    console.error('❌ Database sync trigger error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database sync error' 
    };
  }
}

export const simpleEmailService = new SimpleEmailService();

// Export the archive function
export const moveProcessedEmailsToArchive = () => simpleEmailService.moveProcessedEmailsToArchive();