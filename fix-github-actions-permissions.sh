#!/bin/bash

# GitHub Actions Pre-Deployment Cleanup Script
# This script fixes permission issues that can occur during deployment

echo "🔧 Pre-deployment cleanup starting..."

# Function to fix ownership and permissions
fix_permissions() {
    local dir="$1"
    if [ -d "$dir" ]; then
        echo "📁 Fixing permissions for: $dir"
        chown -R lab:lab "$dir"
        find "$dir" -type d -exec chmod 755 {} \;
        find "$dir" -type f -exec chmod 644 {} \;
        echo "✅ Permissions fixed for: $dir"
    else
        echo "⚠️  Directory not found: $dir"
    fi
}

# Fix GitHub Actions workspace directory
WORKSPACE_DIR="/home/lab/actions-runner/_work/investra-ai/investra-ai"

if [ -d "$WORKSPACE_DIR" ]; then
    echo "🎯 Fixing GitHub Actions workspace permissions..."
    
    # Fix ownership first
    chown -R lab:lab "$WORKSPACE_DIR"
    
    # Fix specific problematic directories
    fix_permissions "$WORKSPACE_DIR/dist"
    fix_permissions "$WORKSPACE_DIR/node_modules"
    fix_permissions "$WORKSPACE_DIR/server/dist"
    fix_permissions "$WORKSPACE_DIR/server/node_modules"
    fix_permissions "$WORKSPACE_DIR/.git"
    
    # Make sure all files are writable by the lab user
    find "$WORKSPACE_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
    find "$WORKSPACE_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    
    echo "✅ GitHub Actions workspace permissions fixed"
else
    echo "ℹ️  GitHub Actions workspace not found - will be created during deployment"
fi

# Fix any PM2 related files that might have wrong ownership
PM2_DIRS=(
    "/home/lab/.pm2"
    "/opt/investra-email-server"
)

for dir in "${PM2_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "🔧 Fixing PM2 directory: $dir"
        chown -R lab:lab "$dir" 2>/dev/null || true
    fi
done

echo "🎉 Pre-deployment cleanup completed successfully!"
echo ""
echo "📋 Summary:"
echo "   ✅ GitHub Actions workspace permissions fixed"
echo "   ✅ Node.js build directories accessible"
echo "   ✅ PM2 directories properly owned"
echo "   ✅ Ready for GitHub Actions deployment"
