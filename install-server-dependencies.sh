#!/bin/bash

# Email Server Dependencies Installation Script
# This script helps install missing dependencies on the remote email server

SERVER_IP="10.0.0.83"
SERVER_USER="root"
SSH_KEY_PATH="$HOME/.ssh/id_rsa"  # Adjust path as needed

echo "🔧 Email Server Dependencies Installation"
echo "========================================"
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Function to run commands on remote server
run_remote() {
    local cmd="$1"
    echo "📡 Executing on server: $cmd"
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$cmd" 2>/dev/null
}

# Function to check if SSH connection works
check_ssh_connection() {
    echo "🔍 Testing SSH connection to $SERVER_USER@$SERVER_IP..."
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo 'SSH connection successful'" 2>/dev/null; then
        echo "✅ SSH connection established"
        return 0
    else
        echo "❌ SSH connection failed"
        echo ""
        echo "💡 To fix SSH connection:"
        echo "1. Generate SSH key: ssh-keygen -t rsa -b 4096"
        echo "2. Copy key to server: ssh-copy-id $SERVER_USER@$SERVER_IP"
        echo "3. Or use password authentication: ssh $SERVER_USER@$SERVER_IP"
        return 1
    fi
}

# Function to check system info
check_system_info() {
    echo ""
    echo "🖥️  Checking system information..."
    
    OS_INFO=$(run_remote "cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2")
    if [ -n "$OS_INFO" ]; then
        echo "Operating System: $OS_INFO"
    fi
    
    ARCH=$(run_remote "uname -m")
    if [ -n "$ARCH" ]; then
        echo "Architecture: $ARCH"
    fi
    
    MEMORY=$(run_remote "free -h | grep Mem | awk '{print \$2}'")
    if [ -n "$MEMORY" ]; then
        echo "Memory: $MEMORY"
    fi
    
    DISK=$(run_remote "df -h / | tail -1 | awk '{print \$4\" available\"}'")
    if [ -n "$DISK" ]; then
        echo "Disk Space: $DISK"
    fi
}

# Function to check Node.js and npm
check_nodejs() {
    echo ""
    echo "📦 Checking Node.js and npm..."
    
    NODE_VERSION=$(run_remote "node --version 2>/dev/null")
    if [ -n "$NODE_VERSION" ]; then
        echo "✅ Node.js installed: $NODE_VERSION"
    else
        echo "❌ Node.js not found"
        echo "📝 Installing Node.js..."
        
        # Install Node.js using NodeSource repository
        run_remote "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        run_remote "apt-get install -y nodejs"
        
        NODE_VERSION=$(run_remote "node --version 2>/dev/null")
        if [ -n "$NODE_VERSION" ]; then
            echo "✅ Node.js installed successfully: $NODE_VERSION"
        else
            echo "❌ Node.js installation failed"
        fi
    fi
    
    NPM_VERSION=$(run_remote "npm --version 2>/dev/null")
    if [ -n "$NPM_VERSION" ]; then
        echo "✅ npm installed: $NPM_VERSION"
    else
        echo "❌ npm not found"
    fi
}

# Function to check Python and pip
check_python() {
    echo ""
    echo "🐍 Checking Python..."
    
    PYTHON_VERSION=$(run_remote "python3 --version 2>/dev/null")
    if [ -n "$PYTHON_VERSION" ]; then
        echo "✅ Python3 installed: $PYTHON_VERSION"
    else
        echo "❌ Python3 not found"
        echo "📝 Installing Python3..."
        run_remote "apt-get update && apt-get install -y python3 python3-pip"
    fi
    
    PIP_VERSION=$(run_remote "pip3 --version 2>/dev/null")
    if [ -n "$PIP_VERSION" ]; then
        echo "✅ pip3 installed: $PIP_VERSION"
    else
        echo "❌ pip3 not found"
    fi
}

# Function to check email server software
check_email_services() {
    echo ""
    echo "📧 Checking email services..."
    
    # Check for common email servers
    POSTFIX=$(run_remote "systemctl is-active postfix 2>/dev/null")
    DOVECOT=$(run_remote "systemctl is-active dovecot 2>/dev/null")
    EXIM=$(run_remote "systemctl is-active exim4 2>/dev/null")
    
    if [ "$POSTFIX" = "active" ]; then
        echo "✅ Postfix is running"
    elif [ "$DOVECOT" = "active" ]; then
        echo "✅ Dovecot is running"
    elif [ "$EXIM" = "active" ]; then
        echo "✅ Exim is running"
    else
        echo "❌ No email server detected"
        echo "💡 Common email servers: postfix, dovecot, exim4"
    fi
    
    # Check for Docker (often used for email servers)
    DOCKER=$(run_remote "docker --version 2>/dev/null")
    if [ -n "$DOCKER" ]; then
        echo "✅ Docker installed: $DOCKER"
        
        # Check for running email containers
        CONTAINERS=$(run_remote "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E 'mail|postfix|dovecot' 2>/dev/null")
        if [ -n "$CONTAINERS" ]; then
            echo "📧 Email containers found:"
            echo "$CONTAINERS"
        fi
    else
        echo "❌ Docker not found"
    fi
}

