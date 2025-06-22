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

    // Try AI parsing first
    try {
      const aiResponse: EmailParsingResponse = await aiServiceManager.parseEmailForTransaction(aiRequest);
      
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
        console.log('AI parsing failed or low confidence:', { 
          success: aiResponse.success, 
          confidence: aiResponse.confidence,
          error: aiResponse.error 
        });
      }
    } catch (aiError) {
      console.error('AI parsing error, falling back to regex:', aiError);
    }

    // Fallback to regex-based parsing if AI fails or returns low confidence
    console.log('Using fallback regex parsing');
    
    // Create basic raw data object for audit trail
    const rawData = {
      subject,
      content: content.substring(0, 1000), // Store first 1000 chars
      parsed_at: new Date().toISOString(),
      aiParsed: false,
      fallbackReason: 'AI parsing failed or low confidence'
    };
    
    // Simple fallback parsing for basic amount extraction
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
        currency: 'USD',
        aiParsed: false,
        confidence: 0.5,
        parsingType: 'basic' as const,
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