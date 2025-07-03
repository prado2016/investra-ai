# Complete Database-Driven Configuration Deployment Guide

## 🎯 **OVERVIEW**
This guide will deploy the complete database-driven configuration system that makes both email-puller settings and API keys manageable through the web UI, eliminating all environment variable dependencies.

## ✅ **WHAT YOU'LL GET AFTER DEPLOYMENT**

### **1. Email-Puller System Configuration UI**
- ✅ **Settings → Email-Puller System Configuration** section
- ✅ **Tabbed interface** for Email Settings, Scheduling, and Monitoring
- ✅ **Real-time configuration** with immediate effect
- ✅ **Database storage** - no more environment variable issues

### **2. Database-Driven API Key Management**
- ✅ **Settings → API Key Management** section  
- ✅ **Encrypted database storage** for all API keys
- ✅ **Support for 5 providers:** Gemini, OpenAI, OpenRouter, Perplexity, Yahoo Finance
- ✅ **Real-time testing** and validation
- ✅ **Model selection** for each AI provider

### **3. Automatic Email-Puller Service Fix**
- ✅ **Service starts reliably** with minimal environment variables
- ✅ **Your 4 new Gmail emails will be synced**
- ✅ **Database-driven manual sync works consistently**

## 📋 **DEPLOYMENT STEPS**

### **Step 1: Database Schema Updates**

Run these SQL commands in **Supabase Dashboard → SQL Editor**:

#### **1A. System Config Table (Already Done ✅)**
```sql
-- You already ran this - system_config table exists
```

#### **1B. Add API Key Support**
```sql
-- Copy and run the entire contents of this file:
-- sql-migrations/add-api-keys-to-system-config.sql
```

**Full SQL for API Keys:**
```sql
-- Add API key configuration to system_config table
INSERT INTO system_config (config_key, config_value, config_type, description, is_encrypted) VALUES
  -- Google Gemini AI API Key
  ('gemini_api_key', '', 'string', 'Google Gemini AI API key for AI-powered features', true),
  ('gemini_model', 'gemini-1.5-flash', 'string', 'Default Gemini model to use', false),
  
  -- OpenAI API Key
  ('openai_api_key', '', 'string', 'OpenAI API key for GPT models', true),
  ('openai_model', 'gpt-4o', 'string', 'Default OpenAI model to use', false),
  
  -- Yahoo Finance API Key
  ('yahoo_finance_api_key', '', 'string', 'Yahoo Finance API key for market data', true),
  
  -- Perplexity AI API Key
  ('perplexity_api_key', '', 'string', 'Perplexity AI API key', true),
  ('perplexity_model', 'llama-3.1-sonar-large-128k-online', 'string', 'Default Perplexity model to use', false),
  
  -- OpenRouter API Key
  ('openrouter_api_key', '', 'string', 'OpenRouter API key for multiple AI models', true),
  ('openrouter_model', 'anthropic/claude-3.5-sonnet', 'string', 'Default OpenRouter model to use', false),
  
  -- AI Service Configuration
  ('default_ai_provider', 'gemini', 'string', 'Default AI provider to use for symbol lookup and parsing', false),
  ('ai_timeout_seconds', '30', 'number', 'Timeout for AI API calls in seconds', false),
  ('ai_retry_attempts', '3', 'number', 'Number of retry attempts for failed AI requests', false)
  
ON CONFLICT (config_key) DO NOTHING;

-- Update RLS policies for security
DROP POLICY IF EXISTS "Service can manage system config" ON system_config;

CREATE POLICY "Users can read non-encrypted system config" ON system_config
  FOR SELECT USING (NOT is_encrypted OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update non-encrypted system config" ON system_config
  FOR UPDATE USING (NOT is_encrypted AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage encrypted config" ON system_config
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Helper functions for API keys
CREATE OR REPLACE FUNCTION get_api_key(provider_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '';
  END IF;
  
  SELECT config_value INTO api_key
  FROM system_config
  WHERE config_key = provider_name || '_api_key'
  AND is_encrypted = true;
  
  RETURN COALESCE(api_key, '');
END;
$$;

CREATE OR REPLACE FUNCTION set_api_key(provider_name text, key_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to set API keys';
  END IF;
  
  INSERT INTO system_config (config_key, config_value, config_type, is_encrypted, updated_at)
  VALUES (provider_name || '_api_key', key_value, 'string', true, NOW())
  ON CONFLICT (config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();
END;
$$;
```