# Function to check network connectivity
check_network() {
    echo ""
    echo "🌐 Checking network connectivity..."
    
    # Check if email ports are listening
    PORTS=(25 587 993 143 110 995)
    for port in "${PORTS[@]}"; do
        LISTENING=$(run_remote "ss -tuln | grep :$port | head -1")
        if [ -n "$LISTENING" ]; then
            echo "✅ Port $port is listening: $(echo $LISTENING | awk '{print $1}')"
        else
            echo "❌ Port $port is not listening"
        fi
    done
    
    # Check firewall status
    UFW_STATUS=$(run_remote "ufw status 2>/dev/null")
    if [ -n "$UFW_STATUS" ]; then
        echo "🔥 Firewall status:"
        echo "$UFW_STATUS"
    fi
}

# Function to install missing email dependencies
install_email_dependencies() {
    echo ""
    echo "📦 Installing email processing dependencies..."
    
    # Update package list
    echo "📝 Updating package list..."
    run_remote "apt-get update"
    
    # Install basic dependencies
    echo "📝 Installing basic dependencies..."
    run_remote "apt-get install -y curl wget git build-essential"
    
    # Install email-related packages
    echo "📝 Installing email packages..."
    run_remote "apt-get install -y mailutils postfix-utils dovecot-core"
    
    # Create email project directory
    echo "📝 Creating email project directory..."
    run_remote "mkdir -p /opt/investra-email && cd /opt/investra-email"
    
    # Install email processing Node.js dependencies
    if [ -n "$(run_remote 'which npm')" ]; then
        echo "📝 Installing Node.js email dependencies..."
        run_remote "cd /opt/investra-email && npm init -y"
        run_remote "cd /opt/investra-email && npm install imapflow mailparser axios"
        echo "✅ Node.js dependencies installed"
    fi
}

# Function to create test email processor
create_test_processor() {
    echo ""
    echo "📝 Creating test email processor..."
    
    cat << 'EOF' > /tmp/test-email-processor.js
// Simple test email processor
const { ImapFlow } = require('imapflow');

async function testEmailConnection() {
  console.log('🔧 Testing email server connection...');
  
  const config = {
    host: 'localhost',
    port: 993,
    secure: true,
    auth: {
      user: 'transactions@investra.com',
      pass: 'InvestraSecure2025!'
    }
  };
  
  try {
    const client = new ImapFlow(config);
    await client.connect();
    console.log('✅ IMAP connection successful');
    
    const mailboxes = await client.list();
    console.log('📧 Available mailboxes:', mailboxes.length);
    
    await client.logout();
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testEmailConnection();
EOF
    
    # Copy to server
    scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no /tmp/test-email-processor.js "$SERVER_USER@$SERVER_IP:/opt/investra-email/" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Test processor uploaded to server"
        echo "💡 Run on server: cd /opt/investra-email && node test-email-processor.js"
    else
        echo "❌ Failed to upload test processor"
    fi
    
    rm /tmp/test-email-processor.js
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "🎯 Next Steps"
    echo "=============="
    echo ""
    echo "1. 📧 Configure Email Server:"
    echo "   - Set up IMAP/SMTP services"
    echo "   - Configure user accounts"
    echo "   - Test email delivery"
    echo ""
    echo "2. 🔧 Test Email Processing:"
    echo "   ssh $SERVER_USER@$SERVER_IP"
    echo "   cd /opt/investra-email"
    echo "   node test-email-processor.js"
    echo ""
    echo "3. 🚀 Deploy Email Processor:"
    echo "   - Upload your email processing code"
    echo "   - Configure environment variables"
    echo "   - Set up monitoring and logging"
    echo ""
    echo "4. 🔒 Security Setup:"
    echo "   - Configure SSL certificates"
    echo "   - Set up firewall rules"
    echo "   - Enable fail2ban"
    echo ""
}

# Main execution
main() {
    echo "Starting email server dependency check and installation..."
    echo ""
    
    # Check SSH connection first
    if ! check_ssh_connection; then
        exit 1
    fi
    
    # Run all checks
    check_system_info
    check_nodejs
    check_python
    check_email_services
    check_network
    
    # Ask if user wants to install dependencies
    echo ""
    read -p "📦 Do you want to install missing dependencies? (y/N): " install_deps
    if [[ $install_deps =~ ^[Yy]$ ]]; then
        install_email_dependencies
        create_test_processor
    fi
    
    show_next_steps
}

# Run if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
