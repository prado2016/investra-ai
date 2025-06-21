# Supabase Email Tables Setup Instructions

This guide will help you create the necessary database tables for the simplified email import system.

## Prerequisites
- Access to your Supabase dashboard
- Project: `ecbuwhpipphdssqjwgfm.supabase.co`

## Step-by-Step Setup

### 1. Access Supabase SQL Editor
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Navigate to your project: `ecbuwhpipphdssqjwgfm`
4. Click on **"SQL Editor"** in the left sidebar

### 2. Create Email Tables
Copy and paste the entire SQL script below into the SQL Editor, then click **"Run"**:

```sql
-- Simplified Email System Tables for Investra AI
-- Redesigned email architecture with standalone IMAP puller and manual review

-- =====================================================
-- IMAP INBOX TABLE - Raw emails from IMAP puller
-- =====================================================
CREATE TABLE IF NOT EXISTS public.imap_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Email Identification
  message_id VARCHAR(500) UNIQUE NOT NULL,
  thread_id VARCHAR(500),
  
  -- Email Headers
  subject TEXT,
  from_email VARCHAR(500),
  from_name VARCHAR(500),
  to_email VARCHAR(500),
  reply_to VARCHAR(500),
  received_at TIMESTAMP WITH TIME ZONE,
  
  -- Email Content
  raw_content TEXT,
  text_content TEXT,
  html_content TEXT,
  
  -- Metadata
  attachments_info JSONB DEFAULT '[]'::jsonb,
  email_size INTEGER,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  
  -- Processing Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'error')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- IMAP PROCESSED TABLE - Completed emails
-- =====================================================
CREATE TABLE IF NOT EXISTS public.imap_processed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Reference to original inbox email
  original_inbox_id UUID,
  message_id VARCHAR(500) NOT NULL,
  subject TEXT,
  from_email VARCHAR(500),
  received_at TIMESTAMP WITH TIME ZONE,
  
  -- Processing Results
  processing_result VARCHAR(20) CHECK (processing_result IN ('approved', 'rejected')),
  transaction_id UUID REFERENCES public.transactions(id),
  rejection_reason TEXT,
  
  -- Processing Details
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by_user_id UUID REFERENCES public.profiles(id),
  processing_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- IMAP CONFIGURATIONS TABLE - IMAP settings per user
-- =====================================================
CREATE TABLE IF NOT EXISTS public.imap_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuration Details
  name VARCHAR(255) DEFAULT 'Gmail Import',
  gmail_email VARCHAR(500) NOT NULL,
  encrypted_app_password TEXT NOT NULL, -- Gmail app password (encrypted)
  
  -- IMAP Settings
  imap_host VARCHAR(255) DEFAULT 'imap.gmail.com',
  imap_port INTEGER DEFAULT 993,
  imap_secure BOOLEAN DEFAULT true,
  
  -- Status & Sync
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'success')),
  last_error TEXT,
  emails_synced INTEGER DEFAULT 0,
  
  -- Configuration
  sync_interval_minutes INTEGER DEFAULT 30,
  max_emails_per_sync INTEGER DEFAULT 50,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT imap_configs_user_email_unique UNIQUE(user_id, gmail_email),
  CONSTRAINT imap_configs_sync_interval_check CHECK (sync_interval_minutes >= 5)
);
```

### 3. Create Indexes for Performance
Run this SQL script to add performance indexes:

```sql
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- IMAP Inbox indexes
CREATE INDEX IF NOT EXISTS idx_imap_inbox_user_id ON public.imap_inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_imap_inbox_status ON public.imap_inbox(status);
CREATE INDEX IF NOT EXISTS idx_imap_inbox_received_at ON public.imap_inbox(received_at);
CREATE INDEX IF NOT EXISTS idx_imap_inbox_message_id ON public.imap_inbox(message_id);
CREATE INDEX IF NOT EXISTS idx_imap_inbox_user_status ON public.imap_inbox(user_id, status);

-- IMAP Processed indexes
CREATE INDEX IF NOT EXISTS idx_imap_processed_user_id ON public.imap_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_imap_processed_result ON public.imap_processed(processing_result);
CREATE INDEX IF NOT EXISTS idx_imap_processed_at ON public.imap_processed(processed_at);
CREATE INDEX IF NOT EXISTS idx_imap_processed_transaction_id ON public.imap_processed(transaction_id);

-- IMAP Configurations indexes
CREATE INDEX IF NOT EXISTS idx_imap_configs_user_id ON public.imap_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_imap_configs_active ON public.imap_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_imap_configs_sync_status ON public.imap_configurations(sync_status);
```

