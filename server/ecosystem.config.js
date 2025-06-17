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
      script: 'dist/simple-production-server.js',
      cwd: '/opt/investra/email-api',
      instances: 2, // Run 2 instances for load balancing
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
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
      env_file: '.env.production',
      
      // Cron restart (daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Instance variables for load balancing
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true,
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Process title
      treekill: true
    },
    
    {
      // Background IMAP processor (single instance)
      name: 'investra-imap-processor',
      script: 'dist/production-server.js',
      cwd: '/opt/investra/email-api',
      instances: 1, // Single instance for IMAP processing
      exec_mode: 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        PORT: 3002, // Different port for IMAP processor
        LOG_LEVEL: 'info',
        PROCESS_MODE: 'imap_only'
      },
      
      // Resource limits
      max_memory_restart: '512M',
      min_uptime: '30s',
      max_restarts: 5,
      restart_delay: 10000,
      
      // Logging
      log_file: '/var/log/investra/imap-processor-combined.log',
      out_file: '/var/log/investra/imap-processor-out.log',
      error_file: '/var/log/investra/imap-processor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      health_check_interval: 60000,
      health_check_grace_period: 5000,
      
      // Auto-restart
      autorestart: true,
      
      // Node.js options
      node_args: [
        '--max-old-space-size=1024'
      ],
      
      // Environment file
      env_file: '.env.production',
      
      // Cron restart (every 6 hours)
      cron_restart: '0 */6 * * *'
    },
    
    {
      // Monitoring service
      name: 'investra-monitor',
      script: 'dist/monitoring-service.js',
      cwd: '/opt/investra/email-api',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        PROCESS_MODE: 'monitor_only'
      },
      
      // Resource limits
      max_memory_restart: '256M',
      min_uptime: '60s',
      max_restarts: 3,
      restart_delay: 15000,
      
      // Logging
      log_file: '/var/log/investra/monitor-combined.log',
      out_file: '/var/log/investra/monitor-out.log',
      error_file: '/var/log/investra/monitor-error.log',
      
      // Auto-restart
      autorestart: true,
      
      // Environment file
      env_file: '.env.production'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'investra',
      host: ['api.investra.com'],
      ref: 'origin/main',
      repo: 'git@github.com:investra-ai/email-processing.git',
      path: '/opt/investra/email-api',
      
      // Pre-deployment commands
      'pre-deploy-local': '',
      
      // Post-deployment commands
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      
      // Pre-setup commands
      'pre-setup': 'mkdir -p /opt/investra && mkdir -p /var/log/investra',
      
      // Post-setup commands
      'post-setup': 'npm install --production && npm run build',
      
      // Environment variables
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};