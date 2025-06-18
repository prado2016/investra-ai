# 🔐 SSH Key Setup Guide for Email Server Deployment

## Problem Identified

The deployment is failing with the error:
```
/home/runner/.ssh/id_rsa is not a public key file.
❌ Invalid SSH key format
```

This indicates that the SSH key stored in your GitHub secret `RHEL_SSH_KEY` is either:
1. **Not a private key** (might be a public key instead)
2. **Incorrectly formatted** (missing headers/footers)
3. **Corrupted or truncated** during copy/paste
4. **Wrong key type** (unsupported format)

## How to Fix the SSH Key

### Step 1: Generate a Proper SSH Key Pair

If you don't have a valid SSH key pair, generate one:

```bash
# Generate a new SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/investra_rsa -N ""

# This creates:
# ~/.ssh/investra_rsa (private key) 
# ~/.ssh/investra_rsa.pub (public key)
```

### Step 2: Identify Your Private Key

Your **private key** should look like this:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA... (long string of characters)
...multiple lines of encoded data...
-----END RSA PRIVATE KEY-----
```

Or for newer OpenSSH format:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAA...
...multiple lines of encoded data...
-----END OPENSSH PRIVATE KEY-----
```

### Step 3: Copy the Correct Key to GitHub Secrets

1. **Display your private key**:
   ```bash
   cat ~/.ssh/investra_rsa
   ```

2. **Copy the ENTIRE output** including the `-----BEGIN` and `-----END` lines

3. **Add to GitHub Secrets**:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `RHEL_SSH_KEY`
   - Value: Paste the entire private key content

### Step 4: Install Public Key on Your RHEL Server

1. **Copy the public key to your server**:
   ```bash
   # Method 1: Using ssh-copy-id (if you have password access)
   ssh-copy-id -i ~/.ssh/investra_rsa.pub user@your-rhel-server

   # Method 2: Manual copy
   cat ~/.ssh/investra_rsa.pub | ssh user@your-rhel-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```

2. **Set proper permissions on the server**:
   ```bash
   ssh user@your-rhel-server "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
   ```

## Common SSH Key Mistakes

### ❌ Wrong: Using Public Key in Secret
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... user@host
```
This is a **public key** - it won't work for authentication.

### ❌ Wrong: Truncated Private Key
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(missing content)
```

### ❌ Wrong: Missing Headers
```
MIIEpAIBAAKCAQEA7h8... (starts without -----BEGIN)
```

### ✅ Correct: Complete Private Key
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA7h8v8B5z9Gf2K1L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9
C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7E8F9G0H1
...many more lines of base64 encoded data...
I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B1C2D3E4F5G6H7I8J9K0L1M2N3
-----END RSA PRIVATE KEY-----
```

## Testing Your SSH Key

### Test 1: Validate Key Format Locally
```bash
# Test if your private key is valid
ssh-keygen -l -f ~/.ssh/investra_rsa

# Should output something like:
# 4096 SHA256:abc123... user@host (RSA)
```

### Test 2: Test SSH Connection
```bash
# Test connection to your RHEL server
ssh -i ~/.ssh/investra_rsa user@your-rhel-server "echo 'SSH connection successful'"
```

### Test 3: Verify GitHub Secret
After updating the GitHub secret, the deployment should show:
```
✅ SSH private key detected
✅ SSH key setup completed
✅ SSH connection test passed
```

## Required GitHub Secrets Checklist

Make sure you have all these secrets configured:

- ✅ **RHEL_HOST** - IP address or hostname of your RHEL server
- ✅ **RHEL_USER** - Username for SSH connection (e.g., `root`, `lab`, etc.)
- ✅ **RHEL_SSH_KEY** - Complete private SSH key (with BEGIN/END lines)
- ✅ **EMAIL_PASSWORD** - Password for the email account
- ✅ **ADMIN_EMAIL** - Email address for SSL certificate registration

## Troubleshooting

### Issue: "Permission denied (publickey)"
**Cause**: Public key not installed on server or wrong username
**Solution**: 
1. Verify `RHEL_USER` is correct
2. Install public key on server using `ssh-copy-id`

### Issue: "Connection refused"
**Cause**: Server not accessible or SSH service not running
**Solution**:
1. Check if server is running: `ping your-rhel-server`
2. Check SSH service: `ssh user@your-rhel-server`

### Issue: "Invalid key format"
**Cause**: Wrong key type or corrupted key
**Solution**:
1. Generate new key pair
2. Ensure you're copying the private key (not public)
3. Copy the entire key including headers

## Next Steps

After fixing the SSH key:

1. **Update GitHub Secret**: Replace `RHEL_SSH_KEY` with correct private key
2. **Test Deployment**: Run the workflow again
3. **Monitor Debug Output**: Look for the new debug information
4. **Verify Connection**: The workflow will test SSH connection automatically

The enhanced workflow will now provide detailed debugging information to help identify any remaining issues with your SSH configuration.
