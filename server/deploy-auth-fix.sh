#!/bin/bash
echo "🚀 DEPLOYING IMMEDIATE AUTH FIX"
echo "==============================="

# Backup original
cp standalone-enhanced-server-production.ts standalone-enhanced-server-production.ts.backup

# Apply fix
cp standalone-enhanced-server-production-simple-fix.ts standalone-enhanced-server-production.ts

# Restart server
echo "Killing existing server..."
pkill -f "standalone-enhanced-server-production"

echo "Starting fixed server..."
npx ts-node standalone-enhanced-server-production.ts &

echo "✅ Server restarted with auth fix"
echo "🧪 Test the manual sync button now!"
