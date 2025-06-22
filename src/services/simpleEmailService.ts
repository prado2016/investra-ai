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

/**
 * Parse email content to extract trading transaction information
 */
export function parseEmailForTransaction(email: EmailItem): {
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
  // Raw data for audit trail
  rawData?: any;
  // Legacy fields for backward compatibility
  type?: 'income' | 'expense';
  amount?: number;
  description?: string;
  category?: string;
} | null {
  try {
    const content = email.text_content || email.html_content || '';
    const subject = email.subject || '';
    
    console.log('Parsing email content:', { subject, contentLength: content.length });
    
    // Create raw data object for audit trail
    const rawData = {
      subject,
      content: content.substring(0, 1000), // Store first 1000 chars
      parsed_at: new Date().toISOString()
    };
    
    // Extract portfolio/account name
    const portfolioPatterns = [
      /account[:\s]*([A-Z]{2,6})/gi,           // Account: TFSA
      /portfolio[:\s]*([A-Z]{2,6})/gi,         // Portfolio: RSP  
      /([A-Z]{2,6})\s*account/gi,              // TFSA Account
      /in\s+your\s+([A-Z]{2,6})/gi            // in your TFSA
    ];
    
    let portfolioName = '';
    for (const pattern of portfolioPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && typeof match[1] === 'string') {
        portfolioName = match[1].toUpperCase().trim();
        break;
      }
    }
    
    // Extract symbol
    const symbolPatterns = [
      /symbol[:\s]*([A-Z]{1,6})/gi,            // Symbol: NVDA
      /ticker[:\s]*([A-Z]{1,6})/gi,            // Ticker: TSLA
      /([A-Z]{2,6})\s+(?:shares?|contracts?)/gi, // NVDA shares
      /([A-Z]{2,6})\s+(?:stock|option)/gi      // NVDA stock
    ];
    
    let symbol = '';
    for (const pattern of symbolPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && typeof match[1] === 'string') {
        symbol = match[1].toUpperCase().trim();
        break;
      }
    }
    
    // Extract asset type - prioritize explicit mentions
    let assetType: 'stock' | 'option' | undefined;
    if (content.toLowerCase().includes('option') || content.toLowerCase().includes('contract')) {
      assetType = 'option';
    } else if (content.toLowerCase().includes('share') || content.toLowerCase().includes('stock')) {
      assetType = 'stock';
    }
    
    // Extract transaction type
    let transactionType: 'buy' | 'sell' | undefined;
    if (content.toLowerCase().includes('buy') || content.toLowerCase().includes('bought') || content.toLowerCase().includes('purchase')) {
      transactionType = 'buy';
    } else if (content.toLowerCase().includes('sell') || content.toLowerCase().includes('sold') || content.toLowerCase().includes('sale')) {
      transactionType = 'sell';
    }
    
    // Extract quantity
    const quantityPatterns = [
      /quantity[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,     // Quantity: 100
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*shares?/gi,         // 100 shares
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*contracts?/gi,      // 10 contracts
      /shares?[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,      // Shares: 100
      /contracts?[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/gi    // Contracts: 10
    ];
    
    let quantity = 0;
    for (const pattern of quantityPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0 && matches[0][1]) {
        const quantityStr = matches[0][1].replace(/,/g, '');
        quantity = parseFloat(quantityStr);
        console.log('Found quantity:', quantity, 'from pattern:', pattern);
        break;
      }
    }
    
    // Extract price per share/contract
    const pricePatterns = [
      /(?:average\s+)?price[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2,4})?)/gi,  // Average price: $123.45
      /price\s+per\s+(?:share|contract)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2,4})?)/gi, // Price per share: $50.00
      /at\s+\$?\s*(\d+(?:,\d{3})*(?:\.\d{2,4})?)\s+per/gi,                // at $50.00 per
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2,4})?)\s+per\s+(?:share|contract)/gi  // $50.00 per share
    ];
    
    let price = 0;
    for (const pattern of pricePatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0 && matches[0][1]) {
        const priceStr = matches[0][1].replace(/,/g, '');
        price = parseFloat(priceStr);
        console.log('Found price:', price, 'from pattern:', pattern);
        break;
      }
    }
    
    // Extract total amount
    const totalPatterns = [
      /total[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,     // Total: $123.45
      /total\s+value[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, // Total value: $123.45
      /amount[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi     // Amount: $123.45
    ];
    
    let totalAmount = 0;
    for (const pattern of totalPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0 && matches[0][1]) {
        const amountStr = matches[0][1].replace(/,/g, '');
        totalAmount = parseFloat(amountStr);
        console.log('Found total amount:', totalAmount, 'from pattern:', pattern);
        break;
      }
    }
    
    // Extract currency
    let currency = 'USD';
    const currencyMatch = content.match(/(USD|CAD|EUR|GBP)/gi);
    if (currencyMatch) {
      currency = currencyMatch[0].toUpperCase();
    }
    
    // Extract fees
    const feePatterns = [
      /fee[s]?[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,   // Fees: $1.50
      /commission[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, // Commission: $1.50
      /charge[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi     // Charge: $1.50
    ];
    
    let fees = 0;
    for (const pattern of feePatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0 && matches[0][1]) {
        const feeStr = matches[0][1].replace(/,/g, '');
        fees = parseFloat(feeStr);
        console.log('Found fees:', fees, 'from pattern:', pattern);
        break;
      }
    }
    
    // Extract transaction date/time - convert to YYYY-MM-DD format only
    const datePatterns = [
      /(?:date|time)[:\s]*(\d{4}-\d{2}-\d{2})/gi,           // Date: 2025-06-22
      /(?:date|time)[:\s]*(\d{2}\/\d{2}\/\d{4})/gi,        // Date: 06/22/2025
      /(?:on|at)\s+(\d{4}-\d{2}-\d{2})/gi,                 // on 2025-06-22
      /(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}/gi               // 2025-06-22 14:30
    ];
    
    let transactionDate = '';
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match && match[1] && typeof match[1] === 'string') {
        let dateStr = match[1];
        // Convert MM/DD/YYYY to YYYY-MM-DD
        if (dateStr.includes('/')) {
          const [month, day, year] = dateStr.split('/');
          dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        transactionDate = dateStr;
        break;
      }
    }
    
    // If no specific date found, try to extract from email received date
    if (!transactionDate && email.received_at) {
      try {
        const receivedDate = new Date(email.received_at);
        const year = receivedDate.getFullYear();
        const month = String(receivedDate.getMonth() + 1).padStart(2, '0');
        const day = String(receivedDate.getDate()).padStart(2, '0');
        transactionDate = `${year}-${month}-${day}`;
      } catch (error) {
        console.warn('Error parsing received_at date:', error);
      }
    }
    
    console.log('Parsed trading data:', {
      portfolioName, symbol, assetType, transactionType, quantity, price, totalAmount, fees, currency, transactionDate
    });
    
    // Check if we have sufficient data for a trading transaction
    const hasMinimumTradingData = symbol && assetType && transactionType && quantity > 0 && price > 0;
    
    if (hasMinimumTradingData) {
      return {
        // Trading transaction fields
        portfolioName,
        symbol,
        assetType,
        transactionType,
        quantity,
        price,
        totalAmount: totalAmount || (quantity * price), // Calculate if not found
        fees,
        currency,
        transactionDate,
        rawData,
        // Legacy fields for backward compatibility
        type: transactionType === 'buy' ? 'expense' : 'income',
        amount: totalAmount || (quantity * price),
        description: `${transactionType?.toUpperCase() || 'TRADE'} ${quantity} ${assetType === 'option' ? 'contracts' : 'shares'} of ${symbol}`,
        category: 'Trading'
      };
    }
    
    // Fallback to basic amount extraction for non-trading emails
    const basicAmountPatterns = [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,           // $123.45 or $1,234.56
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD/gi,         // 123.45 USD
      /amount[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, // Amount: $123.45
    ];
    
    let basicAmount = 0;
    for (const pattern of basicAmountPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0 && matches[0][1]) {
        const amountStr = matches[0][1].replace(/,/g, '');
        basicAmount = parseFloat(amountStr);
        console.log('Found basic amount:', basicAmount, 'from pattern:', pattern);
        break;
      }
    }
    
    if (basicAmount > 0) {
      // Determine basic transaction type
      let basicType: 'income' | 'expense' = 'expense';
      const incomeKeywords = ['deposit', 'dividend', 'interest', 'credit', 'received', 'incoming'];
      const expenseKeywords = ['withdrawal', 'withdraw', 'fee', 'charge', 'debit', 'outgoing'];
      
      const lowerContent = content.toLowerCase();
      const lowerSubject = subject.toLowerCase();
      const allText = lowerContent + ' ' + lowerSubject;
      
      if (incomeKeywords.some(keyword => allText.includes(keyword))) {
        basicType = 'income';
      } else if (expenseKeywords.some(keyword => allText.includes(keyword))) {
        basicType = 'expense';
      }
      
      return {
        type: basicType,
        amount: basicAmount,
        description: subject || 'Email transaction',
        category: 'Email Import',
        currency,
        rawData
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing email for transaction:', error);
    return null;
  }
}

export const simpleEmailService = new SimpleEmailService();