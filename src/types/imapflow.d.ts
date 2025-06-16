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
    logger?: boolean;
  }

  export interface ImapMessage {
    uid: number;
    source: Buffer | string;
    envelope?: {
      subject?: string;
      from?: Array<{ address: string; name?: string }>;
      date?: Date;
    };
    bodyStructure?: any;
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

  export class ImapFlow {
    constructor(options: ImapFlowOptions);
    
    connect(): Promise<void>;
    logout(): Promise<void>;
    
    mailboxOpen(mailbox: string): Promise<any>;
    
    fetch(query: SearchQuery | string, options: FetchOptions): AsyncIterable<ImapMessage>;
    
    messageFlagsAdd(uid: number, flags: string[], options?: { uid?: boolean }): Promise<void>;
    
    on(event: 'close', listener: () => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
    on(event: 'exists', listener: (data: { count: number }) => void): void;
    
    serverInfo?: any;
  }
}