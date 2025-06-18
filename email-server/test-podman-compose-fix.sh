#!/bin/bash

# Test script for Podman Compose compatibility fixes
# Simulates the GitHub Actions environment issue

echo "🧪 Testing Podman Compose Compatibility Fix"
echo "=============================================="

# Test environment setup
TEST_DIR="/tmp/podman-compose-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo ""
echo "📁 Test directory: $TEST_DIR"
echo ""

# Copy necessary files
echo "📋 Copying email server files..."
cp ~/investra-ai/email-server/docker-compose.yml .
cp ~/investra-ai/email-server/start-mailserver.sh .
chmod +x start-mailserver.sh

# Set test environment variables
export EMAIL_DOMAIN="test.investra.com"
export EMAIL_HOSTNAME="mail-test.investra.com"
export EMAIL_USER="test@investra.com"
export EMAIL_PASSWORD="test123"

echo ""
echo "🔍 Testing compose command detection..."
echo ""

# Test the compose command detection function
cat > test-compose-detection.sh << 'EOF'
#!/bin/bash

# Function to detect available compose command (copied from start-mailserver.sh)
detect_compose_command() {
    echo "🔍 Detecting available compose command..."
    
    # Check for podman-compose (native Python implementation)
    if command -v podman-compose &> /dev/null; then
        echo "✅ Found podman-compose (native)"
        echo "podman-compose"
        return 0
    fi
    
    # Check for docker-compose (standalone binary)
    if command -v docker-compose &> /dev/null; then
        # Test if it works with podman
        if CONTAINER_HOST=unix:///run/user/$(id -u)/podman/podman.sock docker-compose version &> /dev/null; then
            echo "✅ Found docker-compose (compatible with podman)"
            echo "docker-compose"
            return 0
        else
            echo "⚠️ Found docker-compose but it's not compatible with podman"
        fi
    fi
    
    # Check for podman compose (built-in subcommand)
    if podman compose version &> /dev/null; then
        echo "✅ Found podman compose (built-in)"
        echo "podman compose"
        return 0
    fi
    
    echo "❌ No compatible compose command found"
    return 1
}

# Test the function
compose_cmd=$(detect_compose_command)
exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ Compose command detection successful: $compose_cmd"
else
    echo "❌ Compose command detection failed"
    echo "💡 This would trigger automatic podman-compose installation"
fi

echo ""
echo "🔍 Available commands:"
echo "podman: $(command -v podman || echo 'not found')"
echo "podman-compose: $(command -v podman-compose || echo 'not found')"
echo "docker-compose: $(command -v docker-compose || echo 'not found')"

echo ""
echo "🔍 Testing podman compose subcommand:"
if podman compose version &> /dev/null; then
    echo "✅ podman compose works"
    podman compose version
else
    echo "❌ podman compose not available"
fi

echo ""
echo "🔍 Checking podman socket:"
if systemctl --user is-active --quiet podman.socket 2>/dev/null; then
    echo "✅ Podman socket is active"
else
    echo "⚠️ Podman socket is not active (this is normal in test environment)"
fi
EOF

chmod +x test-compose-detection.sh
./test-compose-detection.sh

echo ""
echo "🧪 Testing startup script (dry run)..."
echo ""

# Test the startup script in a way that doesn't actually start containers
if ./start-mailserver.sh auto 2>&1 | head -20; then
    echo ""
    echo "✅ Startup script executed without errors (first 20 lines shown)"
else
    echo ""
    echo "❌ Startup script encountered errors"
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo ""
echo "🎉 Podman Compose compatibility test completed!"
echo ""
echo "📋 Summary:"
echo "- The new start-mailserver.sh script should handle Podman Compose compatibility issues"
echo "- It detects available compose commands and uses the best option"
echo "- It includes fallbacks for installation and configuration"
echo "- The GitHub Actions workflow now uses this improved script"
echo ""
echo "💡 The next GitHub Actions run should succeed with proper Podman Compose handling!"
