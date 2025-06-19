module.exports = {
  apps: [
    {
      name: 'investra-email-api',
      script: 'dist/standalone-enhanced-server-production.js',
      cwd: '/opt/investra/email-api',
      instances: 1,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'info'
      },
      
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      log_file: '/var/log/investra/investra-email-api-combined.log',
      out_file: '/var/log/investra/investra-email-api-out.log',
      error_file: '/var/log/investra/investra-email-api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};
