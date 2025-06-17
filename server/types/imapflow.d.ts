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
    
    // Message operations
    fetch(range: string | number[], query: any, options?: any): AsyncIterable<any>;
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
