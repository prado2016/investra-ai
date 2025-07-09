/**
 * PM2 Ecosystem Configuration for Investra Email Collector
 * Production-ready process management with environment variables and monitoring
 */

/* eslint-disable no-undef */
module.exports = {
  apps: [
    {
      // Email collector service
      name: 'investra-email-collector',
      script: 'dist/imap-puller-db-config.js',
      cwd: process.env.EMAIL_COLLECTOR_DIR || '/opt/investra/email-collector',
      interpreter: 'node',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        SUPABASE_URL: process.env.SUPABASE_URL || 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'SET_IN_PRODUCTION',
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'SET_IN_PRODUCTION',
        IMAP_HOST: 'imap.gmail.com',
        IMAP_PORT: '993',
        IMAP_SECURE: 'true',
        IMAP_USERNAME: process.env.IMAP_USERNAME || 'SET_IN_PRODUCTION',
        IMAP_PASSWORD: process.env.IMAP_PASSWORD || 'SET_IN_PRODUCTION',
        SYNC_INTERVAL_MINUTES: '30',
        MAX_EMAILS_PER_SYNC: '50',
        ENABLE_LOGGING: 'true',
        LOG_LEVEL: 'info',
        RUN_ONCE: 'false',
        ENABLE_SCHEDULER: 'true'
      },
      
      // Resource limits and monitoring
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,
      
      // Logging configuration
      log_file: 'combined.log',
      out_file: 'out.log',
      error_file: 'error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart conditions
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Health monitoring
      autorestart: true,
      
      // Process lifecycle
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=1024'
      ],
      
      // Graceful shutdown
      shutdown_with_message: true,
      treekill: true
    }
  ]
};