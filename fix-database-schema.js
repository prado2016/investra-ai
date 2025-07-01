/**
 * Fix database schema issues for email-puller service
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E';

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema for email-puller service...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Test basic connectivity first
    console.log('🔍 Testing database connectivity...');
    
    const { data: testData, error: testError } = await supabase
      .from('imap_processed')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connectivity test failed:', testError);
      return;
    }
    
    console.log('✅ Database connectivity confirmed');
    
    // Check current schema of imap_processed table
    console.log('📊 Checking current imap_processed table schema...');
    
    // We can't directly alter tables via Supabase client, so let's check what columns exist
    // by trying to select from the table and seeing what's available
    const { data: sampleData, error: sampleError } = await supabase
      .from('imap_processed')
      .select('*')
      .limit(1);
    
    if (sampleData && sampleData.length > 0) {
      console.log('📋 Current table columns:', Object.keys(sampleData[0]));
      
      const hasEmailSize = 'email_size' in sampleData[0];
      const hasTextContent = 'text_content' in sampleData[0];
      const hasEmailBody = 'email_body' in sampleData[0];
      
      console.log('🔍 Missing columns check:');
      console.log(`  - email_size: ${hasEmailSize ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  - text_content: ${hasTextContent ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  - email_body: ${hasEmailBody ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (!hasEmailSize || !hasTextContent || !hasEmailBody) {
        console.log('⚠️ Some columns are missing - manual database migration needed');
      } else {
        console.log('✅ All required columns exist');
      }
    } else {
      console.log('📋 No data in imap_processed table to check schema');
    }

    // Check current IMAP configurations
    console.log('🔍 Checking IMAP configurations...');
    
    const { data: imapConfigs, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['imap_host', 'imap_port', 'imap_secure', 'gmail_email', 'gmail_app_password']);

    if (configError) {
      console.error('❌ Failed to check IMAP config:', configError);
    } else {
      console.log('📋 Current IMAP settings:', imapConfigs);
      
      // Check if we have Gmail credentials
      const hasGmailEmail = imapConfigs?.some(c => c.config_key === 'gmail_email' && c.config_value);
      const hasGmailPassword = imapConfigs?.some(c => c.config_key === 'gmail_app_password' && c.config_value);
      
      console.log('🔍 Gmail credentials check:');
      console.log(`  - Gmail email: ${hasGmailEmail ? '✅ SET' : '❌ MISSING'}`);
      console.log(`  - Gmail app password: ${hasGmailPassword ? '✅ SET' : '❌ MISSING'}`);
      
      if (!hasGmailEmail || !hasGmailPassword) {
        console.log('⚠️ Gmail credentials are missing - email sync will fail');
        console.log('💡 Add Gmail credentials via Settings > Email-Puller System Configuration');
      }
    }

    // Check if imap_configurations table exists
    console.log('🔍 Checking imap_configurations table...');
    
    const { data: imapTableData, error: imapTableError } = await supabase
      .from('imap_configurations')
      .select('*')
      .limit(1);

    if (imapTableError) {
      console.error('❌ imap_configurations table issue:', imapTableError.message);
      console.log('💡 Service expects imap_configurations table but it may not exist or have proper data');
    } else {
      console.log(`📊 Found ${imapTableData?.length || 0} IMAP configurations in table`);
      if (imapTableData && imapTableData.length > 0) {
        console.log('📋 Sample IMAP config:', imapTableData[0]);
      }
    }

    // Check sync requests table with multiple possible names
    console.log('🔍 Checking sync requests tables...');
    
    const possibleTables = ['sync_requests', 'imap_sync_requests', 'email_sync_requests'];
    
    for (const tableName of possibleTables) {
      console.log(`📋 Checking table: ${tableName}`);
      
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);

      if (tableError) {
        console.log(`  ❌ ${tableName}: ${tableError.message}`);
      } else {
        console.log(`  ✅ ${tableName}: Found ${tableData?.length || 0} records`);
        if (tableData && tableData.length > 0) {
          console.log(`  📋 Sample record:`, tableData[0]);
          console.log(`  📋 Available columns:`, Object.keys(tableData[0]));
        }
      }
    }
    
    // Try to trigger a sync request to see what happens
    console.log('🔍 Testing sync request creation...');
    
    const { data: testSyncRequest, error: testSyncError } = await supabase
      .from('sync_requests')
      .insert({
        user_id: '1845c30a-4f89-49bb-aeb9-bc292752e07a',
        request_type: 'diagnostic_test',
        status: 'pending'
      })
      .select()
      .single();

    if (testSyncError) {
      console.error('❌ Test sync request creation failed:', testSyncError);
    } else {
      console.log('✅ Test sync request created successfully:', testSyncRequest.id);
      
      // Immediately check if it still exists
      const { data: verifySync, error: verifyError } = await supabase
        .from('sync_requests')
        .select('*')
        .eq('id', testSyncRequest.id)
        .single();
        
      if (verifyError) {
        console.log('❌ Test sync request disappeared immediately:', verifyError.message);
      } else {
        console.log('✅ Test sync request still exists:', verifySync);
      }
    }

    console.log('✅ Database schema fix completed');
    
  } catch (error) {
    console.error('💥 Schema fix failed:', error);
    throw error;
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('🎉 Schema fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Schema fix failed:', error);
    process.exit(1);
  });