/**
 * IMAP client for connecting to Gmail and fetching emails
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { logger } from './logger.js';
import { decrypt } from './encryption.js';
import type { ImapConfiguration, EmailData } from './database.js';

export interface ParsedEmail {
  messageId: string;
  threadId?: string;
  subject?: string;
  from?: {
    name?: string;
    email?: string;
  };
  to?: string;
  replyTo?: string;
  receivedAt: Date;
  textContent?: string;
  htmlContent?: string;
  attachments: AttachmentInfo[];
  size: number;
  rawContent: string;
  uid: number; // Add UID for tracking
}

export interface AttachmentInfo {
  filename?: string;
  contentType?: string;
  size?: number;
}

export class ImapClient {
  private client: ImapFlow | null = null;
  private config: ImapConfiguration;

  constructor(config: ImapConfiguration) {
    this.config = config;
  }

  /**
   * Connect to Gmail IMAP server
   */
  async connect(): Promise<void> {
    try {
      // Try to decrypt the Gmail app password, fallback to environment variable
      let password: string;
      try {
        password = decrypt(this.config.encrypted_app_password);
        logger.debug(`Using decrypted password for ${this.config.gmail_email}`);
      } catch (decryptError) {
        // Fallback to environment variable for development/setup
        const envPassword = process.env.IMAP_PASSWORD;
        if (envPassword && this.config.gmail_email === process.env.IMAP_USERNAME) {
          password = envPassword;
          logger.warn(`Decryption failed for ${this.config.gmail_email}, using environment variable`);
        } else {
          logger.error(`Decryption failed and no fallback available for ${this.config.gmail_email}`);
          throw decryptError;
        }
      }

      this.client = new ImapFlow({
        host: this.config.imap_host,
        port: this.config.imap_port,
        secure: this.config.imap_secure,
        auth: {
          user: this.config.gmail_email,
          pass: password
        },
        logger: false, // Disable ImapFlow's own logging
        emitLogs: false
      });

      await this.client.connect();
      logger.info(`Connected to IMAP server for ${this.config.gmail_email}`);

    } catch (error) {
      logger.error(`Failed to connect to IMAP server:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.logout();
        this.client = null;
        logger.info(`Disconnected from IMAP server for ${this.config.gmail_email}`);
      }
    } catch (error) {
      logger.warn(`Error during IMAP disconnect:`, error);
    }
  }

  /**
   * Create or ensure a folder exists in Gmail
   */
  async ensureFolder(folderName: string): Promise<void> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    try {
      if (!this.client) {
        throw new Error('IMAP client not connected');
      }

      // Try to select the folder first
      try {
        await this.client.mailboxOpen(folderName);
        logger.debug(`Folder ${folderName} already exists`);
        return;
      } catch {
        // Folder doesn't exist, create it
        logger.info(`Creating folder: ${folderName}`);
      }

      // Create the folder
      await (this.client as any).mailboxCreate(folderName);
      logger.info(`Successfully created folder: ${folderName}`);

    } catch (error) {
      logger.error(`Failed to ensure folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Move emails to a specific folder by UIDs
   */
  async moveEmailsToFolder(uids: number[], folderName: string): Promise<void> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    if (uids.length === 0) {
      logger.debug('No emails to move');
      return;
    }

    try {
      // Ensure we're in INBOX
      await this.client.mailboxOpen('INBOX');
      
      // Ensure the destination folder exists
      await this.ensureFolder(folderName);

      if (!this.client) {
        throw new Error('IMAP client not connected');
      }

      // Move emails by UID
      const uidSet = uids.join(',');
      logger.info(`Moving ${uids.length} emails to ${folderName}`);
      
      await (this.client as any).messageMove(uidSet, folderName, { uid: true });
      logger.info(`Successfully moved ${uids.length} emails to ${folderName}`);

    } catch (error) {
      logger.error(`Failed to move emails to ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Move all emails currently in INBOX to processed folder (clean slate)
   */
  async moveAllInboxEmails(folderName: string): Promise<number> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    try {
      // Select INBOX
      await this.client.mailboxOpen('INBOX');
      
      // Get all messages
      const mailboxStatus = await this.client.status('INBOX', { messages: true });
      const totalMessages = mailboxStatus.messages;
      
      if (totalMessages === 0) {
        logger.info('No messages to move from INBOX');
        return 0;
      }

      logger.info(`Found ${totalMessages} messages in INBOX to move`);
      
      if (!this.client) {
        throw new Error('IMAP client not connected');
      }

      // Ensure destination folder exists
      await this.ensureFolder(folderName);

      // Move all messages (use sequence numbers 1:*)
      await (this.client as any).messageMove('1:*', folderName);
      logger.info(`Successfully moved all ${totalMessages} emails to ${folderName}`);
      
      return totalMessages;

    } catch (error) {
      logger.error(`Failed to move all inbox emails:`, error);
      throw error;
    }
  }

  /**
   * Fetch recent emails from INBOX
   */
  async fetchRecentEmails(maxCount: number = 50): Promise<ParsedEmail[]> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    try {
      // Select INBOX
      await this.client.mailboxOpen('INBOX');
      logger.debug('Opened INBOX mailbox');

      // Get message count
      const mailboxStatus = await this.client.status('INBOX', {
        messages: true,
        unseen: true
      });
      
      logger.info(`Mailbox status: ${mailboxStatus.messages} total, ${mailboxStatus.unseen} unseen`);

      // Calculate sequence range for recent emails
      const totalMessages = mailboxStatus.messages;
      if (totalMessages === 0) {
        logger.info('No messages in mailbox');
        return [];
      }

      const startSeq = Math.max(1, totalMessages - maxCount + 1);
      const endSeq = totalMessages;

      logger.debug(`Fetching messages ${startSeq}:${endSeq}`);

      // Fetch messages
      const messages = [];
      for await (const message of this.client.fetch(`${startSeq}:${endSeq}`, {
        source: true,
        envelope: true,
        uid: true,
        flags: true,
        internalDate: true,
        size: true
      })) {
        try {
          const parsed = await this.parseMessage(message);
          if (parsed) {
            messages.push(parsed);
          }
        } catch (error) {
          logger.warn(`Failed to parse message ${message.seq}:`, error);
        }
      }

      logger.info(`Successfully fetched and parsed ${messages.length} messages`);
      return messages.reverse(); // Return newest first

    } catch (error) {
      logger.error(`Failed to fetch emails:`, error);
      throw error;
    }
  }

  /**
   * Parse a raw IMAP message into our email format
   */
  private async parseMessage(message: { seq: number; source: Buffer; uid: number; size: number; internalDate: Date; }): Promise<ParsedEmail | null> {
    try {
      if (!message.source) {
        logger.warn(`Message ${message.seq} has no source content`);
        return null;
      }

      // Parse the raw email content
      const parsed = await simpleParser(message.source);
      
      // Extract thread ID from message headers (Gmail specific)
      const threadId = parsed.headers.get('x-gm-thrid') || 
                      parsed.headers.get('thread-id') || 
                      undefined;

      // Build the parsed email object
      const parsedEmail: ParsedEmail = {
        messageId: parsed.messageId || `msg-${message.uid}-${Date.now()}`,
        threadId: threadId?.toString(),
        subject: parsed.subject || 'No Subject',
        from: {
          name: parsed.from?.value?.[0]?.name,
          email: parsed.from?.value?.[0]?.address
        },
        to: parsed.to?.text,
        replyTo: parsed.replyTo?.text,
        receivedAt: message.internalDate || new Date(),
        textContent: parsed.text || '',
        htmlContent: parsed.html || '',
        attachments: parsed.attachments || [],
        size: message.size || 0,
        rawContent: message.source.toString(),
        uid: message.uid // Include UID for tracking
      };

      logger.debug(`Parsed email: ${parsedEmail.subject} from ${parsedEmail.from?.email}`);
      return parsedEmail;

    } catch (error) {
      logger.error(`Error parsing message:`, error);
      return null;
    }
  }

  /**
   * Convert parsed email to database format
   */
  emailToDbFormat(email: ParsedEmail, userId: string): EmailData {
    return {
      user_id: userId,
      message_id: email.messageId,
      thread_id: email.threadId,
      subject: email.subject,
      from_email: email.from?.email,
      from_name: email.from?.name,
      to_email: email.to,
      reply_to: email.replyTo,
      received_at: email.receivedAt.toISOString(),
      raw_content: email.rawContent,
      text_content: email.textContent,
      html_content: email.htmlContent,
      attachments_info: email.attachments.map(att => ({
        filename: att.filename || 'unknown',
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0
      })) as { filename: string; contentType: string; size: number; }[],
      email_size: email.size,
      priority: 'normal',
      status: 'pending'
    };
  }

  /**
   * Test IMAP connection without fetching emails
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      
      if (this.client) {
        await this.client.mailboxOpen('INBOX');
        const status = await this.client.status('INBOX', { messages: true });
        logger.info(`Connection test successful. ${status.messages} messages in INBOX`);
        await this.disconnect();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Connection test failed:', error);
      await this.disconnect();
      return false;
    }
  }
}