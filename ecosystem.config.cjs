// PM2 Ecosystem Config — Investra Hono API Server
module.exports = {
  apps: [
    {
      name: 'investra',
      script: 'server/index.ts',
      interpreter: 'tsx',
      cwd: '/opt/investra/app',

      // Single instance — SQLite doesn't support multi-process writes
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: '/opt/investra/data/investra.db',
        CLIENT_ORIGIN: 'http://10.0.0.61',
      },

      // Restart policy
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,

      // Logging
      out_file: '/opt/investra/logs/app-out.log',
      error_file: '/opt/investra/logs/app-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
