/**
 * Monitoring Settings Section
 * Configuration for health checks, alerts, and logging
 */

import React from 'react';
import ConfigurationForm, { type ConfigurationField } from '../components/ConfigurationForm';
import { useConfigurationSection } from '../hooks/useConfigurationSection';

const MonitoringSettings: React.FC = () => {
  const {
    values,
    errors,
    loading,
    testResult,
    updateValue,
    saveConfiguration,
    testConfiguration
  } = useConfigurationSection('monitoring');

  const fields: ConfigurationField[] = [
    // Health Check Configuration
    {
      key: 'health_check_interval',
      label: 'Health Check Interval (ms)',
      description: 'How often to perform system health checks',
      type: 'number',
      defaultValue: 30000,
      validation: { min: 10000, max: 300000 },
      group: 'Health Checks'
    },
    {
      key: 'health_check_timeout',
      label: 'Health Check Timeout (ms)',
      description: 'Timeout for individual health check operations',
      type: 'number',
      defaultValue: 5000,
      validation: { min: 1000, max: 30000 },
      group: 'Health Checks'
    },
    {
      key: 'enable_deep_health_checks',
      label: 'Enable deep health checks',
      description: 'Perform comprehensive health checks including database queries',
      type: 'boolean',
      defaultValue: true,
      group: 'Health Checks'
    },
    {
      key: 'health_check_endpoints',
      label: 'External Health Check Endpoints',
      description: 'Comma-separated list of external endpoints to monitor',
      type: 'textarea',
      placeholder: 'https://api.example.com/health, https://status.service.com',
      group: 'Health Checks'
    },

    // Alert Configuration
    {
      key: 'error_threshold',
      label: 'Error Threshold',
      description: 'Number of errors before triggering alerts',
      type: 'number',
      defaultValue: 10,
      validation: { min: 1, max: 100 },
      group: 'Alerting'
    },
    {
      key: 'error_rate_threshold',
      label: 'Error Rate Threshold (%)',
      description: 'Error rate percentage that triggers alerts',
      type: 'number',
      defaultValue: 5,
      validation: { min: 1, max: 50 },
      group: 'Alerting'
    },
    {
      key: 'response_time_threshold',
      label: 'Response Time Threshold (ms)',
      description: 'Response time that triggers performance alerts',
      type: 'number',
      defaultValue: 5000,
      validation: { min: 500, max: 60000 },
      group: 'Alerting'
    },
    {
      key: 'memory_threshold',
      label: 'Memory Usage Threshold (%)',
      description: 'Memory usage percentage that triggers alerts',
      type: 'number',
      defaultValue: 85,
      validation: { min: 50, max: 95 },
      group: 'Alerting'
    },
    {
      key: 'cpu_threshold',
      label: 'CPU Usage Threshold (%)',
      description: 'CPU usage percentage that triggers alerts',
      type: 'number',
      defaultValue: 80,
      validation: { min: 50, max: 95 },
      group: 'Alerting'
    },
    {
      key: 'disk_threshold',
      label: 'Disk Usage Threshold (%)',
      description: 'Disk usage percentage that triggers alerts',
      type: 'number',
      defaultValue: 85,
      validation: { min: 70, max: 95 },
      group: 'Alerting'
    },

    // Notification Settings
    {
      key: 'alert_email',
      label: 'Alert Email Address',
      description: 'Email address to receive system alerts',
      type: 'email',
      placeholder: 'admin@yourcompany.com',
      group: 'Notifications'
    },
    {
      key: 'alert_email_enabled',
      label: 'Enable email alerts',
      type: 'boolean',
      defaultValue: true,
      group: 'Notifications'
    },
    {
      key: 'slack_webhook_url',
      label: 'Slack Webhook URL',
      description: 'Slack webhook URL for sending alerts to Slack',
      type: 'url',
      sensitive: true,
      placeholder: 'https://hooks.slack.com/services/...',
      group: 'Notifications'
    },
    {
      key: 'slack_alerts_enabled',
      label: 'Enable Slack alerts',
      type: 'boolean',
      defaultValue: false,
      group: 'Notifications'
    },
    {
      key: 'alert_cooldown_minutes',
      label: 'Alert Cooldown (minutes)',
      description: 'Minimum time between duplicate alerts',
      type: 'number',
      defaultValue: 15,
      validation: { min: 1, max: 1440 },
      group: 'Notifications'
    },

    // Logging Configuration
    {
      key: 'log_level',
      label: 'Log Level',
      description: 'Minimum log level to record',
      type: 'select',
      defaultValue: 'info',
      options: [
        { value: 'debug', label: 'Debug (Most Verbose)' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error (Least Verbose)' }
      ],
      group: 'Logging'
    },
    {
      key: 'enable_request_logging',
      label: 'Enable HTTP request logging',
      type: 'boolean',
      defaultValue: true,
      group: 'Logging'
    },
    {
      key: 'enable_database_logging',
      label: 'Enable database query logging',
      type: 'boolean',
      defaultValue: false,
      group: 'Logging'
    },
    {
      key: 'enable_error_stack_traces',
      label: 'Include stack traces in error logs',
      type: 'boolean',
      defaultValue: true,
      group: 'Logging'
    },
    {
      key: 'log_rotation_size_mb',
      label: 'Log Rotation Size (MB)',
      description: 'Maximum size of log files before rotation',
      type: 'number',
      defaultValue: 100,
      validation: { min: 10, max: 1000 },
      group: 'Logging'
    },
    {
      key: 'log_retention_days',
      label: 'Log Retention (days)',
      description: 'Number of days to keep log files',
      type: 'number',
      defaultValue: 30,
      validation: { min: 1, max: 365 },
      group: 'Logging'
    },

    // Metrics and Analytics
    {
      key: 'metrics_enabled',
      label: 'Enable metrics collection',
      type: 'boolean',
      defaultValue: true,
      group: 'Metrics'
    },
    {
      key: 'metrics_retention_days',
      label: 'Metrics Retention (days)',
      description: 'How long to keep performance metrics',
      type: 'number',
      defaultValue: 90,
      validation: { min: 7, max: 365 },
      group: 'Metrics'
    },
    {
      key: 'enable_custom_metrics',
      label: 'Enable custom business metrics',
      description: 'Track business-specific metrics like transaction volumes',
      type: 'boolean',
      defaultValue: true,
      group: 'Metrics'
    },
    {
      key: 'metrics_aggregation_interval',
      label: 'Metrics Aggregation Interval (minutes)',
      description: 'How often to aggregate metrics data',
      type: 'number',
      defaultValue: 5,
      validation: { min: 1, max: 60 },
      group: 'Metrics'
    },

    // Performance Monitoring
    {
      key: 'enable_apm',
      label: 'Enable Application Performance Monitoring',
      type: 'boolean',
      defaultValue: true,
      group: 'Performance'
    },
    {
      key: 'apm_sample_rate',
      label: 'APM Sample Rate (%)',
      description: 'Percentage of requests to sample for performance monitoring',
      type: 'number',
      defaultValue: 10,
      validation: { min: 1, max: 100 },
      group: 'Performance'
    },
    {
      key: 'trace_slow_operations',
      label: 'Trace slow operations',
      description: 'Enable detailed tracing for operations slower than threshold',
      type: 'boolean',
      defaultValue: true,
      group: 'Performance'
    },
    {
      key: 'slow_operation_threshold',
      label: 'Slow Operation Threshold (ms)',
      description: 'Operations slower than this will be traced in detail',
      type: 'number',
      defaultValue: 1000,
      validation: { min: 100, max: 10000 },
      group: 'Performance'
    },

    // Security Monitoring
    {
      key: 'enable_security_monitoring',
      label: 'Enable security event monitoring',
      type: 'boolean',
      defaultValue: true,
      group: 'Security Monitoring'
    },
    {
      key: 'failed_login_threshold',
      label: 'Failed Login Threshold',
      description: 'Number of failed logins before alerting',
      type: 'number',
      defaultValue: 5,
      validation: { min: 3, max: 20 },
      group: 'Security Monitoring'
    },
    {
      key: 'suspicious_activity_alerts',
      label: 'Enable suspicious activity alerts',
      type: 'boolean',
      defaultValue: true,
      group: 'Security Monitoring'
    },
    {
      key: 'rate_limit_alerts',
      label: 'Enable rate limit violation alerts',
      type: 'boolean',
      defaultValue: true,
      group: 'Security Monitoring'
    }
  ];

  return (
    <ConfigurationForm
      title="Monitoring & Alerting Configuration"
      description="Configure system health monitoring, alerting thresholds, logging levels, and performance tracking for optimal system observability."
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

export default MonitoringSettings;