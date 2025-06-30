# GitHub Secrets Setup for Email-Puller Deployment

## 🔐 Required GitHub Repository Secrets

To fix the email-puller deployment permanently, you need to add these secrets to your GitHub repository:

### **1. Go to GitHub Repository Settings:**
- Navigate to: https://github.com/prado2016/investra-ai/settings/secrets/actions
- Click "New repository secret"

### **2. Add these secrets:**

**Secret Name:** `VITE_SUPABASE_URL`  
**Value:** `https://ecbuwhpipphdssqjwgfm.supabase.co`

**Secret Name:** `VITE_SUPABASE_ANON_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E`

**Secret Name:** `EMAIL_ENCRYPTION_KEY`  
**Value:** `abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890`

## ✅ **After Adding Secrets:**

1. **Trigger new deployment:** Push any small change to trigger GitHub Actions
2. **Verify deployment:** Check that email-puller starts without "supabaseUrl is required" error
3. **Test manual sync:** Your database-driven manual sync should work consistently

## 🔧 **Immediate Fix (Without Waiting for Deployment):**

Run this command to fix the current server immediately:
```bash
./update-server-email-puller.sh
```

## 🎯 **Why This Fixes the Recurring Issue:**

Your database-driven manual sync implementation is correct and works great! The problem was that the email-puller service keeps crashing due to missing environment variables, so there's no service running to process the sync requests from the database.

Once the email-puller service runs consistently with proper environment variables, your existing database-driven sync implementation will work reliably.