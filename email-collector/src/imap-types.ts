/**
 * Extended ImapFlow types for methods that exist but aren't in the type definitions
 */

import { ImapFlow } from 'imapflow';

// Extend the ImapFlow interface to include methods that exist in runtime but not in types
export interface ExtendedImapFlow extends ImapFlow {
  mailboxCreate(path: string): Promise<{
    path: string;
    mailboxId?: string;
    created: boolean;
  }>;
  
  messageMove(
    range: string | number[],
    destination: string,
    options?: { uid?: boolean }
  ): Promise<{
    path: string;
    destination: string;
    uidValidity?: bigint;
    uidMap?: Map<number, number>;
  }>;
}

// Type guard to assert ImapFlow has the extended methods
export function assertExtendedImapFlow(client: ImapFlow): asserts client is ExtendedImapFlow {
  if (!('mailboxCreate' in client) || !('messageMove' in client)) {
    throw new Error('ImapFlow client missing required methods (mailboxCreate or messageMove)');
  }
}