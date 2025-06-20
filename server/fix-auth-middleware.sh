#!/bin/bash

# Fix Authentication Middleware Deployment Issues
# Ensures authentication middleware is properly built and deployed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[AUTH-FIX]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AUTH-FIX] WARNING:${NC} $1"; }
log_error() { echo -e "${RED}[AUTH-FIX] ERROR:${NC} $1"; }

# Check if TypeScript source exists
check_auth_source() {
    log "🔍 Checking authentication middleware source..."
    
    if [ ! -f "$SCRIPT_DIR/middleware/authMiddleware.ts" ]; then
        log_error "Authentication middleware source not found: middleware/authMiddleware.ts"
        return 1
    fi
    
    log "✅ Authentication middleware source found"
    return 0
}

# Build authentication middleware
build_auth_middleware() {
    log "🔨 Building authentication middleware..."
    
    cd "$SCRIPT_DIR"
    
    # Ensure TypeScript is available
    if ! command -v tsc &> /dev/null; then
        if [ -f "node_modules/.bin/tsc" ]; then
            TSC_CMD="./node_modules/.bin/tsc"
        else
            log_error "TypeScript compiler not found"
            return 1
        fi
    else
        TSC_CMD="tsc"
    fi
    
    # Build the middleware specifically
    $TSC_CMD middleware/authMiddleware.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --strict --skipLibCheck
    
    if [ -f "dist/middleware/authMiddleware.js" ]; then
        # Copy to root of dist for easier access
        cp "dist/middleware/authMiddleware.js" "dist/authMiddleware.js"
        log "✅ Authentication middleware built and copied to dist/authMiddleware.js"
    elif [ -f "dist/authMiddleware.js" ]; then
        log "✅ Authentication middleware built at dist/authMiddleware.js"
    else
        log_error "Failed to build authentication middleware"
        return 1
    fi
    
    return 0
}

# Verify middleware can be loaded
verify_auth_middleware() {
    log "🔍 Verifying authentication middleware..."
    
    cd "$SCRIPT_DIR"
    
    # Test loading the middleware
    node -e "
        try {
            const auth = require('./dist/authMiddleware');
            if (auth.authenticateUser && typeof auth.authenticateUser === 'function') {
                console.log('✅ authenticateUser function found');
            } else {
                console.error('❌ authenticateUser function not found');
                process.exit(1);
            }
            
            if (auth.optionalAuth && typeof auth.optionalAuth === 'function') {
                console.log('✅ optionalAuth function found');
            } else {
                console.error('❌ optionalAuth function not found');
                process.exit(1);
            }
            
            console.log('✅ Authentication middleware verification passed');
        } catch (error) {
            console.error('❌ Failed to load authentication middleware:', error.message);
            process.exit(1);
        }
    "
    
    if [ $? -eq 0 ]; then
        log "✅ Authentication middleware verification passed"
        return 0
    else
        log_error "Authentication middleware verification failed"
        return 1
    fi
}

