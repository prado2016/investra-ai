#!/bin/bash

# Deploy Email Processing Files to Server
# This script copies necessary files and installs dependencies on the remote server

SERVER="root@10.0.0.83"
SERVER_DIR="/opt/investra-email"

echo "🚀 Deploying Email Processing Setup to Server"
echo "=============================================="
echo "Server: $SERVER"
echo "Directory: $SERVER_DIR"
echo ""

# Function to check if SSH works
check_ssh() {
    echo "🔍 Testing SSH connection..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no "$SERVER" echo "SSH OK" 2>/dev/null; then
        echo "✅ SSH connection successful"
        return 0
    else
        echo "❌ SSH connection failed"
        echo ""
        echo "💡 To fix SSH access:"
        echo "1. Make sure the server is accessible: ping 10.0.0.83"
        echo "2. Check SSH service: ssh root@10.0.0.83"
        echo "3. Set up SSH key: ssh-copy-id root@10.0.0.83"
        return 1
    fi
}

# Function to deploy files
deploy_files() {
    echo ""
    echo "📁 Creating server directory..."
    ssh "$SERVER" "mkdir -p $SERVER_DIR" 2>/dev/null
    
    echo "📦 Copying package.json..."
    scp -o StrictHostKeyChecking=no server-package.json "$SERVER:$SERVER_DIR/package.json" 2>/dev/null
    
    echo "🧪 Copying test script..."
    scp -o StrictHostKeyChecking=no test-server-deps.js "$SERVER:$SERVER_DIR/" 2>/dev/null
    
    echo "📧 Copying email connection test..."
    scp -o StrictHostKeyChecking=no test-email-connection.js "$SERVER:$SERVER_DIR/" 2>/dev/null
    
    echo "📋 Copying troubleshooting guide..."
    scp -o StrictHostKeyChecking=no DEPENDENCY_TROUBLESHOOTING.md "$SERVER:$SERVER_DIR/" 2>/dev/null
}

# Function to install dependencies
install_dependencies() {
    echo ""
    echo "🔧 Installing dependencies on server..."
    
    # Check Node.js
    echo "📦 Checking Node.js..."
    if ! ssh "$SERVER" "node --version" 2>/dev/null; then
        echo "📝 Installing Node.js..."
        ssh "$SERVER" "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && apt-get install -y nodejs" 2>/dev/null
    else
        echo "✅ Node.js already installed"
    fi
    
    # Install npm packages
    echo "📧 Installing email packages..."
    ssh "$SERVER" "cd $SERVER_DIR && npm install" 2>/dev/null
    
    # Test installation
    echo "🧪 Testing installation..."
    if ssh "$SERVER" "cd $SERVER_DIR && node test-server-deps.js" 2>/dev/null; then
        echo "✅ Dependencies installed successfully!"
    else
        echo "⚠️ Installation may have issues - check manually"
    fi
}

# Function to create startup script
create_startup_script() {
    echo ""
    echo "🚀 Creating email processor startup script..."
    
    cat << 'EOF' > /tmp/email-processor.js
/**
 * Simple Email Processor Server
 * Processes Wealthsimple emails automatically
 */

const { ImapFlow } = require('imapflow');

const config = {
  host: 'localhost',
  port: 993,
  secure: true,
  auth: {
    user: 'transactions@investra.com',
    pass: 'InvestraSecure2025!'
  }
};

class EmailProcessor {
  constructor() {
    this.client = null;
    this.isRunning = false;
  }
  
  async start() {
    console.log('🚀 Starting Email Processor...');
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        await this.processEmails();
        await this.sleep(30000); // Check every 30 seconds
      } catch (error) {
        console.error('❌ Error processing emails:', error.message);
        await this.sleep(60000); // Wait longer on error
      }
    }
  }
  
  async processEmails() {
    try {
      if (!this.client) {
        this.client = new ImapFlow(config);
        await this.client.connect();
        console.log('✅ Connected to email server');
      }
      
      await this.client.mailboxOpen('INBOX');
      
      const messages = this.client.fetch({ unseen: true }, {
        uid: true,
        envelope: true,
        source: true
      });
      
      let count = 0;
      for await (const message of messages) {
        console.log(`📧 Processing email: ${message.envelope.subject}`);
        // TODO: Add your email processing logic here
        count++;
      }
      
      if (count > 0) {
        console.log(`✅ Processed ${count} emails`);
      }
      
    } catch (error) {
      console.error('❌ Email processing error:', error.message);
      if (this.client) {
        try {
          await this.client.logout();
        } catch (e) {}
        this.client = null;
      }
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  stop() {
    console.log('🛑 Stopping Email Processor...');
    this.isRunning = false;
    if (this.client) {
      this.client.logout().catch(() => {});
    }
  }
}

// Start processor
const processor = new EmailProcessor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  processor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  processor.stop();
  process.exit(0);
});

console.log('🔧 Email Processor Starting...');
processor.start().catch(console.error);
EOF
    
    # Copy to server
    scp -o StrictHostKeyChecking=no /tmp/email-processor.js "$SERVER:$SERVER_DIR/" 2>/dev/null
    rm /tmp/email-processor.js
    
    echo "✅ Email processor script deployed"
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "🎯 Next Steps"
    echo "============="
    echo ""
    echo "1. 🔐 SSH into your server:"
    echo "   ssh $SERVER"
    echo ""
    echo "2. 🧪 Test dependencies:"
    echo "   cd $SERVER_DIR"
    echo "   node test-server-deps.js"
    echo ""
    echo "3. 📧 Test email connection:"
    echo "   node test-email-connection.js"
    echo ""
    echo "4. 🚀 Start email processor:"
    echo "   node email-processor.js"
    echo ""
    echo "5. 📊 Monitor logs:"
    echo "   tail -f /var/log/syslog | grep email"
    echo ""
    echo "📋 Files deployed to $SERVER_DIR:"
    echo "   - package.json (dependencies)"
    echo "   - test-server-deps.js (dependency test)"
    echo "   - test-email-connection.js (email test)"
    echo "   - email-processor.js (main processor)"
    echo "   - DEPENDENCY_TROUBLESHOOTING.md (help guide)"
}

# Main execution
main() {
    if ! check_ssh; then
        echo ""
        echo "❌ Cannot proceed without SSH access"
        echo "🔧 Fix SSH connection first, then re-run this script"
        exit 1
    fi
    
    deploy_files
    install_dependencies
    create_startup_script
    show_next_steps
    
    echo ""
    echo "✅ Deployment complete!"
    echo "🎉 Your email server is ready for testing"
}

# Run main function
main "$@"
