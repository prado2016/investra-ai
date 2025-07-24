#!/usr/bin/env node

/**
 * Script to add missing columns to imap_inbox table
 * Run with: node scripts/fix-email-schema.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function fixEmailSchema() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('🔧 Fixing imap_inbox table schema...');
  
  try {
    // Add the missing columns using raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            -- Check if archived_in_gmail column exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'imap_inbox' 
                AND column_name = 'archived_in_gmail'
            ) THEN
                ALTER TABLE imap_inbox 
                ADD COLUMN archived_in_gmail BOOLEAN DEFAULT FALSE;
                RAISE NOTICE 'Added archived_in_gmail column to imap_inbox table';
            END IF;
            
            -- Check if archive_folder column exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'imap_inbox' 
                AND column_name = 'archive_folder'
            ) THEN
                ALTER TABLE imap_inbox 
                ADD COLUMN archive_folder TEXT;
                RAISE NOTICE 'Added archive_folder column to imap_inbox table';
            END IF;
        END $$;
        
        -- Update existing records
        UPDATE imap_inbox 
        SET archived_in_gmail = FALSE 
        WHERE archived_in_gmail IS NULL;
      `
    });
    
    if (error) {
      console.error('❌ Failed to add columns:', error);
      process.exit(1);
    }
    
    console.log('✅ Successfully added missing columns to imap_inbox table');
    console.log('📋 Changes made:');
    console.log('  - Added archived_in_gmail (BOOLEAN DEFAULT FALSE)');
    console.log('  - Added archive_folder (TEXT)');
    console.log('  - Updated existing records to set archived_in_gmail = FALSE');
    
  } catch (err) {
    console.error('❌ Script failed:', err);
    process.exit(1);
  }
}

// Run the script
fixEmailSchema();