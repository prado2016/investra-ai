/**
 * Type declarations for imapflow library
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
    logger?: boolean | any;
    tls?: any;
    disableAutoIdle?: boolean;
    clientInfo?: any;
  }

  export interface ServerInfo {
    vendor?: string;
    name?: string;
    version?: string;
    capability?: string[];
    greeting?: string;
  }

  export interface MailboxLockObject {
    path: string;
    release(): Promise<void>;
  }

  export interface MessageSource {
    uid: number;
    source: Buffer | string;
  }

  export interface ListResponse {
    path: string;
    name: string;
    delimiter: string;
    flags: Set<string>;
    specialUse?: string;
  }

  export interface ImapMessage {
    uid: number;
    source: Buffer | string;
    envelope?: {
      subject?: string;
      from?: Array<{ address: string; name?: string }>;
      date?: Date;
    };
    bodyStructure?: Record<string, unknown>;
  }

  export interface SearchQuery {
    unseen?: boolean;
    from?: string;
    subject?: string;
    since?: Date;
    before?: Date;
  }

  export interface FetchOptions {
    uid?: boolean;
    envelope?: boolean;
    bodyStructure?: boolean;
    source?: boolean;
  }

  export class ImapFlow extends EventTarget {
    serverInfo?: ServerInfo;
    authenticated: boolean;
    capabilities: Set<string>;
    enabled: Set<string>;
    
    constructor(options: ImapFlowOptions);
    
    // Connection methods
    connect(): Promise<void>;
    logout(): Promise<void>;
    close(): Promise<void>;
    
    // Authentication
    authenticate(auth?: { user: string; pass: string }): Promise<void>;
    
    // Mailbox operations
    list(parent?: string, options?: any): Promise<ListResponse[]>;
    getMailboxLock(path: string, options?: any): Promise<MailboxLockObject>;
    mailboxOpen(mailbox: string): Promise<Record<string, unknown>>;
    
    // Message operations
    fetch(range: string | number[] | SearchQuery, query?: any, options?: any): AsyncIterable<any>;
    messageFlagsAdd(uid: number, flags: string[], options?: { uid?: boolean }): Promise<void>;
    getQuota(path?: string): Promise<any>;
    
    // Status and capability
    status(path: string, query: any): Promise<any>;
    capability(): Promise<Map<string, any>>;
    
    // Events
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    
    // Connection state
    readonly usable: boolean;
    readonly secureConnection: boolean;
    readonly authenticated: boolean;
  }

  export interface ImapFlowError extends Error {
    code?: string;
    response?: string;
    responseStatus?: string;
  }
}