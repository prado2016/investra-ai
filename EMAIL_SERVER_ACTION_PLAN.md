# Email Server Setup - Complete Action Plan

## 🎯 Current Status Summary

### ✅ What's Working
- ✅ Server is reachable (ping successful)
- ✅ Local development environment has all dependencies
- ✅ Email processing code is complete and ready
- ✅ Test suite is functional
- ✅ UI components are built and ready

### ❌ What Needs Fixing
- ❌ SSH connection to server (for automated deployment)
- ❌ Email server ports not accessible (993, 143, 587, 25)
- ❌ Dependencies not installed on server
- ❌ Email server software not configured

## 🚀 Step-by-Step Action Plan

### Step 1: Connect to Your Server
Choose one of these methods to access your server:

```bash
# Try standard SSH first
ssh root@10.0.0.83

# If that fails, try with password authentication
ssh -o PreferredAuthentications=password root@10.0.0.83

# Or if you have a specific key
ssh -i /path/to/your/key root@10.0.0.83
```

### Step 2: Install Dependencies (One Command)
Once connected to your server, copy and paste this single command:

```bash
mkdir -p /opt/investra-email && cd /opt/investra-email && (node --version 2>/dev/null || (curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && apt-get install -y nodejs build-essential)) && cat > package.json << 'EOF'
{
  "name": "investra-email-server",
  "version": "1.0.0",
  "dependencies": {
    "imapflow": "^1.0.188",
    "mailparser": "^3.7.3",
    "axios": "^1.9.0"
  }
}
EOF
npm install && node -e "try { require('imapflow'); require('mailparser'); console.log('✅ SUCCESS: All dependencies installed!'); } catch (error) { console.log('❌ FAILED: ' + error.message); }"
```

### Step 3: Set Up Email Server Software
After dependencies are installed, set up the email server:

```bash
# Install email server (choose one option)

# Option A: Install Postfix + Dovecot
apt-get update
apt-get install -y postfix dovecot-core dovecot-imapd

# Option B: Use Docker Mailserver (recommended)
docker run -d \
  --name mailserver \
  --hostname mail.investra.com \
  -p 25:25 -p 143:143 -p 587:587 -p 993:993 \
  -v /opt/investra-email/mail-data:/var/mail \
  -v /opt/investra-email/mail-config:/etc/mail \
  -e ENABLE_IMAP=1 \
  -e ENABLE_POP3=0 \
  docker.io/mailserver/docker-mailserver:latest

# Option C: Simple IMAP server for testing
npm install -g imap-server-simple
```

### Step 4: Configure Email Accounts
Create the email account that your system will use:

```bash
# If using Postfix/Dovecot
adduser transactions
passwd transactions  # Set to: InvestraSecure2025!

# If using Docker Mailserver
docker exec mailserver setup email add transactions@investra.com InvestraSecure2025!

# Verify account creation
docker exec mailserver setup email list
```

### Step 5: Test Email Server
Verify the email server is working:

```bash
# Check if email ports are listening
ss -tuln | grep -E ':(993|143|587|25)'

# Test IMAP connection locally
telnet localhost 143

# Or use our test script
node test-email-connection.js
```

## 🔧 Alternative: Quick Testing Setup

If you want to test the email processing without setting up a full email server, you can use a temporary solution:

### Use Gmail IMAP for Testing
```bash
# Create test configuration
cat > test-gmail-config.js << 'EOF'
const { ImapFlow } = require('imapflow');

async function testWithGmail() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'your-test-email@gmail.com',
      pass: 'your-app-password'  // Generate at myaccount.google.com
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Gmail IMAP connection successful');
    await client.logout();
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
}

testWithGmail();
EOF
```

## 📊 Expected Results After Setup

Once you complete the steps above, you should see:

1. **Dependencies installed:**
   ```
   ✅ Node.js version: v18.x.x
   ✅ npm version: 8.x.x
   ✅ imapflow: Available
   ✅ mailparser: Available
   ```

2. **Email server running:**
   ```
   ✅ Port 993: Listening (IMAPS)
   ✅ Port 143: Listening (IMAP)
   ✅ Port 587: Listening (SMTP submission)
   ```

3. **Email processing ready:**
   ```
   ✅ Can connect to IMAP
   ✅ Can fetch emails
   ✅ Can parse Wealthsimple emails
   ```

## 🚨 Troubleshooting Common Issues

### Issue: "npm install fails"
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules
npm install
```

### Issue: "Email ports not accessible"
```bash
# Check firewall
ufw status
ufw allow 993/tcp
ufw allow 143/tcp
ufw allow 587/tcp

# Check if service is running
systemctl status postfix
systemctl status dovecot
```

### Issue: "Authentication failed"
```bash
# Verify user exists
cat /etc/passwd | grep transactions

# Reset password
passwd transactions
```

## 🎯 Next Steps After Dependencies Are Fixed

1. **Run email connection test** → `node test-email-connection.js`
2. **Deploy email processor** → Use the files we created
3. **Test with sample emails** → Send test emails to process
4. **Monitor email processing** → Check logs and dashboard
5. **Configure production settings** → Set up SSL, monitoring, backups

## 📞 Quick Help Commands

```bash
# Check what's installed
node --version && npm --version && npm list

# Check what's running
ss -tuln | grep -E ':(993|143|587|25)'

# Test dependencies
node -e "console.log(require('imapflow'), require('mailparser'))"

# Check email server logs
tail -f /var/log/mail.log
```

---

**🎉 Once you complete Step 1 and 2, your server will have all the dependencies needed for email processing!**

The remaining steps (3-5) are for setting up the actual email server, which is needed for the email ports to be accessible. Let me know what specific error messages you encounter and I can provide more targeted help.
