/**
 * Database Settings Section
 * Configuration for Supabase connection and database settings
 */

import React from 'react';
import ConfigurationForm, { type ConfigurationField } from '../components/ConfigurationForm';
import { useConfigurationSection } from '../hooks/useConfigurationSection';

const DatabaseSettings: React.FC = () => {
  const {
    values,
    errors,
    loading,
    testResult,
    updateValue,
    saveConfiguration,
    testConfiguration
  } = useConfigurationSection('database');

  const fields: ConfigurationField[] = [
    // Supabase Connection
    {
      key: 'supabase_url',
      label: 'Supabase Project URL',
      description: 'Your Supabase project URL (e.g., https://your-project.supabase.co)',
      type: 'url',
      required: true,
      placeholder: 'https://your-project.supabase.co',
      validation: {
        pattern: '^https://[a-z0-9-]+\\.supabase\\.co$'
      },
      group: 'Supabase Connection'
    },
    {
      key: 'supabase_anon_key',
      label: 'Supabase Anonymous Key',
      description: 'Your Supabase anonymous/public key for client-side operations',
      type: 'password',
      required: true,
      sensitive: true,
      placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      group: 'Supabase Connection'
    },
    {
      key: 'supabase_service_role_key',
      label: 'Supabase Service Role Key',
      description: 'Your Supabase service role key for server-side operations (handle with extreme care)',
      type: 'password',
      required: true,
      sensitive: true,
      placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      group: 'Supabase Connection'
    },

    // Connection Pool Settings
    {
      key: 'max_connections',
      label: 'Maximum Connections',
      description: 'Maximum number of database connections in the pool',
      type: 'number',
      defaultValue: 10,
      validation: { min: 1, max: 100 },
      group: 'Connection Pool'
    },
    {
      key: 'min_connections',
      label: 'Minimum Connections',
      description: 'Minimum number of database connections to maintain',
      type: 'number',
      defaultValue: 2,
      validation: { min: 1, max: 20 },
      group: 'Connection Pool'
    },
    {
      key: 'connection_timeout',
      label: 'Connection Timeout (ms)',
      description: 'Timeout for establishing database connections',
      type: 'number',
      defaultValue: 30000,
      validation: { min: 5000, max: 120000 },
      group: 'Connection Pool'
    },
    {
      key: 'idle_timeout',
      label: 'Idle Timeout (ms)',
      description: 'Timeout for idle connections before closing',
      type: 'number',
      defaultValue: 300000,
      validation: { min: 30000, max: 3600000 },
      group: 'Connection Pool'
    },

    // Query Settings
    {
      key: 'query_timeout',
      label: 'Query Timeout (ms)',
      description: 'Timeout for individual database queries',
      type: 'number',
      defaultValue: 60000,
      validation: { min: 5000, max: 300000 },
      group: 'Query Settings'
    },
    {
      key: 'max_rows_per_query',
      label: 'Maximum Rows Per Query',
      description: 'Maximum number of rows to return in a single query',
      type: 'number',
      defaultValue: 1000,
      validation: { min: 100, max: 10000 },
      group: 'Query Settings'
    },
    {
      key: 'enable_query_logging',
      label: 'Enable query logging for debugging',
      type: 'boolean',
      defaultValue: false,
      group: 'Query Settings'
    },
    {
      key: 'log_slow_queries',
      label: 'Log slow queries (>1s)',
      type: 'boolean',
      defaultValue: true,
      group: 'Query Settings'
    },

    // RLS and Security
    {
      key: 'enable_rls_bypass',
      label: 'Enable RLS bypass for service operations',
      description: 'Allow service role to bypass Row Level Security (use carefully)',
      type: 'boolean',
      defaultValue: false,
      group: 'Security'
    },
    {
      key: 'enforce_ssl',
      label: 'Enforce SSL connections',
      type: 'boolean',
      defaultValue: true,
      group: 'Security'
    },
    {
      key: 'enable_prepared_statements',
      label: 'Enable prepared statements for better performance',
      type: 'boolean',
      defaultValue: true,
      group: 'Security'
    },

    // Backup and Maintenance
    {
      key: 'backup_enabled',
      label: 'Enable automated backups',
      type: 'boolean',
      defaultValue: true,
      group: 'Backup & Maintenance'
    },
    {
      key: 'backup_schedule',
      label: 'Backup Schedule (cron)',
      description: 'Cron expression for backup schedule (e.g., 0 2 * * * for daily at 2 AM)',
      type: 'string',
      defaultValue: '0 2 * * *',
      placeholder: '0 2 * * *',
      group: 'Backup & Maintenance'
    },
    {
      key: 'backup_retention_days',
      label: 'Backup Retention (days)',
      description: 'Number of days to retain backup files',
      type: 'number',
      defaultValue: 30,
      validation: { min: 1, max: 365 },
      group: 'Backup & Maintenance'
    },
    {
      key: 'auto_vacuum_enabled',
      label: 'Enable automatic database maintenance',
      type: 'boolean',
      defaultValue: true,
      group: 'Backup & Maintenance'
    },

    // Performance Monitoring
    {
      key: 'enable_performance_monitoring',
      label: 'Enable performance monitoring',
      type: 'boolean',
      defaultValue: true,
      group: 'Performance'
    },
    {
      key: 'performance_sample_rate',
      label: 'Performance Sample Rate (%)',
      description: 'Percentage of queries to sample for performance monitoring',
      type: 'number',
      defaultValue: 10,
      validation: { min: 1, max: 100 },
      group: 'Performance'
    },
    {
      key: 'alert_on_slow_queries',
      label: 'Alert on slow queries',
      type: 'boolean',
      defaultValue: true,
      group: 'Performance'
    },
    {
      key: 'slow_query_threshold',
      label: 'Slow Query Threshold (ms)',
      description: 'Queries slower than this will trigger alerts',
      type: 'number',
      defaultValue: 5000,
      validation: { min: 1000, max: 60000 },
      group: 'Performance'
    },

    // Data Retention
    {
      key: 'transaction_retention_years',
      label: 'Transaction Data Retention (years)',
      description: 'How long to keep transaction data',
      type: 'number',
      defaultValue: 7,
      validation: { min: 1, max: 50 },
      group: 'Data Retention'
    },
    {
      key: 'log_retention_days',
      label: 'Log Data Retention (days)',
      description: 'How long to keep log data',
      type: 'number',
      defaultValue: 90,
      validation: { min: 7, max: 365 },
      group: 'Data Retention'
    },
    {
      key: 'session_retention_days',
      label: 'Session Data Retention (days)',
      description: 'How long to keep user session data',
      type: 'number',
      defaultValue: 30,
      validation: { min: 1, max: 365 },
      group: 'Data Retention'
    },
    {
      key: 'auto_cleanup_enabled',
      label: 'Enable automatic cleanup of old data',
      type: 'boolean',
      defaultValue: true,
      group: 'Data Retention'
    }
  ];

  return (
    <ConfigurationForm
      title="Database Configuration"
      description="Configure Supabase connection settings, performance parameters, security options, and data retention policies."
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

export default DatabaseSettings;