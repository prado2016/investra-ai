# Email System Database Migration Instructions

## Overview
This document provides instructions for setting up the new simplified email system database tables in Supabase.

## Database Connection Verified ✅
- **Supabase URL**: `https://ecbuwhpipphdssqjwgfm.supabase.co`
- **Connection Status**: Successfully tested with existing credentials
- **Current Tables**: Verified access to existing `profiles` table

## Required Action: Manual SQL Execution

Since DDL (Data Definition Language) statements cannot be executed through the Supabase JavaScript client for security reasons, these SQL statements must be run manually through the Supabase dashboard.

### Steps to Execute Migration:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Navigate to your project: `ecbuwhpipphdssqjwgfm`

2. **Access SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Create a new query

3. **Execute Migration SQL**
   - Copy and paste the complete SQL from: `src/migrations/009_create_simplified_email_tables.sql`
   - Execute the query

### Alternative: Use Supabase CLI

If you have Supabase CLI installed:

```bash
# Run the migration file
supabase db push --file src/migrations/009_create_simplified_email_tables.sql
```

## Tables That Will Be Created

### 1. `imap_inbox`
- **Purpose**: Store raw emails pulled from Gmail via IMAP
- **Key Fields**: `message_id`, `subject`, `from_email`, `content`, `status`
- **Security**: RLS enabled, users can only see their own emails

### 2. `imap_processed` 
- **Purpose**: Store emails that have been manually reviewed
- **Key Fields**: `processing_result`, `transaction_id`, `rejection_reason`
- **Workflow**: Emails move here after approval/rejection

### 3. `imap_configurations`
- **Purpose**: Store user IMAP settings for Gmail integration
- **Key Fields**: `gmail_email`, `encrypted_app_password`, `sync_status`
- **Security**: Passwords are encrypted, RLS enforced

## Features Included

### Indexes for Performance
- Optimized queries for user data retrieval
- Fast lookups by email status and received date
- Efficient transaction linking

### Row Level Security (RLS)
- Users can only access their own email data
- System service can insert new emails
- Secure user isolation

### Helper Functions
- `move_email_to_processed()`: Safely moves emails between tables
- Automatic timestamp updates
- Transaction support for data integrity

### Triggers
- Automatic `updated_at` timestamp maintenance
- Consistent data handling

## Verification Steps

After running the migration, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('imap_inbox', 'imap_processed', 'imap_configurations');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('imap_inbox', 'imap_processed', 'imap_configurations');

-- Test insert permissions (should work)
INSERT INTO imap_configurations (user_id, gmail_email, encrypted_app_password) 
VALUES ('test-user-id', 'test@gmail.com', 'encrypted-password-here');
```

## Migration File Location
- **File**: `src/migrations/009_create_simplified_email_tables.sql`
- **Size**: ~15KB
- **Estimated Execution Time**: 1-2 minutes

## Support
If you encounter any issues during migration:
1. Check Supabase dashboard for error messages
2. Verify PostgreSQL version compatibility (12+)
3. Ensure you have sufficient database permissions
4. Contact the development team for assistance

## Next Steps After Migration
1. ✅ Database tables created
2. 🔄 Build standalone email puller application
3. 🔄 Create new UI components
4. 🔄 Test end-to-end workflow