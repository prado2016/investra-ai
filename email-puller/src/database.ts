/**
 * Database interface for the email puller
 * Handles all Supabase interactions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

export interface ImapConfiguration {
  id: string;
  user_id: string;
  name: string;
  gmail_email: string;
  encrypted_app_password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  last_error: string | null;
  emails_synced: number;
  sync_interval_minutes: number;
  max_emails_per_sync: number;
  created_at: string;
  updated_at: string;
}

export interface EmailData {
  user_id: string;
  message_id: string;
  thread_id?: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  to_email?: string;
  reply_to?: string;
  received_at: string;
  raw_content?: string;
  text_content?: string;
  html_content?: string;
  attachments_info?: any[];
  email_size?: number;
  priority?: 'low' | 'normal' | 'high';
  status?: 'pending' | 'processing' | 'error';
  error_message?: string;
}

export class Database {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabaseUrl, config.supabaseKey);
    logger.info('Database client initialized');
  }

  /**
   * Get all active IMAP configurations
   */
  async getActiveImapConfigurations(): Promise<ImapConfiguration[]> {
    try {
      const { data, error } = await this.client
        .from('imap_configurations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch IMAP configurations:', error);
        throw error;
      }

      logger.info(`Found ${data?.length || 0} active IMAP configurations`);
      return data || [];
    } catch (error) {
      logger.error('Error fetching IMAP configurations:', error);
      throw error;
    }
  }

  /**
   * Update sync status for an IMAP configuration
   */
  async updateImapConfigStatus(
    configId: string,
    status: ImapConfiguration['sync_status'],
    lastError?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        sync_status: status,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (lastError !== undefined) {
        updateData.last_error = lastError;
      }

      if (status === 'success') {
        updateData.last_error = null;
      }

      const { error } = await this.client
        .from('imap_configurations')
        .update(updateData)
        .eq('id', configId);

      if (error) {
        logger.error(`Failed to update IMAP config ${configId} status:`, error);
        throw error;
      }

      logger.debug(`Updated IMAP config ${configId} status to ${status}`);
    } catch (error) {
      logger.error(`Error updating IMAP config status:`, error);
      throw error;
    }
  }

  /**
   * Update email count for an IMAP configuration
   */
  async updateEmailsSynced(configId: string, count: number): Promise<void> {
    try {
      const { error } = await this.client
        .from('imap_configurations')
        .update({
          emails_synced: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) {
        logger.error(`Failed to update emails synced count:`, error);
        throw error;
      }

      logger.debug(`Updated emails synced count for config ${configId}: ${count}`);
    } catch (error) {
      logger.error(`Error updating emails synced count:`, error);
      throw error;
    }
  }

  /**
   * Check if email already exists in the inbox
   */
  async emailExists(messageId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('imap_inbox')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        logger.error('Failed to check email existence:', error);
        throw error;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      logger.error('Error checking email existence:', error);
      throw error;
    }
  }

  /**
   * Insert a new email into the inbox
   */
  async insertEmail(emailData: EmailData): Promise<string | null> {
    try {
      // Check if email already exists
      const exists = await this.emailExists(emailData.message_id, emailData.user_id);
      if (exists) {
        logger.debug(`Email ${emailData.message_id} already exists, skipping`);
        return null;
      }

      const { data, error } = await this.client
        .from('imap_inbox')
        .insert([{
          ...emailData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to insert email:', error);
        throw error;
      }

      logger.debug(`Inserted email ${emailData.message_id} with ID ${data.id}`);
      return data.id;
    } catch (error) {
      logger.error('Error inserting email:', error);
      throw error;
    }
  }

  /**
   * Batch insert multiple emails
   */
  async insertEmails(emails: EmailData[]): Promise<number> {
    if (emails.length === 0) return 0;

    let insertedCount = 0;
    const batchSize = 10; // Insert in smaller batches to avoid timeouts

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      try {
        // Filter out emails that already exist
        const newEmails = [];
        for (const email of batch) {
          const exists = await this.emailExists(email.message_id, email.user_id);
          if (!exists) {
            newEmails.push({
              ...email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }

        if (newEmails.length === 0) {
          logger.debug(`Batch ${Math.floor(i / batchSize) + 1}: All emails already exist`);
          continue;
        }

        const { data, error } = await this.client
          .from('imap_inbox')
          .insert(newEmails)
          .select('id');

        if (error) {
          logger.error(`Failed to insert email batch:`, error);
          // Continue with next batch instead of failing completely
          continue;
        }

        insertedCount += data?.length || 0;
        logger.debug(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} emails`);

      } catch (error) {
        logger.error(`Error processing email batch:`, error);
        // Continue with next batch
      }
    }

    logger.info(`Total emails inserted: ${insertedCount}`);
    return insertedCount;
  }

  /**
   * Get inbox email count for a user
   */
  async getInboxEmailCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('imap_inbox')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to get inbox email count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error getting inbox email count:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        logger.error('Database connection test failed:', error);
        return false;
      }

      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const database = new Database();