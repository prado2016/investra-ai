/**
 * Type declarations for imapflow module
 * Placed in @types directory for better CI compatibility
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
    logger?: any;
  }

  export interface MessageInfo {
    uid: number;
    flags: Set<string>;
    envelope: any;
    bodyStructure: any;
  }

  export interface FetchQuery {
    uid: boolean;
    flags: boolean;
    envelope: boolean;
    bodyStructure: boolean;
    source: boolean;
  }

  export default class ImapFlow {
    constructor(options: ImapFlowOptions);
    connect(): Promise<void>;
    close(): Promise<void>;
    getMailboxLock(path: string): Promise<any>;
    search(query: any): Promise<number[]>;
    fetch(range: string, query: FetchQuery): AsyncIterable<MessageInfo>;
    logout(): Promise<void>;
  }
}
