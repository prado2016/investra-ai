# GitHub Repository Secrets Configuration

## 🔐 Required Secrets for GitHub Actions

To fix the deployment workflow, you need to configure these secrets in your GitHub repository settings:

**Go to**: `Settings → Secrets and variables → Actions → Repository secrets`

### Critical Supabase Secrets (Required)
```
Name: SUPABASE_URL
Value: https://ecbuwhpipphdssqjwgfm.supabase.co

Name: SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNycWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E

Name: SUPABASE_SERVICE_KEY
Value: [Your Supabase service role key - get from Supabase dashboard]
```

### Email Configuration Secrets (Optional but recommended)
```
Name: EMAIL_HOST
Value: localhost

Name: EMAIL_PORT
Value: 587

Name: EMAIL_USER
Value: test@investra.com

Name: EMAIL_PASSWORD
Value: placeholder

Name: IMAP_HOST
Value: localhost

Name: IMAP_PORT
Value: 993

Name: IMAP_USER
Value: test@investra.com

Name: IMAP_PASSWORD
Value: placeholder

Name: IMAP_SECURE
Value: true

Name: IMAP_ENABLED
Value: true
```

### Database Configuration Secrets (Optional)
```
Name: DATABASE_URL
Value: postgresql://localhost:5432/investra

Name: LOG_LEVEL
Value: info
```

## 🚀 How to Add Secrets

1. **Go to your GitHub repository**
2. **Click Settings tab**
3. **Go to Secrets and variables → Actions**
4. **Click "New repository secret"**
5. **Add each secret with the exact name and value listed above**

## ✅ Verification

After adding the secrets, the GitHub Actions workflow should:
1. ✅ Pass environment variable validation
2. ✅ Successfully deploy the PM2 service
3. ✅ Start the API server with proper Supabase authentication
4. ✅ Return authentication errors instead of 500 errors

## 🔧 Quick Test

Once secrets are added, you can test by:
1. **Push a commit to main branch**
2. **Check GitHub Actions tab for deployment status**
3. **Verify production API responds correctly**

The deployment will now work correctly with proper environment variable handling!
