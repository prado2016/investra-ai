# 🔧 Fix Your SSH Key Format

## Problem Identified

Your SSH key is base64 encoded but missing the proper OpenSSH headers. The workflow detected:
- Starts with: `b3BlbnNzaC1rZXktdjE` (base64 for "openssh-key-v1")
- Missing: `-----BEGIN OPENSSH PRIVATE KEY-----` header
- Missing: `-----END OPENSSH PRIVATE KEY-----` footer

## Quick Fix

Your current SSH key in GitHub secret `RHEL_SSH_KEY` should be updated to this format:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAA
(your existing base64 content here - multiple lines)
FFc3yaB14m1M6AAAAE2VkdWFyZG9ATWFjQm9vay1Qcm8BAg==
-----END OPENSSH PRIVATE KEY-----
```

## Steps to Fix

### Option 1: Let the Workflow Fix It (Easiest)
The updated workflow will now automatically detect and fix this format. Just run the deployment again.

### Option 2: Manual Fix
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Edit the `RHEL_SSH_KEY` secret
3. Add the headers to your existing content:

**Before (current):**
```
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAA
(your base64 content)
FFc3yaB14m1M6AAAAE2VkdWFyZG9ATWFjQm9vay1Qcm8BAg==
```

**After (fixed):**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAA
(your base64 content)
FFc3yaB14m1M6AAAAE2VkdWFyZG9ATWFjQm9vay1Qcm8BAg==
-----END OPENSSH PRIVATE KEY-----
```

## Alternative: Generate New SSH Key

If you want to start fresh with a new SSH key:

1. **Generate new key:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/investra_key -N ""
   ```

2. **Copy private key to GitHub secret:**
   ```bash
   cat ~/.ssh/investra_key
   ```
   Copy the entire output (including headers) to `RHEL_SSH_KEY`

3. **Install public key on your RHEL server:**
   ```bash
   ssh-copy-id -i ~/.ssh/investra_key.pub user@your-rhel-server
   ```

## Test the Fix

After updating the secret, run the deployment again. You should see:
```
🔧 Detected base64 OpenSSH key without headers - fixing format...
✅ SSH key format fixed
✅ SSH key setup completed
🔐 Testing SSH connection to user@host
✅ SSH connection test passed
```

## Why This Happened

This commonly occurs when:
1. Using `ssh-keygen` with newer OpenSSH versions
2. Copying only the base64 content without headers
3. Using certain SSH key management tools that strip headers

The updated workflow now handles this automatically, so future deployments should work without manual intervention.
