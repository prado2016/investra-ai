# Supabase Database Setup Instructions

## Overview
This guide will help you set up the database schema for the Stock Tracker application in your Supabase project.

## Prerequisites
- Supabase account and project created (✅ Done)
- Project URL and API key configured (✅ Done)

## Step 1: Create Database Schema

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to your project**: `ecbuwphipphdsrqjwgfm`
3. **Go to SQL Editor** (Database → SQL Editor)
4. **Run the schema creation script**:

Copy and paste the contents of `/src/lib/database/schema.sql` into the SQL Editor and click "Run".

This will create:
- `profiles` table (user profile data)
- `portfolios` table (user portfolios)
- `assets` table (stock/asset metadata)
- `positions` table (current holdings)
- `transactions` table (buy/sell records)
- `price_data` table (price history cache)
- Indexes for performance
- Triggers for auto-updating timestamps

## Step 2: Enable Row Level Security

1. **In the same SQL Editor**, run the RLS policies script:

Copy and paste the contents of `/src/lib/database/rls_policies.sql` and click "Run".

This will:
- Enable RLS on all tables
- Create policies ensuring users can only access their own data
- Allow public read access to assets and price data

## Step 3: Verify Setup

1. **Go to Database → Tables** in your Supabase dashboard
2. **Verify these tables exist**:
   - profiles
   - portfolios
   - positions
   - transactions
   - assets
   - price_data

3. **Check Authentication** (optional):
   - Go to Authentication → Users
   - Create a test user if needed

## Step 4: Test Connection

The application should now be able to connect to your database. The SupabaseConnectionTest component will verify the connection is working.

## Next Steps

After completing these steps:
1. Mark subtask 16.2 (Database Schema) as complete
2. Move to subtask 16.3 (Row Level Security) - Already implemented!
3. Continue with subtask 16.4 (Client Configuration)

## Troubleshooting

**Common Issues:**
- **Permission denied**: Make sure you're signed in to Supabase and have access to the project
- **SQL errors**: Copy the exact SQL from the files - don't modify it
- **RLS issues**: Make sure to run both schema.sql AND rls_policies.sql

**Need Help?**
- Check the Supabase documentation: https://supabase.com/docs
- Review the SQL files for any syntax issues
- Test the connection using the app's test component
