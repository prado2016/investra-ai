# 🔐 GitHub Secrets Configuration Guide

## Required Secrets for Email Server Deployment

### 1. **RHEL VM Access Secrets**

#### `RHEL_VM_HOST`
- **Description**: IP address or hostname of your RHEL VM
- **Example**: `203.0.113.42` or `mail.investra.com`
- **How to get**: Your VM's public IP address

#### `RHEL_VM_USER` 
- **Description**: Username to SSH into the RHEL VM
- **Example**: `ec2-user`, `rhel`, `investra`, or your custom user
- **How to get**: The user account you use to SSH to the VM

#### `RHEL_VM_SSH_KEY`
- **Description**: Private SSH key for accessing the RHEL VM
- **Format**: Complete private key including headers
- **Example**:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABFwAAAAdzc2gtcn
...
-----END OPENSSH PRIVATE KEY-----
```
- **How to get**: Your SSH private key (usually `~/.ssh/id_rsa` or similar)

### 2. **Email Configuration Secrets**

#### `EMAIL_PASSWORD`
- **Description**: Password for the email account transactions@investra.com
- **Example**: `YourSecurePassword123!`
- **Recommendation**: Use a strong, randomly generated password

#### `ADMIN_EMAIL`
- **Description**: Admin email address for SSL certificate registration
- **Example**: `admin@investra.com` or your personal email
- **Purpose**: Used for Let's Encrypt certificate notifications

---

## 🔧 How to Add Secrets to GitHub

### Step 1: Go to Repository Settings
1. Navigate to your GitHub repository
2. Click **Settings** tab
3. Go to **Secrets and variables** → **Actions**

### Step 2: Add Each Secret
Click **"New repository secret"** for each of the following:

```yaml
Name: RHEL_VM_HOST
Value: YOUR_VM_IP_ADDRESS

Name: RHEL_VM_USER  
Value: YOUR_SSH_USERNAME

Name: RHEL_VM_SSH_KEY
Value: YOUR_COMPLETE_SSH_PRIVATE_KEY

Name: EMAIL_PASSWORD
Value: YOUR_EMAIL_PASSWORD

Name: ADMIN_EMAIL
Value: YOUR_ADMIN_EMAIL
```

---

## 🔑 SSH Key Setup Guide

### If You Don't Have SSH Keys Yet:

```bash
# 1. Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "investra-email-deployment"

# 2. Copy public key to your RHEL VM
ssh-copy-id your-username@your-vm-ip

# 3. Test SSH connection
ssh your-username@your-vm-ip

