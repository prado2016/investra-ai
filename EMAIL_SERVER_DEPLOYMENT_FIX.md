# 🔧 Email Server Deployment Fix - SSH Configuration Issues

## Problem Identified

The email server deployment was failing during the SSH setup phase with the error:
```
ssh-keyscan -H *** >> ~/.ssh/known_hosts
```

The `***` indicates that the GitHub secret `RHEL_HOST` was not being resolved properly.

## Root Cause

1. **Dynamic Secret References**: The workflow uses dynamic secret references like `${{ secrets[needs.determine-environment.outputs.vm-host-secret] }}` 
2. **Missing or Empty Secrets**: The secrets `RHEL_HOST`, `RHEL_USER`, `RHEL_SSH_KEY` may not exist or are empty
3. **Hardcoded Secret Names**: Some parts of the workflow still used hardcoded `${{ secrets.RHEL_HOST }}` instead of dynamic references

## Fixes Applied

### 1. Enhanced Error Handling
- Added validation to check if secrets exist and are not empty
- Added debug information to show which secrets are being used
- Improved error messages to help identify missing secrets

### 2. Consistent Variable Usage
- Fixed all SSH commands to use variables instead of direct secret references
- Ensured all secret references use the dynamic pattern consistently
- Added connection variable setup for all SSH operations

### 3. Better Debugging
- Added a debug step that shows environment and secret information
- Added descriptive echo messages for each deployment step
- Improved error reporting when secrets are missing

## Required GitHub Secrets

Make sure these secrets are configured in your GitHub repository:

### For All Environments:
- `RHEL_HOST` - The IP address or hostname of your RHEL VM
- `RHEL_USER` - The username to connect to the RHEL VM  
- `RHEL_SSH_KEY` - The private SSH key for connecting to the RHEL VM
- `ADMIN_EMAIL` - Email address for SSL certificate registration

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

✅ SSH key setup completed
🔍 Adding host '192.168.1.100' to known_hosts...
✅ Host key added successfully
```

## Next Steps

1. **Verify Secrets**: Check all GitHub secrets are properly configured
2. **Test Deployment**: Run the workflow to test the fixes
3. **Monitor Output**: Look for the debug information to confirm secrets are being loaded
4. **SSH Access**: Ensure your SSH key has access to the RHEL VM

The workflow should now provide much clearer error messages if any secrets are missing or incorrectly configured.
