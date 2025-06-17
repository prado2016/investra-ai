#!/bin/bash

# Quick Email Server Dependency Check
# Identifies and fixes missing dependencies for email processing

SERVER="root@10.0.0.83"

echo "🔍 Quick Email Server Dependency Check"
echo "======================================="
echo "Server: $SERVER"
echo ""

# Function to run command on server
remote_cmd() {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER" "$1" 2>/dev/null
}

# Check critical dependencies
echo "📦 Checking critical dependencies..."

# 1. Node.js and npm
echo -n "Node.js: "
if NODE_VER=$(remote_cmd "node --version"); then
    echo "✅ $NODE_VER"
else
    echo "❌ Missing"
    echo "📝 Installing Node.js..."
    remote_cmd "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && apt-get install -y nodejs"
fi

echo -n "npm: "
if NPM_VER=$(remote_cmd "npm --version"); then
    echo "✅ $NPM_VER"
else
    echo "❌ Missing"
fi

# 2. Email processing packages
echo ""
echo "📧 Checking email processing packages..."

# Check if imapflow is installed globally or in a project
echo -n "imapflow: "
if remote_cmd "npm list -g imapflow 2>/dev/null | grep imapflow" || remote_cmd "find /opt -name 'node_modules' -exec test -d {}/imapflow \\; -print 2>/dev/null | head -1"; then
    echo "✅ Installed"
else
    echo "❌ Missing"
    echo "📝 Installing imapflow..."
    remote_cmd "mkdir -p /opt/investra-email && cd /opt/investra-email && npm init -y && npm install imapflow"
fi

echo -n "mailparser: "
if remote_cmd "npm list -g mailparser 2>/dev/null | grep mailparser" || remote_cmd "find /opt -name 'node_modules' -exec test -d {}/mailparser \\; -print 2>/dev/null | head -1"; then
    echo "✅ Installed"
else
    echo "❌ Missing"
    echo "📝 Installing mailparser..."
    remote_cmd "cd /opt/investra-email && npm install mailparser"
fi

# 3. Email server software
echo ""
echo "📮 Checking email server software..."

SERVICES=("postfix" "dovecot" "exim4")
EMAIL_SERVER_FOUND=false

for service in "${SERVICES[@]}"; do
    echo -n "$service: "
    if STATUS=$(remote_cmd "systemctl is-active $service 2>/dev/null"); then
        if [ "$STATUS" = "active" ]; then
            echo "✅ Running"
            EMAIL_SERVER_FOUND=true
        else
            echo "⚠️ Installed but not active"
        fi
    else
        echo "❌ Not installed"
    fi
done

# Check Docker containers
echo -n "Docker mail containers: "
if CONTAINERS=$(remote_cmd "docker ps --format '{{.Names}}' | grep -E 'mail|postfix|dovecot' 2>/dev/null"); then
    echo "✅ Found: $CONTAINERS"
    EMAIL_SERVER_FOUND=true
else
    echo "❌ None found"
fi

# 4. Port availability
echo ""
echo "🌐 Checking email ports..."

PORTS=(25 587 993 143)
for port in "${PORTS[@]}"; do
    echo -n "Port $port: "
    if LISTENING=$(remote_cmd "ss -tuln | grep :$port"); then
        echo "✅ Listening ($(echo $LISTENING | awk '{print $1}'))"
    else
        echo "❌ Not listening"
    fi
done

# 5. Test directory and permissions
echo ""
echo "📁 Checking project setup..."

echo -n "Project directory: "
if remote_cmd "test -d /opt/investra-email"; then
    echo "✅ /opt/investra-email exists"
else
    echo "❌ Missing"
    echo "📝 Creating project directory..."
    remote_cmd "mkdir -p /opt/investra-email && chmod 755 /opt/investra-email"
fi

echo -n "Node modules: "
if remote_cmd "test -d /opt/investra-email/node_modules"; then
    echo "✅ node_modules exists"
else
    echo "❌ Missing"
    echo "📝 Initializing npm project..."
    remote_cmd "cd /opt/investra-email && npm init -y"
fi

# Summary and recommendations
echo ""
echo "📊 Summary"
echo "=========="

if [ "$EMAIL_SERVER_FOUND" = true ]; then
    echo "✅ Email server software detected"
else
    echo "❌ No email server software found"
    echo "💡 Consider installing: docker run -d --name mailserver ..."
fi

echo ""
echo "🔧 Quick fixes to try:"
echo "1. SSH into server: ssh $SERVER"
echo "2. Install dependencies: cd /opt/investra-email && npm install imapflow mailparser axios"
echo "3. Test connection: node -e \"console.log('Dependencies OK')\""
echo ""
echo "🚨 If you're getting 'dependency missing' errors:"
echo "- Check if the error mentions a specific package name"
echo "- Install it with: npm install <package-name>"
echo "- Verify Node.js version compatibility"

# Quick test
echo ""
echo "🧪 Running quick connectivity test..."
if remote_cmd "ping -c 1 google.com > /dev/null 2>&1"; then
    echo "✅ Server has internet connectivity"
else
    echo "❌ Server cannot reach internet"
fi

echo ""
echo "✅ Dependency check complete!"
