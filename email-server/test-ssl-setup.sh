#!/bin/bash

# Test script for SSL setup - simulates GitHub Actions environment

echo "🧪 Testing SSL setup script..."

# Set test environment variables
export ADMIN_EMAIL="test@investra.com"
export HOSTNAME="mail-test.investra.com"
export EMAIL_DOMAIN="investra.com"
export CI="true"  # Simulate CI environment

# Create test directory
TEST_DIR="/tmp/ssl-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Copy the SSL setup script
cp ~/investra-ai/email-server/setup-ssl.sh .
chmod +x setup-ssl.sh

echo ""
echo "🔍 Testing automated SSL setup (should use self-signed fallback)..."
echo ""

# Run the script in auto mode (should fallback to self-signed)
if ./setup-ssl.sh auto; then
    echo ""
    echo "✅ SSL setup test completed successfully"
    
    # Verify certificate files
    if [ -f "docker-data/dms/certs/$HOSTNAME/fullchain.pem" ] && [ -f "docker-data/dms/certs/$HOSTNAME/privkey.pem" ]; then
        echo "✅ Certificate files generated correctly"
        echo ""
        echo "📋 Certificate details:"
        openssl x509 -in docker-data/dms/certs/$HOSTNAME/fullchain.pem -noout -subject -dates
    else
        echo "❌ Certificate files not found"
        exit 1
    fi
else
    echo "❌ SSL setup test failed"
    exit 1
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo ""
echo "🎉 SSL setup test completed successfully!"
echo "💡 The GitHub Actions workflow should now work with the updated setup-ssl.sh script"
