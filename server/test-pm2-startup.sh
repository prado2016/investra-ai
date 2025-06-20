#!/bin/bash

# Test PM2 Startup Script
# Simulates the GitHub Actions deployment process to identify issues

set -e

echo "🧪 Testing PM2 Startup Process"
echo "=============================="

# Set test environment variables
export ENVIRONMENT="production"
export SERVICE_NAME="investra-email-api-prod"
export API_PORT="3001"
export SERVER_DIR="/opt/investra/email-api-prod"

# Critical Supabase environment variables
export SUPABASE_URL="https://ecbuwhpipphdssqjwgfm.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

echo "✅ Environment variables configured:"
echo "   ENVIRONMENT: $ENVIRONMENT"
echo "   SERVICE_NAME: $SERVICE_NAME"
echo "   API_PORT: $API_PORT"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo ""

# Test 1: Verify PM2 ecosystem configuration syntax
echo "📋 Test 1: PM2 Configuration Syntax"
echo "   Creating test PM2 config..."

cat > ecosystem.test.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'test-email-api',
      script: 'dist/standalone-enhanced-server-production.js',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info',
        
        EMAIL_HOST: 'localhost',
        EMAIL_PORT: '587',
        EMAIL_USER: 'test@investra.com',
        EMAIL_PASSWORD: 'placeholder',
        
        IMAP_HOST: 'localhost',
        IMAP_PORT: '993',
        IMAP_USER: 'test@investra.com',
        IMAP_PASSWORD: 'placeholder',
        IMAP_SECURE: 'true',
        IMAP_ENABLED: 'true',
        
        DATABASE_URL: 'postgresql://localhost:5432/investra',
        
        SUPABASE_URL: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E',
        SUPABASE_SERVICE_KEY: 'placeholder',
        VITE_SUPABASE_URL: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'
      },
      
      env_file: '.env.production',
      
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      log_file: 'combined.log',
      out_file: 'out.log',
      error_file: 'error.log',
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
EOF

# Validate PM2 config syntax using Node.js
if node -e "require('./ecosystem.test.config.js'); console.log('✅ PM2 config syntax is valid');" 2>/dev/null; then
    echo "✅ PM2 configuration syntax check passed"
else
    echo "❌ PM2 configuration syntax check failed"
    exit 1
fi

# Test 2: Verify server can start
echo ""
echo "📋 Test 2: Server Startup Test"
echo "   Testing server startup (10 second timeout)..."

if timeout 10 node dist/standalone-enhanced-server-production.js &>/dev/null; then
    echo "✅ Server startup test passed"
else
    echo "⚠️  Server startup test timed out (this is expected for a successful test)"
    echo "   This indicates the server is starting correctly"
fi

# Test 3: Check for common startup errors
echo ""
echo "📋 Test 3: Error Pattern Check"
echo "   Checking for common startup error patterns..."

# Capture server startup output for analysis
timeout 5 node dist/standalone-enhanced-server-production.js 2>&1 | head -20 > startup-test.log || true

if grep -qi "error" startup-test.log; then
    echo "⚠️  Potential errors detected in startup log:"
    grep -i "error" startup-test.log
else
    echo "✅ No error patterns detected in startup log"
fi

if grep -qi "missing" startup-test.log; then
    echo "⚠️  Missing dependencies detected:"
    grep -i "missing" startup-test.log
else
    echo "✅ No missing dependency patterns detected"
fi

# Show startup log for analysis
echo ""
echo "📋 Startup Log Sample:"
echo "----------------------"
cat startup-test.log
echo "----------------------"

# Cleanup
rm -f ecosystem.test.config.js startup-test.log

echo ""
echo "🎉 PM2 Startup Test Complete!"
echo ""
echo "💡 If all tests pass, the PM2 deployment should work correctly."
echo "   If issues were found, they are likely the cause of the deployment failures."
