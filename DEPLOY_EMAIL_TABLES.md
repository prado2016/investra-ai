# 🚀 Manual Database Deployment Instructions

## Quick Deployment Steps

### 1. Open Supabase SQL Editor
**URL**: https://supabase.com/dashboard/project/ecbuwphipphdsrqjwgfm/sql

### 2. Copy the Email Configuration SQL
The complete SQL migration is in: `src/migrations/007_create_email_configuration_tables.sql`

**Quick copy command:**
```bash
# Copy to clipboard (macOS)
cat src/migrations/007_create_email_configuration_tables.sql | pbcopy
```

### 3. Execute in Supabase
1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** button
3. Wait for execution to complete
4. Check for any error messages

### 4. Verify Deployment
```bash
# Run verification script
node verify-email-tables.mjs
```

### 5. Expected Results
After successful deployment, you should see:
- ✅ `email_configurations` table created
- ✅ `email_processing_logs` table created  
- ✅ `email_import_rules` table created
- ✅ All RLS policies enabled
- ✅ Performance indexes created
- ✅ Triggers for auto-updating timestamps

## 🔍 Troubleshooting

### Common Issues:
1. **"relation does not exist"** - Make sure main schema is deployed first
2. **"permission denied"** - Check you're logged into the correct Supabase project
3. **"already exists"** - Tables may already be created (safe to ignore)

### Prerequisites:
- Main database schema must be deployed first (`profiles`, `portfolios` tables)
- User must be authenticated in Supabase dashboard

## 📊 What Gets Created

### Tables:
- **email_configurations** (8.4KB SQL) - User email settings
- **email_processing_logs** (3.2KB SQL) - Processing history
- **email_import_rules** (2.8KB SQL) - Automation rules

### Security:
- Row Level Security (RLS) policies for all tables
- User isolation (users can only see their own data)
- System access for automated processing

### Performance:
- 12 database indexes for fast queries
- Auto-updating timestamp triggers
- Optimized foreign key relationships

---

**After deployment, continue with service layer implementation in `src/services/emailConfigurationService.ts`**