### 4. Create Auto-Update Triggers
Run this SQL script to add timestamp update triggers:

```sql
-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Create or replace the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update trigger for imap_inbox
CREATE TRIGGER update_imap_inbox_updated_at 
    BEFORE UPDATE ON public.imap_inbox 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for imap_configurations
CREATE TRIGGER update_imap_configurations_updated_at 
    BEFORE UPDATE ON public.imap_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5. Enable Row Level Security (RLS)
Run this SQL script to enable security policies:

```sql
-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new email tables
ALTER TABLE public.imap_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imap_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imap_configurations ENABLE ROW LEVEL SECURITY;

-- IMAP Inbox Policies
CREATE POLICY "Users can view their own imap inbox" ON public.imap_inbox
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert to imap inbox" ON public.imap_inbox
  FOR INSERT WITH CHECK (true); -- Allow system/IMAP puller to insert

CREATE POLICY "Users can update their own imap inbox" ON public.imap_inbox
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imap inbox" ON public.imap_inbox
  FOR DELETE USING (auth.uid() = user_id);

-- IMAP Processed Policies  
CREATE POLICY "Users can view their own processed emails" ON public.imap_processed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed emails" ON public.imap_processed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- IMAP Configurations Policies
CREATE POLICY "Users can manage their own imap configurations" ON public.imap_configurations
  FOR ALL USING (auth.uid() = user_id);
```

### 6. Create Helper Functions
Run this SQL script to add utility functions:

```sql
-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to move email from inbox to processed
CREATE OR REPLACE FUNCTION move_email_to_processed(
  email_id UUID,
  user_id UUID,
  result VARCHAR(20),
  transaction_id UUID DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  processing_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  email_record RECORD;
BEGIN
  -- Get the email from inbox
  SELECT * INTO email_record FROM public.imap_inbox 
  WHERE id = email_id AND imap_inbox.user_id = move_email_to_processed.user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Insert into processed table
  INSERT INTO public.imap_processed (
    user_id, original_inbox_id, message_id, subject, from_email, received_at,
    processing_result, transaction_id, rejection_reason, processed_by_user_id, processing_notes
  ) VALUES (
    move_email_to_processed.user_id, email_record.id, email_record.message_id, 
    email_record.subject, email_record.from_email, email_record.received_at,
    result, transaction_id, rejection_reason, move_email_to_processed.user_id, processing_notes
  );
  
  -- Delete from inbox
  DELETE FROM public.imap_inbox WHERE id = email_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION move_email_to_processed TO authenticated;
```

### 7. Add Table Documentation
Run this SQL script to add table comments:

```sql
-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.imap_inbox IS 'Raw emails pulled from Gmail via IMAP puller';
COMMENT ON TABLE public.imap_processed IS 'Emails that have been manually reviewed and processed';
COMMENT ON TABLE public.imap_configurations IS 'User IMAP configuration for Gmail integration';
COMMENT ON FUNCTION move_email_to_processed IS 'Safely moves email from inbox to processed with transaction support';
```

## Verification

After running all scripts, verify the setup:

1. Go to **Database > Tables** in Supabase
2. You should see these new tables:
   - `imap_inbox`
   - `imap_processed` 
   - `imap_configurations`

3. Check **Authentication > Policies** to verify RLS policies are active

## Next Steps

1. Test the email-puller application with these tables
2. Use the simplified email import UI to view emails
3. Monitor the `imap_inbox` table for new emails from the puller

## Troubleshooting

- **Permission errors**: Ensure you're signed in with admin privileges
- **Relation errors**: Make sure `profiles` and `transactions` tables exist
- **Function errors**: Run scripts in the exact order provided

The database is now ready for the simplified email import system!