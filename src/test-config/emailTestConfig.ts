/**
 * Email Processing Test Configuration Helper
 * Helps configure IMAP settings for testing
 */

export const EMAIL_TEST_CONFIG = {
  // Server connection settings
  server: {
    host: process.env.IMAP_HOST || 'localhost',
    defaultPort: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_SECURE !== 'false'
  },
  
  // Test configurations to try
  imapConfigs: [
    {
      name: 'IMAPS (Secure)',
      host: process.env.IMAP_HOST || 'localhost',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_SECURE !== 'false',
      auth: {
        user: process.env.IMAP_USERNAME || '',
        pass: process.env.IMAP_PASSWORD || ''
      }
    },
    {
      name: 'IMAP with STARTTLS',
      host: process.env.IMAP_HOST || 'localhost',
      port: 143,
      secure: false,
      auth: {
        user: process.env.IMAP_USERNAME || '',
        pass: process.env.IMAP_PASSWORD || ''
      }
    }
  ],
  
  // Basic test email configuration (minimal for connection testing)
  testEmailConfig: {
    fromEmail: process.env.TEST_FROM_EMAIL || 'test@example.com',
    subject: process.env.TEST_EMAIL_SUBJECT || 'Test Email Connection',
    basicContent: 'Email connection test message'
  },
  
  // Basic validation patterns for email processing
  validationPatterns: {
    wealthsimpleFrom: /.*@wealthsimple\.com$/i,
    transactionSubjects: [
      'Trade Confirmation',
      'Order Filled',
      'Dividend Payment',
      'Option Expiration'
    ]
  },
  
  // Basic connection test scenarios
  connectionTestScenarios: [
    {
      name: 'IMAP Connection',
      description: 'Test basic IMAP server connectivity',
      testType: 'connection',
      expectSuccess: true
    },
    {
      name: 'Authentication',
      description: 'Test IMAP authentication',
      testType: 'auth',
      expectSuccess: true
    },
    {
      name: 'Mailbox Access',
      description: 'Test mailbox listing and access',
      testType: 'mailbox',
      expectSuccess: true
    }
  ],
  
  // Portfolio mappings for testing
  portfolioMappings: {
    'TFSA': 'tfsa-portfolio-id',
    'RRSP': 'rrsp-portfolio-id', 
    'Personal': 'personal-portfolio-id',
    'Margin': 'margin-portfolio-id'
  }
};

/**
 * Get IMAP configuration for your server
 */
export function getIMAPConfig(credentials: { username?: string; password?: string } = {}) {
  return {
    host: EMAIL_TEST_CONFIG.server.host,
    port: EMAIL_TEST_CONFIG.server.defaultPort,
    secure: EMAIL_TEST_CONFIG.server.secure,
    auth: {
      user: credentials.username || process.env.IMAP_USERNAME || '',
      pass: credentials.password || process.env.IMAP_PASSWORD || ''
    },
    logger: false
  };
}

/**
 * Get basic test email configuration
 */
export function getTestEmailConfig() {
  return EMAIL_TEST_CONFIG.testEmailConfig;
}

/**
 * Validate email is from Wealthsimple
 */
export function isWealthsimpleEmail(fromAddress: string): boolean {
  return EMAIL_TEST_CONFIG.validationPatterns.wealthsimpleFrom.test(fromAddress);
}

/**
 * Validate email subject indicates transaction
 */
export function isTransactionEmail(subject: string): boolean {
  return EMAIL_TEST_CONFIG.validationPatterns.transactionSubjects.some(pattern => 
    subject.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Get connection test scenarios
 */
export function getConnectionTestScenarios() {
  return EMAIL_TEST_CONFIG.connectionTestScenarios;
}

export default EMAIL_TEST_CONFIG;
