/**
 * Security Settings Section
 * Configuration for encryption, authentication, and access control
 */

import React from 'react';
import ConfigurationForm, { ConfigurationField } from '../components/ConfigurationForm';
import { useConfigurationSection } from '../hooks/useConfigurationSection';

const SecuritySettings: React.FC = () => {
  const {
    values,
    errors,
    loading,
    testResult,
    updateValue,
    saveConfiguration,
    testConfiguration
  } = useConfigurationSection('security');

  const fields: ConfigurationField[] = [
    // Encryption Configuration
    {
      key: 'encryption_algorithm',
      label: 'Encryption Algorithm',
      description: 'Algorithm used for encrypting sensitive data',
      type: 'select',
      defaultValue: 'AES-256-GCM',
      options: [
        { value: 'AES-256-GCM', label: 'AES-256-GCM (Recommended)' },
        { value: 'AES-256-CBC', label: 'AES-256-CBC' },
        { value: 'ChaCha20-Poly1305', label: 'ChaCha20-Poly1305' }
      ],
      group: 'Encryption'
    },
    {
      key: 'encryption_key_rotation_days',
      label: 'Key Rotation Interval (days)',
      description: 'How often to rotate encryption keys',
      type: 'number',
      defaultValue: 90,
      validation: { min: 30, max: 365 },
      group: 'Encryption'
    },
    {
      key: 'enable_at_rest_encryption',
      label: 'Enable encryption at rest',
      description: 'Encrypt sensitive data when stored in database',
      type: 'boolean',
      defaultValue: true,
      group: 'Encryption'
    },
    {
      key: 'enable_in_transit_encryption',
      label: 'Enable encryption in transit',
      description: 'Encrypt all data transmitted between services',
      type: 'boolean',
      defaultValue: true,
      group: 'Encryption'
    },
    {
      key: 'key_derivation_iterations',
      label: 'Key Derivation Iterations',
      description: 'Number of PBKDF2 iterations for key derivation',
      type: 'number',
      defaultValue: 100000,
      validation: { min: 50000, max: 1000000 },
      group: 'Encryption'
    },

    // Authentication Configuration
    {
      key: 'session_timeout_minutes',
      label: 'Session Timeout (minutes)',
      description: 'How long user sessions remain active',
      type: 'number',
      defaultValue: 480,
      validation: { min: 60, max: 1440 },
      group: 'Authentication'
    },
    {
      key: 'require_2fa',
      label: 'Require two-factor authentication',
      description: 'Force all users to enable 2FA for enhanced security',
      type: 'boolean',
      defaultValue: false,
      group: 'Authentication'
    },
    {
      key: 'max_concurrent_sessions',
      label: 'Maximum Concurrent Sessions',
      description: 'Maximum number of active sessions per user',
      type: 'number',
      defaultValue: 3,
      validation: { min: 1, max: 10 },
      group: 'Authentication'
    },
    {
      key: 'session_renewal_threshold_minutes',
      label: 'Session Renewal Threshold (minutes)',
      description: 'Renew session if activity within this time before expiry',
      type: 'number',
      defaultValue: 60,
      validation: { min: 15, max: 240 },
      group: 'Authentication'
    },
    {
      key: 'remember_me_days',
      label: 'Remember Me Duration (days)',
      description: 'How long "Remember Me" sessions last',
      type: 'number',
      defaultValue: 30,
      validation: { min: 7, max: 365 },
      group: 'Authentication'
    },

    // Password Policy
    {
      key: 'password_min_length',
      label: 'Minimum Password Length',
      description: 'Minimum number of characters required in passwords',
      type: 'number',
      defaultValue: 12,
      validation: { min: 8, max: 128 },
      group: 'Password Policy'
    },
    {
      key: 'password_require_uppercase',
      label: 'Require uppercase letters',
      type: 'boolean',
      defaultValue: true,
      group: 'Password Policy'
    },
    {
      key: 'password_require_lowercase',
      label: 'Require lowercase letters',
      type: 'boolean',
      defaultValue: true,
      group: 'Password Policy'
    },
    {
      key: 'password_require_numbers',
      label: 'Require numbers',
      type: 'boolean',
      defaultValue: true,
      group: 'Password Policy'
    },
    {
      key: 'password_require_symbols',
      label: 'Require special characters',
      type: 'boolean',
      defaultValue: true,
      group: 'Password Policy'
    },
    {
      key: 'password_history_count',
      label: 'Password History Count',
      description: 'Number of previous passwords to remember and reject',
      type: 'number',
      defaultValue: 5,
      validation: { min: 0, max: 24 },
      group: 'Password Policy'
    },
    {
      key: 'password_expiry_days',
      label: 'Password Expiry (days)',
      description: 'Days after which passwords must be changed (0 = never)',
      type: 'number',
      defaultValue: 0,
      validation: { min: 0, max: 365 },
      group: 'Password Policy'
    },

    // Account Security
    {
      key: 'account_lockout_attempts',
      label: 'Account Lockout Attempts',
      description: 'Number of failed login attempts before account lockout',
      type: 'number',
      defaultValue: 5,
      validation: { min: 3, max: 20 },
      group: 'Account Security'
    },
    {
      key: 'account_lockout_duration_minutes',
      label: 'Account Lockout Duration (minutes)',
      description: 'How long accounts remain locked after too many failed attempts',
      type: 'number',
      defaultValue: 15,
      validation: { min: 5, max: 1440 },
      group: 'Account Security'
    },
    {
      key: 'enable_ip_whitelisting',
      label: 'Enable IP address whitelisting',
      description: 'Restrict access to specific IP addresses',
      type: 'boolean',
      defaultValue: false,
      group: 'Account Security'
    },
    {
      key: 'allowed_ip_addresses',
      label: 'Allowed IP Addresses',
      description: 'Comma-separated list of allowed IP addresses or CIDR blocks',
      type: 'textarea',
      placeholder: '192.168.1.0/24, 10.0.0.1, 203.0.113.0/24',
      group: 'Account Security'
    },
    {
      key: 'enable_device_tracking',
      label: 'Enable device tracking',
      description: 'Track and alert on new device logins',
      type: 'boolean',
      defaultValue: true,
      group: 'Account Security'
    },

    // API Security
    {
      key: 'api_rate_limit_per_minute',
      label: 'API Rate Limit (requests/minute)',
      description: 'Maximum API requests per minute per user',
      type: 'number',
      defaultValue: 100,
      validation: { min: 10, max: 1000 },
      group: 'API Security'
    },
    {
      key: 'api_rate_limit_burst',
      label: 'API Rate Limit Burst',
      description: 'Burst allowance for API rate limiting',
      type: 'number',
      defaultValue: 20,
      validation: { min: 5, max: 200 },
      group: 'API Security'
    },
    {
      key: 'require_api_key_authentication',
      label: 'Require API key authentication',
      description: 'Require API keys for all API access',
      type: 'boolean',
      defaultValue: true,
      group: 'API Security'
    },
    {
      key: 'api_key_expiry_days',
      label: 'API Key Expiry (days)',
      description: 'Days after which API keys expire (0 = never)',
      type: 'number',
      defaultValue: 0,
      validation: { min: 0, max: 365 },
      group: 'API Security'
    },

    // Data Protection
    {
      key: 'enable_data_masking',
      label: 'Enable data masking in logs',
      description: 'Mask sensitive data in log files',
      type: 'boolean',
      defaultValue: true,
      group: 'Data Protection'
    },
    {
      key: 'pii_retention_days',
      label: 'PII Retention (days)',
      description: 'How long to retain personally identifiable information',
      type: 'number',
      defaultValue: 2555, // 7 years
      validation: { min: 365, max: 3650 },
      group: 'Data Protection'
    },
    {
      key: 'enable_data_anonymization',
      label: 'Enable automatic data anonymization',
      description: 'Automatically anonymize old user data',
      type: 'boolean',
      defaultValue: false,
      group: 'Data Protection'
    },
    {
      key: 'anonymization_threshold_days',
      label: 'Anonymization Threshold (days)',
      description: 'Anonymize data older than this many days',
      type: 'number',
      defaultValue: 1095, // 3 years
      validation: { min: 365, max: 3650 },
      group: 'Data Protection'
    },

    // Audit and Compliance
    {
      key: 'enable_audit_logging',
      label: 'Enable comprehensive audit logging',
      description: 'Log all user actions for compliance and security auditing',
      type: 'boolean',
      defaultValue: true,
      group: 'Audit & Compliance'
    },
    {
      key: 'audit_log_retention_years',
      label: 'Audit Log Retention (years)',
      description: 'How long to retain audit logs',
      type: 'number',
      defaultValue: 7,
      validation: { min: 1, max: 20 },
      group: 'Audit & Compliance'
    },
    {
      key: 'enable_gdpr_compliance',
      label: 'Enable GDPR compliance features',
      description: 'Enable features required for GDPR compliance',
      type: 'boolean',
      defaultValue: true,
      group: 'Audit & Compliance'
    },
    {
      key: 'data_breach_notification_email',
      label: 'Data Breach Notification Email',
      description: 'Email address to notify in case of potential data breaches',
      type: 'email',
      sensitive: true,
      placeholder: 'security@yourcompany.com',
      group: 'Audit & Compliance'
    },

    // Security Headers and CORS
    {
      key: 'enable_security_headers',
      label: 'Enable security headers',
      description: 'Add security headers to HTTP responses',
      type: 'boolean',
      defaultValue: true,
      group: 'Web Security'
    },
    {
      key: 'content_security_policy',
      label: 'Content Security Policy',
      description: 'CSP header value for preventing XSS attacks',
      type: 'textarea',
      defaultValue: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      group: 'Web Security'
    },
    {
      key: 'allowed_origins',
      label: 'Allowed CORS Origins',
      description: 'Comma-separated list of allowed origins for CORS',
      type: 'textarea',
      placeholder: 'https://app.yourcompany.com, https://yourcompany.com',
      group: 'Web Security'
    },
    {
      key: 'enable_hsts',
      label: 'Enable HTTP Strict Transport Security (HSTS)',
      type: 'boolean',
      defaultValue: true,
      group: 'Web Security'
    }
  ];

  return (
    <ConfigurationForm
      title="Security Configuration"
      description="Configure encryption settings, authentication policies, access controls, and security monitoring to protect sensitive financial data and user information."
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

export default SecuritySettings;