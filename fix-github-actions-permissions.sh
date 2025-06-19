#!/bin/bash
# Fix GitHub Actions Permission Issues
# This script resolves permission conflicts in the self-hosted runner

echo "🔧 Fixing GitHub Actions Permission Issues..."

# Change to the GitHub Actions runner work directory
WORK_DIR="/home/lab/actions-runner/_work/investra-ai/investra-ai"

if [ -d "$WORK_DIR" ]; then
    echo "📁 Found work directory: $WORK_DIR"
    
    # Fix ownership recursively (make everything owned by lab:lab)
    echo "🔐 Fixing ownership..."
    chown -R lab:lab "$WORK_DIR"
    
    # Fix permissions recursively 
    echo "📝 Fixing permissions..."
    find "$WORK_DIR" -type d -exec chmod 755 {} \;
    find "$WORK_DIR" -type f -exec chmod 644 {} \;
    
    # Make sure lab user can delete everything
    echo "🗑️ Setting delete permissions..."
    chmod -R u+rwX "$WORK_DIR"
    
    # If dist directory exists, handle it specially
    if [ -d "$WORK_DIR/dist" ]; then
        echo "🎯 Fixing dist directory specifically..."
        chown -R lab:lab "$WORK_DIR/dist"
        chmod -R 755 "$WORK_DIR/dist"
    fi
    
    echo "✅ Permission fixes applied successfully"
    
    # Show current permissions
    echo "📊 Current permissions:"
    ls -la "$WORK_DIR" | head -10
    
else
    echo "❌ Work directory not found: $WORK_DIR"
    exit 1
fi

echo "🚀 GitHub Actions should now be able to clean up properly"