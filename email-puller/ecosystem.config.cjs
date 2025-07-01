/**
 * PM2 Ecosystem Configuration for Investra Email Puller
 * Production-ready process management with environment variables and monitoring
 */

/* eslint-disable no-undef */
module.exports = {
  apps: [
    {
      // Email puller service
      name: 'investra-email-puller',
      script: 'dist/imap-puller.js',
      cwd: '/Users/eduardo/investra-ai/email-puller',
      interpreter: 'node',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I',
        VITE_SUPABASE_URL: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I',
        IMAP_HOST: 'imap.gmail.com',
        IMAP_PORT: '993',
        IMAP_SECURE: 'true',
        IMAP_USERNAME: 'investra.transactions@gmail.com',
        IMAP_PASSWORD: 'opzq svvv oqzx noco',
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