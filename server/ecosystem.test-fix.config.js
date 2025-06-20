
module.exports = {
  apps: [
    {
      name: 'test-email-api-fixed',
      script: 'dist/standalone-enhanced-server-production.js',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info',
        WS_ENABLED: 'false', // Disable WebSocket for stability
        
        // Required Supabase environment variables
        SUPABASE_URL: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E',
        VITE_SUPABASE_URL: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'
      },
      
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};
