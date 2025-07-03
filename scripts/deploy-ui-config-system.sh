#!/bin/bash

echo "🎨 UI Configuration System Deployment"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Set up database system_config table${NC}"
echo "You need to run this SQL in your Supabase Dashboard → SQL Editor:"
echo ""
echo "=== Copy this SQL to Supabase SQL Editor ==="
cat sql-migrations/create-system-config.sql
echo ""
echo "============================================="
echo ""

echo -e "${YELLOW}Step 2: Fix current email-puller service${NC}"
echo "Run this to fix the immediate email-puller issue:"
echo ""
echo "1. SSH to your server:"
echo "   ssh lab@10.0.0.89"
echo ""
echo "2. Update email-puller .env file:"
echo '   sudo tee /opt/investra/email-puller/.env > /dev/null << '"'"'EOF'"'"
echo "   SUPABASE_URL=https://ecbuwhpipphdssqjwgfm.supabase.co"
echo "   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E"
echo "   EOF"
echo ""
echo "3. Restart email-puller service:"
echo "   pm2 restart investra-email-puller"
echo "   pm2 logs investra-email-puller"
echo ""

echo -e "${YELLOW}Step 3: Test the new UI configuration system${NC}"
echo ""
echo "✅ What you can now do:"
echo "  1. Go to Settings → Email-Puller System in your web app"
echo "  2. Configure all email-puller settings through the UI"
echo "  3. Changes save directly to database"
echo "  4. Email-puller picks up changes immediately"
echo ""

echo -e "${YELLOW}Step 4: Build and deploy updated frontend${NC}"
echo "Run these commands to deploy the new UI:"
echo ""
echo "npm run build"
echo "# Then deploy the built files to your server"
echo ""

echo -e "${GREEN}🎯 Benefits of this system:${NC}"
echo "  ✅ No more environment variable issues"
echo "  ✅ Configure email-puller through web UI"
echo "  ✅ Database-driven configuration"
echo "  ✅ Real-time setting updates"
echo "  ✅ Your database-driven sync will work consistently"
echo ""

echo -e "${GREEN}🔧 After deployment:${NC}"
echo "  • Email-puller will start working immediately"
echo "  • Your 4 new Gmail emails will be synced"
echo "  • Manual sync button will work reliably"
echo "  • All settings configurable through Settings page"
echo ""

echo "💡 Remember: Run the SQL migration in Supabase first, then fix the server .env!"