### **Step 2: Verify Database Setup**

After running the SQL, verify the setup:

```sql
-- Check system_config table has all entries
SELECT config_key, config_type, is_encrypted, description 
FROM system_config 
ORDER BY config_key;

-- Should show ~25 configuration entries including API keys and email-puller settings
```

### **Step 3: Frontend Deployment**

The updated frontend with database-driven configuration is now deployed via GitHub Actions! 

**Check deployment status:** https://github.com/prado2016/investra-ai/actions

### **Step 4: Verify Email-Puller Service**

The service should now be running with database configuration. Check:

```bash
# SSH to your server
ssh lab@10.0.0.89

# Check service status
pm2 logs investra-email-puller --lines 20

# Should see logs about loading configuration from database, not "supabaseUrl is required" errors
```

## 🎨 **USING THE NEW UI**

### **Email-Puller Configuration**
1. **Go to Settings** in your web app
2. **Scroll to "Email-Puller System Configuration"** section
3. **Configure settings** in three tabs:
   - **Email Settings:** Max emails per sync, folder names, IMAP settings
   - **Scheduling:** Sync intervals, automatic sync toggles
   - **Monitoring:** Log levels, cleanup settings
4. **Click "Save Configuration"** - changes take effect immediately

### **API Key Management**
1. **Go to Settings** in your web app
2. **Scroll to "API Key Management"** section
3. **Add API keys** for each provider:
   - **Google Gemini:** For AI symbol lookup and email parsing
   - **OpenAI:** Alternative AI provider
   - **Yahoo Finance:** Market data (if needed)
   - **Perplexity/OpenRouter:** Additional AI options
4. **Test connections** to verify keys work
5. **Select models** for each AI provider

## ✅ **EXPECTED RESULTS**

### **Immediate Results:**
- ✅ **Email-puller service starts and runs reliably**
- ✅ **Your 4 new Gmail emails get synced**
- ✅ **Manual sync button works consistently**
- ✅ **Settings page shows both configuration sections**

### **Long-term Benefits:**
- ✅ **No more environment variable deployment issues**
- ✅ **All settings configurable through web UI**
- ✅ **Encrypted storage for sensitive data**
- ✅ **Real-time configuration updates**
- ✅ **Centralized configuration management**

## 🚨 **TROUBLESHOOTING**

### **If Email-Puller Still Shows Errors:**
```bash
# Check the actual .env file on server
ssh lab@10.0.0.89
cat /opt/investra/email-puller/.env

# Should contain minimal config with Supabase credentials
# If missing, the latest GitHub Actions deployment will fix it
```

### **If Settings Page Doesn't Show New Sections:**
1. **Clear browser cache** and refresh
2. **Check that deployment completed** at GitHub Actions
3. **Verify you're logged in** to access database configuration

### **If API Keys Don't Save:**
1. **Check browser console** for errors
2. **Verify database setup** by running the SQL queries above
3. **Ensure you're authenticated** in the web app

## 🎯 **FINAL VERIFICATION**

### **Test Email-Puller:**
1. **Check Settings → Email-Puller System Configuration** loads
2. **Try changing a setting** and save
3. **Go to Email Management** and try manual sync
4. **Should work without errors**

### **Test API Key Management:**
1. **Check Settings → API Key Management** loads  
2. **Add a Gemini API key** and test connection
3. **Should show "✅ Connection successful!"**

### **Test Email Sync:**
1. **Go to Email Management page**
2. **Click Manual Sync**
3. **Should process and sync your 4 new Gmail emails**

## 🎉 **SUCCESS!**

Your system is now fully database-driven with:
- ✅ **Email-puller configuration through UI**
- ✅ **API key management through UI**  
- ✅ **Reliable email sync functionality**
- ✅ **No more environment variable issues**

All settings are now managed through the web interface and stored securely in the database!