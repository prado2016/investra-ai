# Email Server Dependency Resolution - Complete Guide

## 🎯 What This Solves

You mentioned a **missing dependency** on your email server at `root@10.0.0.83`. This guide provides multiple tools and approaches to identify and fix dependency issues for email processing.

## 📁 Files Created

### 1. **`install-server-dependencies.sh`** - Comprehensive Server Setup
- Full system analysis and dependency installation
- Checks Node.js, Python, email services, ports
- Installs missing packages automatically
- Creates test email processor

### 2. **`quick-dependency-check.sh`** - Fast Diagnosis
- Quick check of critical dependencies
- Identifies specific missing packages
- Provides immediate fix commands

### 3. **`deploy-to-server.sh`** - Complete Deployment
- Copies all necessary files to server
- Installs dependencies remotely
- Creates working email processor
- Sets up testing environment

### 4. **`test-server-deps.js`** - Dependency Verification
- Tests all required Node.js modules
- Verifies IMAP and mailparser functionality
- Checks network connectivity and permissions
- Provides detailed error reporting

### 5. **`server-package.json`** - Server Dependencies
- Pre-configured package.json for the server
- Includes all required email processing packages
- Ready for `npm install`

### 6. **`DEPENDENCY_TROUBLESHOOTING.md`** - Manual Troubleshooting
- Step-by-step dependency resolution
- Common error solutions
- Emergency fallback options

## 🚀 Quick Start - Choose Your Approach

### Option A: Automated Deployment (Recommended)
```bash
cd /Users/eduardo/investra-ai
./deploy-to-server.sh
```
This will:
- Test SSH connection
- Copy all files to server
- Install dependencies automatically
- Create working email processor

### Option B: Manual SSH Setup
```bash
# 1. SSH into your server
ssh root@10.0.0.83

# 2. Create project directory
mkdir -p /opt/investra-email && cd /opt/investra-email

# 3. Install Node.js (if missing)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 4. Install email dependencies
npm init -y
npm install imapflow mailparser axios dotenv

# 5. Test installation
node -e "console.log('✅ Dependencies installed!')"
```

### Option C: Quick Diagnosis Only
```bash
cd /Users/eduardo/investra-ai
./quick-dependency-check.sh
```
This will identify what's missing without installing anything.

## 🔧 Common Dependency Issues and Solutions

### Issue: "imapflow not found"
**Solution:**
```bash
ssh root@10.0.0.83
cd /opt/investra-email
npm install imapflow
```

### Issue: "Node.js not installed"
**Solution:**
```bash
ssh root@10.0.0.83
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### Issue: "Permission denied"
**Solution:**
```bash
ssh root@10.0.0.83
chown -R root:root /opt/investra-email
chmod -R 755 /opt/investra-email
```

### Issue: "Cannot compile native modules"
**Solution:**
```bash
ssh root@10.0.0.83
apt-get update
apt-get install -y build-essential python3
```

## 🧪 Testing Your Setup

After installing dependencies, test them:

1. **Copy test file to server:**
   ```bash
   scp test-server-deps.js root@10.0.0.83:/opt/investra-email/
   ```

2. **Run dependency test:**
   ```bash
   ssh root@10.0.0.83
   cd /opt/investra-email
   node test-server-deps.js
   ```

3. **Test email connection:**
   ```bash
   cd /opt/investra-email
   node test-email-connection.js
   ```

## 📊 What Each Script Does

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `deploy-to-server.sh` | Complete automated setup | First time setup or major issues |
| `quick-dependency-check.sh` | Fast diagnosis | Quick problem identification |
| `install-server-dependencies.sh` | Comprehensive analysis | Deep system analysis needed |
| `test-server-deps.js` | Verify installation | After installing dependencies |

## 🎯 Expected Results

After running the scripts, you should see:
- ✅ Node.js installed and working
- ✅ npm packages (imapflow, mailparser) available
- ✅ Network connectivity verified
- ✅ File system permissions correct
- ✅ Email server ready for processing

## 🚨 If Something Goes Wrong

1. **Check the exact error message** - Note the specific package mentioned
2. **Try manual installation** - SSH in and install packages one by one
3. **Verify SSH access** - Make sure you can connect to the server
4. **Check internet connectivity** - Server needs to download packages
5. **Review logs** - Look for detailed error messages

## 📞 Next Steps After Dependencies Are Fixed

1. **Configure IMAP settings** in your application
2. **Test with sample Wealthsimple emails**
3. **Run the email processing test suite**
4. **Set up monitoring and logging**
5. **Deploy production email processor**

## 🔍 Quick Diagnosis Command

If you want to quickly see what's missing:
```bash
ssh root@10.0.0.83 "node --version && npm --version && ls -la /opt/investra-email/node_modules/ 2>/dev/null"
```

This will show:
- Node.js version (or error if missing)
- npm version (or error if missing)  
- Installed packages (or error if directory missing)

---

**🎉 You now have everything needed to diagnose and fix dependency issues on your email server!**

Choose the approach that fits your situation and let me know if you encounter any specific error messages.
