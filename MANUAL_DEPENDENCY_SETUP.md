# Manual Email Server Dependency Installation Guide

## 🎯 Current Situation
- ✅ Server is reachable (ping successful: 10.0.0.83)
- ❌ SSH automated connection failed
- 🔧 Need to manually install dependencies

## 🚀 Step-by-Step Manual Resolution

### Step 1: Establish SSH Connection

Try connecting to your server manually:

```bash
# Method 1: Standard SSH
ssh root@10.0.0.83

# Method 2: If you have a different SSH key
ssh -i ~/.ssh/your_key root@10.0.0.83

# Method 3: If SSH port is different
ssh -p 2222 root@10.0.0.83

# Method 4: Force password authentication
ssh -o PreferredAuthentications=password root@10.0.0.83
```

### Step 2: Once Connected, Install Dependencies

Copy and paste these commands on your server:

```bash
# Create project directory
mkdir -p /opt/investra-email
cd /opt/investra-email

# Check current system
echo "🖥️ System Information:"
cat /etc/os-release | grep PRETTY_NAME
uname -m
free -h | grep Mem

# Install Node.js (if not present)
echo "📦 Installing Node.js..."
node --version 2>/dev/null || {
    echo "Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs build-essential
}

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Create package.json
echo "📝 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "investra-email-server",
  "version": "1.0.0",
  "description": "Email processing server for Investra AI",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node test-connection.js"
  },
  "dependencies": {
    "imapflow": "^1.0.188",
    "mailparser": "^3.7.3",
    "axios": "^1.9.0",
    "dotenv": "^16.0.0"
  }
}
EOF

# Install dependencies
echo "📧 Installing email processing dependencies..."
npm install

# Test installation
echo "🧪 Testing dependencies..."
node -e "
try {
  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');
  console.log('✅ imapflow: Available');
  console.log('✅ mailparser: Available');
  console.log('✅ All dependencies installed successfully!');
} catch (error) {
  console.log('❌ Dependency error:', error.message);
}
"
```

### Step 3: Create and Run Dependency Test

Create a test file on the server:

```bash
# Create dependency test file
cat > test-dependencies.js << 'EOF'
#!/usr/bin/env node
console.log('🔧 Email Server Dependency Test');
console.log('================================');

// Test Node.js
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);

// Test required modules
const modules = ['imapflow', 'mailparser', 'axios'];
let allGood = true;

modules.forEach(mod => {
  try {
    require.resolve(mod);
    console.log(`✅ ${mod}: Available`);
  } catch (error) {
    console.log(`❌ ${mod}: Missing`);
    allGood = false;
  }
});

if (allGood) {
  console.log('🎉 All dependencies are installed correctly!');
  
  // Test IMAP functionality
  try {
    const { ImapFlow } = require('imapflow');
    const client = new ImapFlow({
      host: 'test.example.com',
      port: 993,
      secure: true,
      auth: { user: 'test', pass: 'test' }
    });
    console.log('✅ ImapFlow can be instantiated');
  } catch (error) {
    console.log('❌ ImapFlow error:', error.message);
  }
} else {
  console.log('❌ Some dependencies are missing');
  console.log('Run: npm install imapflow mailparser axios');
}
EOF

# Run the test
node test-dependencies.js
```

### Step 4: Create Email Connection Test

```bash
# Create email connection test
cat > test-email-connection.js << 'EOF'
const { ImapFlow } = require('imapflow');

async function testEmailConnection() {
  console.log('📧 Testing Email Server Connection...');
  
  const config = {
    host: 'localhost',  // or your actual email server
    port: 993,
    secure: true,
    auth: {
      user: 'transactions@investra.com',
      pass: 'InvestraSecure2025!'
    }
  };
  
  try {
    console.log(`Connecting to ${config.host}:${config.port}...`);
    const client = new ImapFlow(config);
    
    await client.connect();
    console.log('✅ IMAP connection successful');
    
    const mailboxes = await client.list();
    console.log(`📫 Found ${mailboxes.length} mailboxes`);
    
    await client.logout();
    console.log('✅ Connection test completed');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    // Check specific error types
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Email server is not running or not accessible');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Email server hostname cannot be resolved');
    } else if (error.message.includes('Authentication')) {
      console.log('💡 Check email credentials');
    }
  }
}

testEmailConnection();
EOF

# Run email connection test
echo "📧 Testing email connection..."
node test-email-connection.js
```

## 🔧 Common Issues and Solutions

### Issue: "npm: command not found"
```bash
# Install npm (usually comes with Node.js)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### Issue: "Permission denied"
```bash
# Fix permissions
sudo chown -R $USER:$USER /opt/investra-email
chmod -R 755 /opt/investra-email
```

### Issue: "Cannot compile native modules"
```bash
# Install build tools
apt-get update
apt-get install -y build-essential python3 python3-pip
```

### Issue: "Module not found after installation"
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Alternative: Docker Installation

If npm installation fails, try Docker:

```bash
# Install Docker (if not present)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["node", "test-dependencies.js"]
EOF

# Build and run
docker build -t email-processor .
docker run email-processor
```

## 📊 Verification Commands

After installation, verify everything works:

```bash
# Check versions
node --version
npm --version

# List installed packages
npm list

# Test specific modules
node -e "console.log(require('imapflow'))"
node -e "console.log(require('mailparser'))"

# Check email server ports
ss -tuln | grep -E ':(993|143|587|25)'
```

## 🚀 Next Steps After Dependencies Are Fixed

1. **Test with your actual email configuration**
2. **Run the comprehensive email test suite**
3. **Deploy the IMAP email processor**
4. **Set up monitoring and logging**

---

## 📞 Quick Help

If you encounter specific error messages, copy them and I can provide targeted solutions. The most common issues are:

- **Node.js not installed** → Use the Node.js installation commands above
- **npm packages missing** → Run `npm install` in the project directory
- **Permission errors** → Use `sudo` or fix directory permissions
- **Build failures** → Install `build-essential` and `python3`

**Remember:** After fixing dependencies, run `node test-dependencies.js` to verify everything is working correctly.