# Fix deployment structure
fix_deployment_structure() {
    log "🔧 Fixing deployment structure..."
    
    cd "$SCRIPT_DIR"
    
    # Ensure dist directory exists
    mkdir -p dist
    
    # If middleware directory exists in dist, copy files to root level
    if [ -d "dist/middleware" ]; then
        cp dist/middleware/*.js dist/ 2>/dev/null || true
        log "✅ Copied middleware files to dist root"
    fi
    
    # Create a middleware directory in dist if it doesn't exist
    mkdir -p dist/middleware
    
    # Copy authMiddleware.js to middleware directory if it exists in root
    if [ -f "dist/authMiddleware.js" ]; then
        cp "dist/authMiddleware.js" "dist/middleware/authMiddleware.js"
        log "✅ Copied authMiddleware.js to middleware directory"
    fi
    
    log "✅ Deployment structure fixed"
}

# Test authentication with sample environment
test_auth_functionality() {
    log "🧪 Testing authentication functionality..."
    
    cd "$SCRIPT_DIR"
    
    # Create a simple test script
    cat > test-auth.js << 'EOF'
const express = require('express');

// Test loading authentication middleware
try {
    const auth = require('./dist/authMiddleware');
    console.log('✅ Authentication middleware loaded successfully');
    
    // Test creating Express app with middleware
    const app = express();
    app.use(express.json());
    
    // Test endpoint with authentication
    app.get('/test-auth', auth.authenticateUser, (req, res) => {
        res.json({ success: true, message: 'Authentication working' });
    });
    
    // Test endpoint with optional authentication
    app.get('/test-optional', auth.optionalAuth, (req, res) => {
        res.json({ success: true, message: 'Optional auth working' });
    });
    
    console.log('✅ Authentication middleware integration test passed');
    
} catch (error) {
    console.error('❌ Authentication middleware test failed:', error.message);
    process.exit(1);
}
EOF
    
    # Run the test
    if node test-auth.js; then
        log "✅ Authentication functionality test passed"
        rm -f test-auth.js
        return 0
    else
        log_error "Authentication functionality test failed"
        rm -f test-auth.js
        return 1
    fi
}

# Show authentication status
show_auth_status() {
    log "📊 Authentication Middleware Status:"
    echo ""
    
    # Check source file
    if [ -f "$SCRIPT_DIR/middleware/authMiddleware.ts" ]; then
        echo "  ✅ Source file: middleware/authMiddleware.ts"
    else
        echo "  ❌ Source file: middleware/authMiddleware.ts (MISSING)"
    fi
    
    # Check built files
    if [ -f "$SCRIPT_DIR/dist/authMiddleware.js" ]; then
        echo "  ✅ Built file: dist/authMiddleware.js"
    else
        echo "  ❌ Built file: dist/authMiddleware.js (MISSING)"
    fi
    
    if [ -f "$SCRIPT_DIR/dist/middleware/authMiddleware.js" ]; then
        echo "  ✅ Built file: dist/middleware/authMiddleware.js"
    else
        echo "  ❌ Built file: dist/middleware/authMiddleware.js (MISSING)"
    fi
    
    # Check environment variables
    echo ""
    echo "  Environment Variables:"
    if [ -n "$SUPABASE_URL" ]; then
        echo "    ✅ SUPABASE_URL: ${SUPABASE_URL}"
    else
        echo "    ❌ SUPABASE_URL: (NOT SET)"
    fi
    
    if [ -n "$SUPABASE_ANON_KEY" ]; then
        echo "    ✅ SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}... (truncated)"
    else
        echo "    ❌ SUPABASE_ANON_KEY: (NOT SET)"
    fi
    
    echo ""
}

# Main fix function
fix_auth() {
    log "🚀 Starting authentication middleware fix..."
    
    if ! check_auth_source; then
        log_error "Cannot proceed without authentication middleware source"
        exit 1
    fi
    
    if ! build_auth_middleware; then
        log_error "Failed to build authentication middleware"
        exit 1
    fi
    
    fix_deployment_structure
    
    if ! verify_auth_middleware; then
        log_error "Authentication middleware verification failed"
        exit 1
    fi
    
    if ! test_auth_functionality; then
        log_error "Authentication functionality test failed"
        exit 1
    fi
    
    log "🎉 Authentication middleware fix completed successfully!"
}

# Usage
usage() {
    echo "Usage: $0 [fix|status|test]"
    echo ""
    echo "Commands:"
    echo "  fix     Fix authentication middleware issues"
    echo "  status  Show authentication middleware status"
    echo "  test    Test authentication middleware functionality"
}

# Parse command
COMMAND="${1:-fix}"

case "$COMMAND" in
    fix)
        fix_auth
        ;;
    status)
        show_auth_status
        ;;
    test)
        if check_auth_source && verify_auth_middleware; then
            test_auth_functionality
        else
            log_error "Authentication middleware not ready for testing"
            exit 1
        fi
        ;;
    *)
        usage
        exit 1
        ;;
esac
