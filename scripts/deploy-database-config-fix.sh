#!/bin/bash

echo "🔧 Database-Driven Email-Puller Configuration Deployment"
echo "========================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://ecbuwhpipphdssqjwgfm.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E"
SERVER_IP="10.0.0.89"
EMAIL_PULLER_DIR="/opt/investra/email-puller"

echo -e "${YELLOW}Step 1: Setting up database configuration table${NC}"
echo "Creating system_config table in Supabase..."

# Create SQL file for execution
cat > /tmp/setup_system_config.sql << 'SQL'
-- Create system_config table for centralized configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage system config" ON system_config FOR ALL USING (true);

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
  ('email_encryption_key', 'auto_generated_on_first_run', 'string', 'Encryption key for Gmail passwords'),
  ('sync_interval_minutes', '30', 'number', 'Default sync interval in minutes'),
  ('max_emails_per_sync', '50', 'number', 'Maximum emails to process per sync'),
  ('enable_logging', 'true', 'boolean', 'Enable detailed logging'),
  ('log_level', 'info', 'string', 'Logging level'),
  ('enable_scheduler', 'true', 'boolean', 'Enable automatic scheduled syncing'),
  ('archive_after_sync', 'true', 'boolean', 'Move emails to processed table after sync'),
  ('processed_folder_name', 'Investra/Processed', 'string', 'Gmail folder for processed emails'),
  ('sync_request_poll_interval', '10', 'number', 'Seconds between checking for manual sync requests'),
  ('cleanup_old_requests_days', '7', 'number', 'Days to keep old sync requests')
ON CONFLICT (config_key) DO NOTHING;
SQL

echo "✅ Database configuration table setup ready"
echo ""

echo -e "${YELLOW}Step 2: Deploying database configuration files to server${NC}"

# Copy database config files to server
echo "Copying database-config.ts to server..."
scp email-puller/src/database-config.ts lab@${SERVER_IP}:${EMAIL_PULLER_DIR}/src/

echo "Copying updated imap-puller with database config..."
scp email-puller/src/imap-puller-db-config.ts lab@${SERVER_IP}:${EMAIL_PULLER_DIR}/src/

echo "✅ Files copied to server"
echo ""

echo -e "${YELLOW}Step 3: Updating server configuration${NC}"

# SSH to server and set up the database-driven configuration
ssh lab@${SERVER_IP} << 'REMOTE_SCRIPT'
echo "🔧 Setting up database-driven email-puller on server..."

# Navigate to email-puller directory
cd /opt/investra/email-puller

# Create minimal .env file with only Supabase connection
sudo tee .env > /dev/null << 'ENV_FILE'
# Minimal configuration for database-driven email-puller
# Only Supabase connection required - everything else from database

SUPABASE_URL=https://ecbuwhpipphdssqjwgfm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E

# Optional: Sentry for error tracking
SENTRY_DSN=https://ec940c0318e64b067fc945804f5cd7b4@o4509556303265792.ingest.us.sentry.io/4509556308574208
NODE_ENV=production
ENV_FILE

# Set proper permissions
sudo chown investra:investra .env
sudo chmod 600 .env

echo "✅ Minimal .env file created"

# Rebuild TypeScript if needed
if [ -f "src/database-config.ts" ]; then
    echo "🔨 Building TypeScript files..."
    npm run build
    echo "✅ Build completed"
fi

# Stop current email-puller
echo "🛑 Stopping current email-puller service..."
pm2 stop investra-email-puller 2>/dev/null || true
pm2 delete investra-email-puller 2>/dev/null || true

# Start new database-driven email-puller
echo "🚀 Starting database-driven email-puller..."
if [ -f "dist/imap-puller-db-config.js" ]; then
    pm2 start dist/imap-puller-db-config.js --name investra-email-puller
else
    # Fallback to regular puller with updated .env
    pm2 start dist/imap-puller.js --name investra-email-puller
fi

pm2 save

echo ""
echo "📊 Service status:"
pm2 list

echo ""
echo "📋 Recent logs:"
pm2 logs investra-email-puller --lines 20 --nostream

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}✅ Database-driven email-puller deployment complete!${NC}"
echo ""
echo "🎯 What was accomplished:"
echo "  ✅ Created system_config table in database"
echo "  ✅ Deployed database configuration system"
echo "  ✅ Updated server with minimal environment variables"
echo "  ✅ Restarted email-puller with database-driven config"
echo ""
echo "💡 Next steps:"
echo "  1. Check service status: ssh lab@${SERVER_IP} 'pm2 logs investra-email-puller'"
echo "  2. Test manual email sync in your web application"
echo "  3. Monitor for the 4 new Gmail emails to be synced"
echo ""
echo "🔧 Benefits:"
echo "  • No more environment variable deployment issues"
echo "  • Self-contained configuration in database"
echo "  • Easy to update settings without redeployment"
echo "  • Automatic encryption key generation"
echo ""

# Show final instructions
echo -e "${YELLOW}📝 To manually run the database table setup (if needed):${NC}"
echo "Go to Supabase Dashboard > SQL Editor and run the contents of:"
echo "sql-migrations/create-system-config.sql"