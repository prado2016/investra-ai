/**
 * Email Services Export Index
 * Centralized exports for all email-related services
 */

// Service exports
export { imapConfigurationService } from './imapConfigurationService';
export { emailInboxService } from './emailInboxService';
export { emailImportService } from './emailImportService';

// Type exports from IMAP Configuration Service
export type {
  ImapConfiguration,
  ImapConfigurationInput,
  TestConnectionRequest
} from './imapConfigurationService';

// Type exports from Email Inbox Service
export type {
  EmailInboxItem,
  EmailProcessResult
} from './emailInboxService';

// Type exports from Email Import Service
export type {
  SyncStatus,
  SyncResult
} from './emailImportService';

// Common service response type
export type {
  ServiceResponse
} from './imapConfigurationService';