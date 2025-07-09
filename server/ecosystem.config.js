/**
 * PM2 Ecosystem Configuration for Investra Email API
 * Task 13.3: Set up Process Management
 * Production-ready process management with monitoring and clustering
 */

module.exports = {
  apps: [
    {
      // Main production application
      name: 'investra-email-api',
      script: 'dist/email-server.js',
      cwd: process.env.SERVER_DIR || '/opt/investra/email-api',
      instances: process.env.PM2_INSTANCES || 2, // Run 2 instances for load balancing
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: process.env.ENVIRONMENT || 'production',
        PORT: process.env.API_PORT || 3001,
        LOG_LEVEL: 'info'
      },
      
      // Resource limits and monitoring
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Logging configuration
      log_file: '/var/log/investra/email-api-combined.log',
      out_file: '/var/log/investra/email-api-out.log',
      error_file: '/var/log/investra/email-api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart conditions
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Health monitoring
      health_check_interval: 30000,
      health_check_grace_period: 3000,
      
      // Process lifecycle
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Advanced PM2 features
      autorestart: true,
      vizion: false, // Disable versioning in production
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=2048',
        '--enable-source-maps'
      ],
      
      // Environment file
      env_file: process.env.ENV_FILE || '.env.production',
      
      // Process lifecycle
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Advanced PM2 features
      autorestart: true,
      vizion: false, // Disable versioning in production
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=2048',
        '--enable-source-maps'
      ],
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Process title
      treekill: true
    }
  ]
};