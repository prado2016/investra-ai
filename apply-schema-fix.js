/**
 * Apply the database schema fix to prevent email insertion errors
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function applySchemaFix() {
  console.log('🔧 Applying database schema fix...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // Try to add missing columns using SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE imap_processed 
        ADD COLUMN IF NOT EXISTS email_size INTEGER,
        ADD COLUMN IF NOT EXISTS text_content TEXT,
        ADD COLUMN IF NOT EXISTS email_body TEXT;
      `
    });

    if (error) {
      console.error('❌ SQL execution failed:', error);
      console.log('💡 You may need to run this SQL manually in Supabase Dashboard:');
      console.log(`
ALTER TABLE imap_processed 
ADD COLUMN IF NOT EXISTS email_size INTEGER,
ADD COLUMN IF NOT EXISTS text_content TEXT,
ADD COLUMN IF NOT EXISTS email_body TEXT;
      `);
    } else {
      console.log('✅ Database schema fix applied successfully');
    }

  } catch (error) {
    console.error('💥 Schema fix failed:', error);
  }
}

applySchemaFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });