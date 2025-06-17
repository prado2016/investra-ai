#!/bin/bash

# Email Parsing Test Deployment for Dev Environment
# Deploy and test email parsing on 10.0.0.89

DEV_SERVER="10.0.0.89"
SERVER_USER="root"  # Change if different
SERVER_DIR="/opt/investra-email"

echo "🚀 Email Parsing Test Deployment"
echo "================================="
echo "Dev Server: $DEV_SERVER"
echo "Directory: $SERVER_DIR"
echo ""

# Test connectivity
echo "🔍 Testing connectivity to dev server..."
if ping -c 2 $DEV_SERVER > /dev/null 2>&1; then
    echo "✅ Dev server is reachable"
else
    echo "❌ Dev server not reachable"
    exit 1
fi

# Test SSH ports
echo "🔍 Testing SSH connectivity..."
for port in 22 2222 22222; do
    if timeout 5 bash -c "</dev/tcp/$DEV_SERVER/$port" 2>/dev/null; then
        echo "✅ SSH port $port is open"
        SSH_PORT=$port
        break
    else
        echo "⚠️ SSH port $port not accessible"
    fi
done

if [ -z "$SSH_PORT" ]; then
    echo "❌ No SSH access available"
    echo ""
    echo "💡 Alternative deployment options:"
    echo "1. Use web interface to upload files"
    echo "2. Use file sharing (scp/sftp on different port)"
    echo "3. Manual copy via USB/network share"
    echo ""
    echo "📁 Files ready for manual deployment:"
    echo "   - test-email-parsing-dev.js (main test)"
    echo "   - src/services/email/ (email parsing code)"
    echo ""
    exit 1
fi

# Try SSH connection
echo "🔗 Testing SSH connection on port $SSH_PORT..."
SSH_CMD="ssh -p $SSH_PORT -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$DEV_SERVER"

if $SSH_CMD "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection established"
    
    # Deploy files
    echo ""
    echo "📁 Deploying email parsing tests..."
    
    # Create directory
    $SSH_CMD "mkdir -p $SERVER_DIR"
    
    # Copy test file
    scp -P $SSH_PORT test-email-parsing-dev.js $SERVER_USER@$DEV_SERVER:$SERVER_DIR/ 2>/dev/null
    
    # Copy email service files (if they exist)
    if [ -d "src/services/email" ]; then
        echo "📧 Copying email parsing services..."
        scp -P $SSH_PORT -r src/services/email $SERVER_USER@$DEV_SERVER:$SERVER_DIR/ 2>/dev/null
    fi
    
    # Create package.json
    echo "📦 Creating package.json..."
    $SSH_CMD "cd $SERVER_DIR && cat > package.json << 'EOF'
{
  \"name\": \"email-parsing-test\",
  \"type\": \"module\",
  \"dependencies\": {
    \"imapflow\": \"^1.0.188\",
    \"mailparser\": \"^3.7.3\"
  }
}
EOF"
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    $SSH_CMD "cd $SERVER_DIR && npm install"
    
    # Test installation
    echo "🧪 Testing installation..."
    if $SSH_CMD "cd $SERVER_DIR && node --version && npm list"; then
        echo "✅ Dependencies installed successfully"
        
        # Run email parsing tests
        echo ""
        echo "🧪 Running email parsing tests..."
        $SSH_CMD "cd $SERVER_DIR && node test-email-parsing-dev.js"
        
    else
        echo "❌ Installation failed"
    fi
    
else
    echo "❌ SSH connection failed"
    echo ""
    echo "💡 Manual deployment steps:"
    echo "1. Access your dev server at $DEV_SERVER"
    echo "2. Create directory: mkdir -p $SERVER_DIR"
    echo "3. Copy test-email-parsing-dev.js to the server"
    echo "4. Install Node.js and npm if not present"
    echo "5. Run: npm install imapflow mailparser"
    echo "6. Run: node test-email-parsing-dev.js"
fi

echo ""
echo "🎯 Next steps after deployment:"
echo "1. Verify email parsing tests pass"
echo "2. Test with real Wealthsimple emails"
echo "3. Set up email server integration"
echo "4. Deploy to production"
