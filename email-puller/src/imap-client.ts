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
  attachments: any[];
  size: number;
  rawContent: string;
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
      // Decrypt the Gmail app password
      const password = decrypt(this.config.encrypted_app_password);

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
  private async parseMessage(message: any): Promise<ParsedEmail | null> {
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
        rawContent: message.source.toString()
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
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      })),
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