# 4. Copy private key content for GitHub secret
cat ~/.ssh/id_rsa
```

### SSH Key Security Tips:
- ✅ **Use dedicated deployment key** (not your personal SSH key)
- ✅ **Restrict key permissions** on the VM if possible
- ✅ **Regularly rotate keys** for security
- ✅ **Use key passphrase** for additional security (GitHub Actions supports this)

---

## 🚀 Deployment Workflow Features

### **Automatic Setup:**
- ✅ **Docker Installation** on RHEL VM
- ✅ **Firewall Configuration** (ports 25, 587, 993, 8080)
- ✅ **SSL Certificates** with Let's Encrypt
- ✅ **Email Server Configuration** with production settings
- ✅ **Service Management** with systemd
- ✅ **Monitoring Scripts** and health checks
- ✅ **Backup System** with automated scheduling
- ✅ **Log Rotation** for maintenance

### **Production Features:**
- 🔐 **Security**: Fail2Ban, TLS encryption, firewall rules
- 📊 **Monitoring**: Health checks, port monitoring, log analysis  
- 💾 **Backup**: Daily automated backups with retention
- 🔄 **Auto-restart**: Systemd service for reliability
- 📜 **SSL**: Automatic Let's Encrypt certificates with renewal
- 🌐 **Web Interface**: Roundcube at port 8080

### **Triggered By:**
- **Automatic**: Push to main/master branch (if email-server files changed)
- **Manual**: Workflow dispatch with environment selection

---

## 📋 Pre-Deployment Checklist

### **RHEL VM Requirements:**
- [ ] **RHEL 8+ or CentOS 8+** (or compatible)
- [ ] **Root or sudo access** for the deployment user
- [ ] **Internet connectivity** for package downloads
- [ ] **Ports available**: 25, 587, 993, 8080
- [ ] **SSH access** configured and working
- [ ] **DNS domain** pointing to the VM (for SSL certificates)

### **GitHub Repository:**
- [ ] **Secrets configured** (all 5 secrets listed above)
- [ ] **Workflow file** committed to `.github/workflows/`
- [ ] **Email server files** in `/email-server/` directory
- [ ] **Repository permissions** for Actions enabled

### **Domain Configuration:**
- [ ] **Domain ownership** verified
- [ ] **DNS access** to create MX records
- [ ] **A record** pointing mail.investra.com to VM IP
- [ ] **MX record** configured (can be done after deployment)

---

## 🎯 Deployment Process

### **Manual Trigger:**
1. Go to **Actions** tab in GitHub
2. Select **"Deploy Email Server to RHEL VM"**
3. Click **"Run workflow"**
4. Choose environment (production/staging)
5. Click **"Run workflow"** button

### **Automatic Trigger:**
- Push changes to `email-server/` directory
- Workflow runs automatically on main/master branch

### **What Happens During Deployment:**
1. **VM Preparation**: Update system, install Docker
2. **Security Setup**: Configure firewall, stop conflicting services
3. **File Transfer**: Copy email server configuration
4. **SSL Certificates**: Obtain Let's Encrypt certificates
5. **Email Setup**: Configure accounts, aliases, security
6. **Service Start**: Launch Docker containers
7. **Health Check**: Verify all ports and services
8. **Monitoring Setup**: Create monitoring and backup scripts

---

## 🔍 Post-Deployment Verification

### **Check Deployment Status:**
```bash
# SSH to your VM
ssh your-username@your-vm-ip

# Check email server status
cd ~/investra-email-server
docker compose ps

# Run monitoring script
./monitor-email.sh

# Test email ports
./test-email.sh
```

### **Expected Results:**
- ✅ **Docker containers running**: mailserver and mailserver-admin
- ✅ **Ports listening**: 25, 587, 993, 8080
- ✅ **SSL certificates**: Valid Let's Encrypt certificates
- ✅ **Web interface**: Accessible at http://your-vm-ip:8080
- ✅ **Logs clean**: No critical errors in Docker logs

---

## 🆘 Troubleshooting

### **Common Issues:**

#### **SSH Connection Failed**
```bash
# Test SSH manually
ssh -i ~/.ssh/your-key your-username@your-vm-ip

# Check SSH key format in GitHub secrets
# Ensure private key includes header/footer lines
```

#### **Docker Installation Failed**
```bash
# Check RHEL version compatibility
cat /etc/redhat-release

# Verify internet connectivity
ping google.com
```

#### **Port Conflicts**
```bash
# Check what's using email ports
sudo netstat -tlnp | grep -E ':(25|587|993)'

# Stop conflicting services
sudo systemctl stop postfix sendmail
```

#### **SSL Certificate Issues**
```bash
# Check domain DNS resolution
nslookup mail.investra.com

# Test Let's Encrypt manually
sudo certbot certonly --standalone -d mail.investra.com
```

### **Workflow Debugging:**
- Check **Actions** tab for detailed logs
- Look for **red X** marks indicating failures
- Check **individual step logs** for error details
- Verify **all secrets are set** correctly

---

## 🎉 Success Indicators

### **Deployment Complete When:**
- ✅ **GitHub Action** shows green checkmark
- ✅ **Email ports** are listening (25, 587, 993)
- ✅ **Web interface** loads at http://your-vm-ip:8080
- ✅ **SSL certificates** are valid
- ✅ **Docker containers** are running healthy
- ✅ **Monitoring script** runs without errors

### **Ready for Production When:**
- ✅ **DNS MX record** points to your VM
- ✅ **Test emails** can be received
- ✅ **Wealthsimple configured** to send to transactions@investra.com
- ✅ **Investra app** can connect via IMAP
- ✅ **Backup system** is working

---

**Your email server will be production-ready with full automation, monitoring, and security! 🚀**
