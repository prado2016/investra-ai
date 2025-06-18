/**
 * Email Integration Settings Section
 * Configuration for IMAP settings and email processing
 */

import React from 'react';
import ConfigurationForm, { ConfigurationField } from '../components/ConfigurationForm';
import { useConfigurationSection } from '../hooks/useConfigurationSection';

const EmailIntegrationSettings: React.FC = () => {
  const {
    values,
    errors,
    loading,
    testResult,
    updateValue,
    saveConfiguration,
    testConfiguration
  } = useConfigurationSection('email_server');

  const fields: ConfigurationField[] = [
    // IMAP Server Configuration
    {
      key: 'imap_host',
      label: 'IMAP Server Host',
      description: 'IMAP server hostname (e.g., imap.gmail.com, outlook.office365.com)',
      type: 'string',
      required: true,
      placeholder: 'imap.gmail.com',
      group: 'IMAP Connection'
    },
    {
      key: 'imap_port',
      label: 'IMAP Port',
      description: 'IMAP server port number (usually 993 for SSL, 143 for non-SSL)',
      type: 'number',
      required: true,
      defaultValue: 993,
      validation: { min: 1, max: 65535 },
      group: 'IMAP Connection'
    },
    {
      key: 'imap_secure',
      label: 'Use SSL/TLS encryption for IMAP connection',
      type: 'boolean',
      defaultValue: true,
      group: 'IMAP Connection'
    },
    {
      key: 'imap_username',
      label: 'Email Address',
      description: 'Your email address for IMAP authentication',
      type: 'email',
      required: true,
      placeholder: 'your-email@gmail.com',
      group: 'IMAP Authentication'
    },
    {
      key: 'imap_password',
      label: 'Password / App Password',
      description: 'Your email password or app-specific password (recommended for Gmail)',
      type: 'password',
      required: true,
      sensitive: true,
      placeholder: 'Enter your password or app password',
      group: 'IMAP Authentication'
    },
    
    // Email Processing Configuration
    {
      key: 'imap_folder',
      label: 'IMAP Folder',
      description: 'Email folder to monitor for transaction emails',
      type: 'select',
      defaultValue: 'INBOX',
      options: [
        { value: 'INBOX', label: 'INBOX' },
        { value: 'INBOX/Transactions', label: 'INBOX/Transactions' },
        { value: 'INBOX/Financial', label: 'INBOX/Financial' },
        { value: 'INBOX/Wealthsimple', label: 'INBOX/Wealthsimple' }
      ],
      group: 'Email Processing'
    },
    {
      key: 'auto_start',
      label: 'Automatically start IMAP service when server starts',
      type: 'boolean',
      defaultValue: false,
      group: 'Email Processing'
    },
    {
      key: 'batch_size',
      label: 'Processing Batch Size',
      description: 'Number of emails to process in each batch',
      type: 'number',
      defaultValue: 10,
      validation: { min: 1, max: 100 },
      group: 'Email Processing'
    },
    {
      key: 'processing_interval',
      label: 'Processing Interval (minutes)',
      description: 'How often to check for new emails',
      type: 'number',
      defaultValue: 5,
      validation: { min: 1, max: 60 },
      group: 'Email Processing'
    },
    
    // Email Filtering
    {
      key: 'sender_whitelist',
      label: 'Sender Whitelist',
      description: 'Comma-separated list of allowed sender emails or domains (e.g., @wealthsimple.com)',
      type: 'textarea',
      placeholder: '@wealthsimple.com, @questrade.com, notifications@bank.com',
      group: 'Email Filtering'
    },
    {
      key: 'subject_filters',
      label: 'Subject Filters',
      description: 'Comma-separated keywords that must be present in email subjects',
      type: 'textarea',
      placeholder: 'transaction, trade, order, confirmation, statement',
      group: 'Email Filtering'
    },
    {
      key: 'exclude_promotional',
      label: 'Exclude promotional emails automatically',
      type: 'boolean',
      defaultValue: true,
      group: 'Email Filtering'
    },
    
    // Error Handling
    {
      key: 'retry_attempts',
      label: 'Retry Attempts',
      description: 'Number of times to retry failed email processing',
      type: 'number',
      defaultValue: 3,
      validation: { min: 0, max: 10 },
      group: 'Error Handling'
    },
    {
      key: 'retry_delay',
      label: 'Retry Delay (seconds)',
      description: 'Delay between retry attempts',
      type: 'number',
      defaultValue: 30,
      validation: { min: 5, max: 300 },
      group: 'Error Handling'
    },
    {
      key: 'error_notification_email',
      label: 'Error Notification Email',
      description: 'Email address to notify when processing errors occur',
      type: 'email',
      placeholder: 'admin@yourcompany.com',
      group: 'Error Handling'
    }
  ];

  return (
    <ConfigurationForm
      title="Email Integration Configuration"
      description="Configure IMAP settings for automated email processing and transaction import from financial institutions."
      fields={fields}
      values={values}
      onChange={updateValue}
      onSave={saveConfiguration}
      onTest={testConfiguration}
      loading={loading}
      testResult={testResult}
      errors={errors}
    />
  );
};

export default EmailIntegrationSettings;