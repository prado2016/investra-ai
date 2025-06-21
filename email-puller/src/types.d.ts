/**
 * Type declarations for modules without TypeScript definitions
 */

declare module 'imapflow' {
  export interface ImapFlowOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    logger?: boolean;
    emitLogs?: boolean;
  }

  export interface MailboxStatus {
    messages: number;
    unseen: number;
  }

  export interface MessageInfo {
    seq: number;
    uid: number;
    source: Buffer;
    envelope: any;
    flags: string[];
    internalDate: Date;
    size: number;
  }

  export class ImapFlow {
    constructor(options: ImapFlowOptions);
    connect(): Promise<void>;
    logout(): Promise<void>;
    mailboxOpen(path: string): Promise<any>;
    status(path: string, query: any): Promise<MailboxStatus>;
    fetch(range: string, query: any): AsyncIterable<MessageInfo>;
  }
}

declare module 'mailparser' {
  export interface ParsedMail {
    messageId?: string;
    subject?: string;
    from?: {
      value?: Array<{
        name?: string;
        address?: string;
      }>;
    };
    to?: {
      text?: string;
    };
    replyTo?: {
      text?: string;
    };
    text?: string;
    html?: string;
    headers: Map<string, any>;
    attachments?: any[];
  }

  export function simpleParser(source: Buffer): Promise<ParsedMail>;
}

declare module 'node-cron' {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export function schedule(
    cronExpression: string,
    func: () => void,
    options?: {
      scheduled?: boolean;
      timezone?: string;
    }
  ): ScheduledTask;

  export function validate(cronExpression: string): boolean;
}