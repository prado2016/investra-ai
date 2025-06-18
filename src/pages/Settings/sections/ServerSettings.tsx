/**
 * Server Settings Section
 * Configuration for API settings and server configuration
 */

import React from 'react';
import ConfigurationForm, { ConfigurationField } from '../components/ConfigurationForm';
import { useConfigurationSection } from '../hooks/useConfigurationSection';

const ServerSettings: React.FC = () => {
  const {
    values,
    errors,
    loading,
    testResult,
    updateValue,
    saveConfiguration,
    testConfiguration
  } = useConfigurationSection('api');

  const fields: ConfigurationField[] = [
    // Server Configuration
    {
      key: 'server_port',
      label: 'Server Port',
      description: 'Port number for the API server',
      type: 'number',
      defaultValue: 3001,
      validation: { min: 1000, max: 65535 },
      group: 'Server Configuration'
    },
    {
      key: 'server_host',
      label: 'Server Host',
      description: 'Host address to bind the server to',
      type: 'string',
      defaultValue: '0.0.0.0',
      placeholder: '0.0.0.0',
      group: 'Server Configuration'
    },
    {
      key: 'api_base_url',
      label: 'API Base URL',
      description: 'Base URL for API endpoints (leave empty for auto-detection)',
      type: 'url',
      placeholder: 'https://api.yourcompany.com',
      group: 'Server Configuration'
    },
    {
      key: 'server_environment',
      label: 'Server Environment',
      description: 'Current server environment',
      type: 'select',
      defaultValue: 'production',
      options: [
        { value: 'development', label: 'Development' },
        { value: 'staging', label: 'Staging' },
        { value: 'production', label: 'Production' }
      ],
      group: 'Server Configuration'
    },
    {
      key: 'enable_cluster_mode',
      label: 'Enable cluster mode',
      description: 'Run multiple server instances for better performance',
      type: 'boolean',
      defaultValue: false,
      group: 'Server Configuration'
    },
    {
      key: 'cluster_workers',
      label: 'Cluster Workers',
      description: 'Number of worker processes (0 = auto-detect CPU cores)',
      type: 'number',
      defaultValue: 0,
      validation: { min: 0, max: 32 },
      group: 'Server Configuration'
    },

    // API Configuration
    {
      key: 'api_version',
      label: 'API Version',
      description: 'Current API version',
      type: 'select',
      defaultValue: 'v1',
      options: [
        { value: 'v1', label: 'Version 1' },
        { value: 'v2', label: 'Version 2 (Beta)' }
      ],
      group: 'API Settings'
    },
    {
      key: 'enable_api_docs',
      label: 'Enable API documentation endpoint',
      description: 'Serve OpenAPI/Swagger documentation at /docs',
      type: 'boolean',
      defaultValue: true,
      group: 'API Settings'
    },
    {
      key: 'api_request_timeout',
      label: 'API Request Timeout (ms)',
      description: 'Global timeout for API requests',
      type: 'number',
      defaultValue: 30000,
      validation: { min: 5000, max: 120000 },
      group: 'API Settings'
    },
    {
      key: 'max_request_size_mb',
      label: 'Maximum Request Size (MB)',
      description: 'Maximum size for incoming requests',
      type: 'number',
      defaultValue: 50,
      validation: { min: 1, max: 1000 },
      group: 'API Settings'
    },
    {
      key: 'enable_request_compression',
      label: 'Enable request compression',
      description: 'Compress API responses to reduce bandwidth',
      type: 'boolean',
      defaultValue: true,
      group: 'API Settings'
    },

    // Rate Limiting
    {
      key: 'rate_limit_requests_per_minute',
      label: 'Rate Limit (requests/minute)',
      description: 'Maximum requests per minute per IP address',
      type: 'number',
      defaultValue: 100,
      validation: { min: 10, max: 1000 },
      group: 'Rate Limiting'
    },
    {
      key: 'rate_limit_burst_size',
      label: 'Rate Limit Burst Size',
      description: 'Burst allowance for rate limiting',
      type: 'number',
      defaultValue: 20,
      validation: { min: 5, max: 200 },
      group: 'Rate Limiting'
    },
    {
      key: 'rate_limit_window_minutes',
      label: 'Rate Limit Window (minutes)',
      description: 'Time window for rate limit calculations',
      type: 'number',
      defaultValue: 1,
      validation: { min: 1, max: 60 },
      group: 'Rate Limiting'
    },
    {
      key: 'rate_limit_skip_successful_requests',
      label: 'Skip successful requests in rate limiting',
      description: 'Only count failed requests toward rate limits',
      type: 'boolean',
      defaultValue: false,
      group: 'Rate Limiting'
    },
    {
      key: 'rate_limit_whitelist_ips',
      label: 'Rate Limit Whitelist IPs',
      description: 'Comma-separated list of IP addresses exempt from rate limiting',
      type: 'textarea',
      placeholder: '192.168.1.1, 10.0.0.1',
      group: 'Rate Limiting'
    },

    // CORS Configuration
    {
      key: 'cors_enabled',
      label: 'Enable CORS',
      description: 'Enable Cross-Origin Resource Sharing',
      type: 'boolean',
      defaultValue: true,
      group: 'CORS Settings'
    },
    {
      key: 'cors_origins',
      label: 'Allowed Origins',
      description: 'Comma-separated list of allowed origins (* for all)',
      type: 'textarea',
      defaultValue: 'http://localhost:5173, https://app.yourcompany.com',
      placeholder: 'https://app.yourcompany.com, https://yourcompany.com',
      group: 'CORS Settings'
    },
    {
      key: 'cors_methods',
      label: 'Allowed Methods',
      description: 'Comma-separated list of allowed HTTP methods',
      type: 'string',
      defaultValue: 'GET, POST, PUT, DELETE, OPTIONS',
      group: 'CORS Settings'
    },
    {
      key: 'cors_headers',
      label: 'Allowed Headers',
      description: 'Comma-separated list of allowed headers',
      type: 'textarea',
      defaultValue: 'Content-Type, Authorization, Accept, X-Requested-With',
      group: 'CORS Settings'
    },
    {
      key: 'cors_credentials',
      label: 'Allow credentials',
      description: 'Allow cookies and authentication headers in CORS requests',
      type: 'boolean',
      defaultValue: true,
      group: 'CORS Settings'
    },
    {
      key: 'cors_max_age',
      label: 'CORS Max Age (seconds)',
      description: 'How long browsers can cache CORS preflight responses',
      type: 'number',
      defaultValue: 86400,
      validation: { min: 0, max: 86400 },
      group: 'CORS Settings'
    },

    // Performance Settings
    {
      key: 'enable_http2',
      label: 'Enable HTTP/2',
      description: 'Use HTTP/2 for better performance',
      type: 'boolean',
      defaultValue: false,
      group: 'Performance'
    },
    {
      key: 'enable_gzip_compression',
      label: 'Enable Gzip compression',
      description: 'Compress responses with Gzip',
      type: 'boolean',
      defaultValue: true,
      group: 'Performance'
    },
    {
      key: 'gzip_compression_level',
      label: 'Gzip Compression Level',
      description: 'Compression level (1=fastest, 9=best compression)',
      type: 'number',
      defaultValue: 6,
      validation: { min: 1, max: 9 },
      group: 'Performance'
    },
    {
      key: 'enable_etag',
      label: 'Enable ETag headers',
      description: 'Add ETag headers for caching',
      type: 'boolean',
      defaultValue: true,
      group: 'Performance'
    },
    {
      key: 'static_file_max_age',
      label: 'Static File Max Age (seconds)',
      description: 'Cache duration for static files',
      type: 'number',
      defaultValue: 3600,
      validation: { min: 0, max: 31536000 },
      group: 'Performance'
    },

    // SSL/TLS Configuration
    {
      key: 'ssl_enabled',
      label: 'Enable SSL/TLS',
      description: 'Enable HTTPS with SSL/TLS encryption',
      type: 'boolean',
      defaultValue: false,
      group: 'SSL/TLS'
    },
    {
      key: 'ssl_cert_path',
      label: 'SSL Certificate Path',
      description: 'Path to SSL certificate file',
      type: 'string',
      placeholder: '/path/to/certificate.crt',
      group: 'SSL/TLS'
    },
    {
      key: 'ssl_key_path',
      label: 'SSL Private Key Path',
      description: 'Path to SSL private key file',
      type: 'string',
      placeholder: '/path/to/private.key',
      sensitive: true,
      group: 'SSL/TLS'
    },
    {
      key: 'ssl_ca_path',
      label: 'SSL CA Certificate Path',
      description: 'Path to SSL CA certificate file (optional)',
      type: 'string',
      placeholder: '/path/to/ca-certificate.crt',
      group: 'SSL/TLS'
    },
    {
      key: 'ssl_protocols',
      label: 'Allowed SSL/TLS Protocols',
      description: 'Comma-separated list of allowed protocols',
      type: 'string',
      defaultValue: 'TLSv1.2, TLSv1.3',
      group: 'SSL/TLS'
    },

    // Monitoring and Health
    {
      key: 'enable_health_endpoint',
      label: 'Enable health check endpoint',
      description: 'Serve health status at /health',
      type: 'boolean',
      defaultValue: true,
      group: 'Monitoring'
    },
    {
      key: 'enable_metrics_endpoint',
      label: 'Enable metrics endpoint',
      description: 'Serve Prometheus metrics at /metrics',
      type: 'boolean',
      defaultValue: true,
      group: 'Monitoring'
    },
    {
      key: 'enable_request_logging',
      label: 'Enable request logging',
      description: 'Log all HTTP requests',
      type: 'boolean',
      defaultValue: true,
      group: 'Monitoring'
    },
    {
      key: 'request_id_header',
      label: 'Request ID Header Name',
      description: 'Header name for request ID tracking',
      type: 'string',
      defaultValue: 'X-Request-ID',
      group: 'Monitoring'
    },

    // Development Settings
    {
      key: 'enable_hot_reload',
      label: 'Enable hot reload (development only)',
      description: 'Automatically restart server on code changes',
      type: 'boolean',
      defaultValue: false,
      group: 'Development'
    },
    {
      key: 'enable_debug_mode',
      label: 'Enable debug mode',
      description: 'Enable detailed error messages and debug logging',
      type: 'boolean',
      defaultValue: false,
      group: 'Development'
    },
    {
      key: 'enable_profiling',
      label: 'Enable performance profiling',
      description: 'Enable CPU and memory profiling endpoints',
      type: 'boolean',
      defaultValue: false,
      group: 'Development'
    },
    {
      key: 'trust_proxy',
      label: 'Trust proxy headers',
      description: 'Trust X-Forwarded-* headers from reverse proxies',
      type: 'boolean',
      defaultValue: false,
      group: 'Development'
    }
  ];

  return (
    <ConfigurationForm
      title="Server & API Configuration"
      description="Configure server settings, API parameters, rate limiting, CORS policies, and performance optimizations for the enhanced email processing server."
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

export default ServerSettings;