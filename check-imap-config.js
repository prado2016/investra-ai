/**
 * Check IMAP configuration and Gmail credentials
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function checkImapConfig() {
  console.log('🔍 Checking IMAP configuration and Gmail credentials...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // Check imap_configurations table
    console.log('📋 Checking imap_configurations table...');
    
    const { data: imapConfigs, error: imapError } = await supabase
      .from('imap_configurations')
      .select('*')
      .eq('user_id', '1845c30a-4f89-49bb-aeb9-bc292752e07a')
      .eq('is_active', true);

    if (imapError) {
      console.error('❌ Failed to get IMAP configs:', imapError);
      return;
    }

    console.log(`📊 Found ${imapConfigs?.length || 0} active IMAP configurations:`);
    
    imapConfigs?.forEach((config, index) => {
      console.log(`\n  ${index + 1}. ${config.name}`);
      console.log(`     Gmail: ${config.gmail_email}`);
      console.log(`     Host: ${config.imap_host}:${config.imap_port}`);
      console.log(`     Secure: ${config.imap_secure}`);
      console.log(`     Active: ${config.is_active}`);
      console.log(`     Last sync: ${config.last_sync_at}`);
      console.log(`     Status: ${config.sync_status}`);
      console.log(`     Emails synced: ${config.emails_synced}`);
      console.log(`     Error: ${config.last_error || 'None'}`);
      console.log(`     Password length: ${config.encrypted_app_password?.length || 0} chars`);
      
      // Check if password looks like it might be encrypted vs plain text
      if (config.encrypted_app_password) {
        const isEncrypted = config.encrypted_app_password.length > 20 || 
                          config.encrypted_app_password.includes(':') ||
                          config.encrypted_app_password.includes('.');
        console.log(`     Password format: ${isEncrypted ? 'Likely encrypted' : 'Likely plain text'}`);
      }
    });

    // Check system_config for any additional Gmail settings
    console.log('\n📋 Checking system_config for Gmail settings...');
    
    const { data: systemConfig, error: configError } = await supabase
      .from('system_config')
      .select('*')
      .in('config_key', [
        'gmail_email', 
        'gmail_app_password',
        'imap_host',
        'imap_port', 
        'imap_secure',
        'sync_interval_minutes',
        'max_emails_per_sync',
        'enable_logging'
      ]);

    if (configError) {
      console.error('❌ Failed to get system config:', configError);
    } else {
      console.log(`📊 Found ${systemConfig?.length || 0} system config entries:`);
      systemConfig?.forEach(config => {
        const value = config.config_key.includes('password') ? '[HIDDEN]' : config.config_value;
        console.log(`  ${config.config_key}: ${value}`);
      });
    }

    // Check recent email sync activity
    console.log('\n📋 Checking recent email sync activity...');
    
    const { data: recentEmails, error: emailError } = await supabase
      .from('imap_inbox')
      .select('*')
      .eq('user_id', '1845c30a-4f89-49bb-aeb9-bc292752e07a')
      .order('created_at', { ascending: false })
      .limit(5);

    if (emailError) {
      console.error('❌ Failed to get recent emails:', emailError);
    } else {
      console.log(`📧 Found ${recentEmails?.length || 0} recent emails in inbox:`);
      recentEmails?.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.subject?.substring(0, 50) || 'No subject'}`);
        console.log(`     From: ${email.from_email}`);
        console.log(`     Received: ${email.received_at}`);
        console.log(`     Created: ${email.created_at}`);
      });
    }

    // Check if there are emails from today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayEmails, error: todayError } = await supabase
      .from('imap_inbox')
      .select('*')
      .eq('user_id', '1845c30a-4f89-49bb-aeb9-bc292752e07a')
      .gte('received_at', today + 'T00:00:00.000Z')
      .order('received_at', { ascending: false });

    if (!todayError && todayEmails) {
      console.log(`\n📅 Found ${todayEmails.length} emails from today (${today}):`);
      todayEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.subject?.substring(0, 50) || 'No subject'} (${email.received_at})`);
      });
      
      if (todayEmails.length === 0) {
        console.log('🚨 NO EMAILS FROM TODAY FOUND IN DATABASE');
        console.log('💡 This confirms the 4 new emails are not being synced');
      }
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkImapConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });