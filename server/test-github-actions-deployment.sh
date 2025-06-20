#!/bin/bash

# Quick PM2 Production Server Startup Test
# This script tests the same environment variable configuration used by GitHub Actions

set -e

echo "🧪 Testing PM2 Production Server Startup"
echo "========================================"

# Set the same environment variables that the deployment script expects
export ENVIRONMENT="production"
export SERVICE_NAME="investra-email-api-prod"
export API_PORT="3001"
export SERVER_DIR="/opt/investra/email-api-prod"

# Critical Supabase environment variables (same as GitHub secrets)
export SUPABASE_URL="https://ecbuwhpipphdssqjwgfm.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNycWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

# Email configuration defaults
export EMAIL_HOST="localhost"
export EMAIL_PORT="587"
export EMAIL_USER="test@investra.com"
export EMAIL_PASSWORD="placeholder"

# IMAP configuration defaults
export IMAP_HOST="localhost"
export IMAP_PORT="993"
export IMAP_USER="test@investra.com"
export IMAP_PASSWORD="placeholder"
export IMAP_SECURE="true"
export IMAP_ENABLED="true"

# Database configuration
export DATABASE_URL="postgresql://localhost:5432/investra"
export SUPABASE_SERVICE_KEY="placeholder"

# Logging
export LOG_LEVEL="info"

echo "✅ Environment variables configured:"
echo "   ENVIRONMENT: $ENVIRONMENT"
echo "   SERVICE_NAME: $SERVICE_NAME"
echo "   API_PORT: $API_PORT"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}... (truncated)"
echo ""

# Test the deployment script
echo "🚀 Running deployment script..."
cd "$(dirname "$0")"

if [ -f "deploy-api-server.sh" ]; then
    ./deploy-api-server.sh deploy
    echo ""
    echo "✅ Deployment script completed successfully!"
    echo ""
    echo "🔍 Testing API endpoint..."
    sleep 5
    
    # Test the original failing endpoint
    if curl -f "http://localhost:3001/api/manual-review/stats" 2>/dev/null; then
        echo "✅ API endpoint responding"
    else
        echo "⚠️  API endpoint may require authentication (this is expected)"
        echo "🔍 Testing with curl to see the actual response:"
        curl -X GET "http://localhost:3001/api/manual-review/stats" -H "Content-Type: application/json" 2>&1 || true
    fi
    
    echo ""
    echo "🎯 GitHub Actions deployment simulation complete!"
else
    echo "❌ deploy-api-server.sh not found in current directory"
    echo "📁 Current directory: $(pwd)"
    echo "📁 Files available: $(ls -la)"
    exit 1
fi
