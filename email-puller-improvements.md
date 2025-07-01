# Email-Puller Service Improvements

## 1. Improve Password Handling in imap-client.ts

**Current Issue**: The fallback logic only works if the email matches `process.env.IMAP_USERNAME`, which is too restrictive.

**Recommended Fix**: Update lines 54-64 in `email-puller/src/imap-client.ts`:

```typescript
} catch (decryptError) {
  // Check if this might be a plain text password (Gmail app passwords are 16 lowercase letters)
  const plainTextPattern = /^[a-z]{16}$/;
  if (plainTextPattern.test(this.config.encrypted_app_password)) {
    password = this.config.encrypted_app_password;
    logger.warn(`Using plain text password for ${this.config.gmail_email} - consider encrypting it`);
  } else {
    // Fallback to environment variable for development/setup
    const envPassword = process.env.IMAP_PASSWORD;
    if (envPassword && this.config.gmail_email === process.env.IMAP_USERNAME) {
      password = envPassword;
      logger.warn(`Decryption failed for ${this.config.gmail_email}, using environment variable`);
    } else {
      logger.error(`Decryption failed and no fallback available for ${this.config.gmail_email}`);
      throw decryptError;
    }
  }
}
```

## 2. Add Database Schema Validation

**Issue**: Missing columns in `imap_processed` table cause insertion failures.

**Fix**: Add schema validation on startup to ensure required columns exist.

## 3. Frontend Sync Request Polling Fix

**Issue**: Frontend shows "timeout" because it can't read sync request status due to RLS policies.

**Options**:
- A) Create API endpoint that uses service role key to check sync status
- B) Update RLS policies to allow authenticated users to read their own sync requests
- C) Use a different polling mechanism

## 4. Monitoring and Alerting

**Add**:
- Health check endpoint for email-puller service
- Monitoring for processing times > 5 minutes
- Alerts when service restart count > 10 in 24 hours

## 5. Configuration Management

**Improve**:
- Auto-encrypt plain text passwords when they're detected
- Validation for Gmail app password format
- Better error messages for configuration issues