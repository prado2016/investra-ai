# 🔧 Email Server Deployment Fix - SSH Configuration Issues

## Pro3. Verify these secrets exist and have valid values:
   - ✅ `RHEL_HOST` (should be IP address like `192.168.1.100`)
   - ✅ `RHEL_USER` (should be username like `root` or `lab`)
   - ✅ `RHEL_SSH_KEY` (should be **private key** starting with `-----BEGIN`)
   - ✅ `EMAIL_PASSWORD` (should be the email account password)
   - ✅ `ADMIN_EMAIL` (should be a valid email address)

> **📝 SSH Key Format Check**: Your private key should look like:
> ```
> -----BEGIN RSA PRIVATE KEY-----
> MIIEpAIBAAKCAQEA...
> (many lines of base64 data)
> -----END RSA PRIVATE KEY-----
> ```
> 
> **❌ NOT** like this (public key):
> ```
> ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... user@host
> ```dentified

The email server deployment was failing during the SSH setup phase with the error:
```
/home/runner/.ssh/id_rsa is not a public key file.
❌ Invalid SSH key format
```

This indicates that the SSH key stored in your GitHub secret `RHEL_SSH_KEY` is either:
1. **Not a private key** (might be a public key instead)  
2. **Incorrectly formatted** (missing headers/footers)
3. **Corrupted or truncated** during copy/paste
4. **Wrong key type** (unsupported format)

## Root Cause

1. **SSH Key Format Issue**: The primary issue is that the SSH key in your GitHub secret is not a valid private key
2. **Dynamic Secret References**: The workflow uses dynamic secret references like `${{ secrets[needs.determine-environment.outputs.vm-host-secret] }}` 
3. **Missing or Empty Secrets**: Some secrets may not exist or are empty
4. **Hardcoded Secret Names**: Some parts of the workflow had hardcoded secret references

## Fixes Applied

### 1. Enhanced SSH Key Validation
- Added detailed SSH key format validation and debugging
- Improved error messages to identify specific SSH key issues
- Added fallback validation for different key formats
- Added SSH connection testing to verify key functionality

### 2. Enhanced Error Handling
- Added validation to check if secrets exist and are not empty
- Added debug information to show which secrets are being used
- Improved error messages to help identify missing secrets

### 3. Consistent Variable Usage
- Fixed all SSH commands to use variables instead of direct secret references
- Ensured all secret references use the dynamic pattern consistently
- Added connection variable setup for all SSH operations

### 4. Better Debugging
- Added a debug step that shows environment and secret information
- Added descriptive echo messages for each deployment step
- Improved error reporting when secrets are missing

## Required GitHub Secrets

Make sure these secrets are configured in your GitHub repository:

### For All Environments:
- `RHEL_HOST` - The IP address or hostname of your RHEL VM
- `RHEL_USER` - The username to connect to the RHEL VM  
- `RHEL_SSH_KEY` - **The complete private SSH key** (not public key!)
- `ADMIN_EMAIL` - Email address for SSL certificate registration

> **⚠️ CRITICAL**: `RHEL_SSH_KEY` must be a **private key** starting with `-----BEGIN RSA PRIVATE KEY-----` or `-----BEGIN OPENSSH PRIVATE KEY-----`

### Environment-Specific:
- `EMAIL_PASSWORD` - Production email password
- `STAGING_EMAIL_PASSWORD` - Staging email password  
- `DEV_EMAIL_PASSWORD` - Development email password

## How to Check Your Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Verify these secrets exist and have valid values:
   - ✅ `RHEL_HOST` (should be IP address like `192.168.1.100`)
   - ✅ `RHEL_USER` (should be username like `root` or `lab`)
   - ✅ `RHEL_SSH_KEY` (should be private SSH key starting with `-----BEGIN`)
   - ✅ `EMAIL_PASSWORD` (should be the email account password)
   - ✅ `ADMIN_EMAIL` (should be a valid email address)

## Test the Fix

1. **Check Secrets**: Verify all required secrets are configured
2. **Run Workflow**: Trigger the deployment workflow again
3. **Review Debug Output**: Look for the new debug information in the logs
4. **Check SSH Connection**: The new error handling will show exactly which secret is missing

## Common Issues and Solutions

### Issue: SSH Key Format Error
```bash
❌ Invalid SSH key format
```
**Solution**: Ensure `RHEL_SSH_KEY` contains a valid private key in OpenSSH format

### Issue: Empty Secret Error  
```bash
❌ SSH key secret 'RHEL_SSH_KEY' is empty or doesn't exist
```
**Solution**: Add the missing secret in GitHub repository settings

### Issue: Connection Timeout
```bash
ssh: connect to host *** port 22: Connection timed out
```
**Solution**: Verify `RHEL_HOST` is correct and the VM is accessible

## Verification Steps

After the fixes, the deployment should show:
```
=== Environment Debug Information ===
Environment: production
Hostname: mail.investra.com
VM Host Secret Name: RHEL_HOST
VM User Secret Name: RHEL_USER
VM Key Secret Name: RHEL_SSH_KEY
=== End Debug ===

🔍 Debugging SSH key format...
First few characters of SSH key:
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
Last few characters of SSH key:
...END RSA PRIVATE KEY-----

✅ SSH private key detected
✅ SSH key setup completed
🔍 Adding host '192.168.1.100' to known_hosts...
✅ Host key added successfully
🔐 Testing SSH connection to user@192.168.1.100
✅ SSH connection test passed
```

## Next Steps

1. **Fix SSH Key**: Follow the detailed guide in `SSH_KEY_SETUP_GUIDE.md` to set up your SSH key correctly
2. **Verify Secrets**: Check all GitHub secrets are properly configured
3. **Test Deployment**: Run the workflow to test the fixes
4. **Monitor Output**: Look for the debug information to confirm secrets are being loaded
5. **SSH Access**: Ensure your SSH key has access to the RHEL VM

The workflow now provides comprehensive debugging and will clearly identify whether the issue is with the SSH key format, missing secrets, or server connectivity.
