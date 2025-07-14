#!/bin/bash

# Script to archive existing emails that are already in the database but still in Gmail INBOX

echo "🚀 Starting email archiving process..."
echo "This will move emails from Gmail INBOX to archive folder"

# Check if we're in the right directory
if [ ! -f "email-collector/package.json" ]; then
    echo "❌ Error: Run this script from the root directory of the project"
    exit 1
fi

# Change to email-collector directory
cd email-collector

# Check if .env file exists
if [ ! -f "../.env" ] && [ ! -f "../.env.local" ]; then
    echo "❌ Error: No .env file found. Please create .env or .env.local with Supabase credentials"
    echo "Required variables:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Run the archiving script
echo "📁 Running email archiving..."
npm run archive-existing

if [ $? -eq 0 ]; then
    echo "✅ Email archiving completed successfully!"
    echo "📧 Emails have been moved to archive folder in Gmail"
    echo "🔄 You can now refresh your email management page"
else
    echo "❌ Email archiving failed"
    exit 1
fi