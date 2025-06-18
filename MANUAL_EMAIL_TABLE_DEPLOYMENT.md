# 🗄️ MANUAL EMAIL TABLE DEPLOYMENT - STEP BY STEP

## 🎯 **Purpose**
Deploy the email configuration tables to Supabase database so the EmailConfigurationPanel can save configurations.

## 📋 **Required Steps:**

### **Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard/project/ecbuwphipphdsrqjwgfm/sql
2. Sign in if prompted
3. Open the SQL Editor

### **Step 2: Copy the SQL**
Copy the complete SQL from this file: `src/migrations/007_create_email_configuration_tables.sql`

**Quick copy command:**
```bash
cat src/migrations/007_create_email_configuration_tables.sql | pbcopy
```

### **Step 3: Execute in Supabase**
1. Paste the SQL into the Supabase SQL Editor
2. Click the **"Run"** button
3. Wait for execution to complete (should take ~10-15 seconds)
4. Check for any error messages

### **Step 4: Verify Deployment**
Run this command to verify the tables were created:
```bash
node verify-email-tables.mjs
```

**Expected Output:**
```
✅ email_configurations: Table exists and accessible
✅ email_processing_logs: Table exists and accessible
✅ email_import_rules: Table exists and accessible

📊 Database Status: 3/3 tables working
🎉 All email configuration tables are deployed and working!
```

## 🔧 **After Deployment:**

1. **Test the UI**: Go to http://localhost:5173 → Email Management → Configuration
2. **Configure Gmail**: Use transactions@investra.com + App Password
3. **Test Connection**: Should work via production API
4. **Save Configuration**: Should now save to database instead of localStorage

## 🛠️ **Troubleshooting:**

- **"relation does not exist"**: Main schema not deployed first (profiles, portfolios tables needed)
- **"permission denied"**: Make sure you're signed into the correct Supabase project
- **"already exists"**: Tables may already be created (safe to ignore)

## ✅ **Success Criteria:**
- [ ] All 3 email tables created in Supabase
- [ ] Verification script shows 3/3 tables working
- [ ] EmailConfigurationPanel saves configurations
- [ ] Configuration persists between page reloads

---

**After completing these steps, the email configuration system will be fully functional!**
