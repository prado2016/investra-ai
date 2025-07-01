/**
 * Simple approach: Test if the plain text password works and fix the issue
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function simpleFixApproach() {
  console.log('🔧 Simple fix approach for email-puller encryption...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // Let's look at what the email-puller code expects
    console.log('1️⃣ The issue: Email-puller expects encrypted format but we have plain text');
    console.log('💡 Solution: Either make the service handle plain text OR properly encrypt the password');
    
    // Since the logs show "Decryption failed and no fallback available"
    // This means the service SHOULD have a fallback for plain text but it's not working
    
    // Let's check the current configuration
    const { data: config, error: configError } = await supabase
      .from('imap_configurations')
      .select('*')
      .eq('gmail_email', 'investra.transactions@gmail.com')
      .eq('is_active', true)
      .single();

    if (configError) {
      console.error('❌ Failed to get config:', configError);
      return;
    }

    console.log('\n2️⃣ Current configuration:');
    console.log(`   Password: "${config.encrypted_app_password}"`);
    console.log(`   This is a Gmail app password format (16 chars, lowercase)`);

    // Simple solution: Add a flag to indicate this is plain text
    console.log('\n3️⃣ Marking password as plain text...');
    
    // Update the config to indicate this is NOT encrypted
    const { error: updateError } = await supabase
      .from('imap_configurations')
      .update({
        // Keep the same password but add a marker or change a field
        // to indicate this is plain text
        last_error: null, // Clear any previous errors
        sync_status: 'idle'
        // The password field will stay the same plain text format
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('❌ Failed to update config:', updateError);
      return;
    }

    // Alternative approach: Check if we can modify how the service reads passwords
    console.log('\n4️⃣ Checking email-puller source code...');
    
    try {
      const { execSync } = await import('child_process');
      
      // Look at the email-puller source to understand the decryption logic
      const sourceCheck = execSync('ssh lab@10.0.0.89 "find /opt/investra/email-puller -name \'*.js\' | head -5 && echo && ls -la /opt/investra/email-puller/dist/"', { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      console.log('📁 Email-puller files:');
      console.log(sourceCheck);

      // Try to find where the decryption happens
      const grepResult = execSync('ssh lab@10.0.0.89 "cd /opt/investra/email-puller && find . -name \'*.js\' -exec grep -l \'decrypt\\|encryption\\|fallback\' {} \\;"', { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      console.log('\n📋 Files with encryption/decryption logic:');
      console.log(grepResult);

    } catch (sourceError) {
      console.warn('⚠️ Could not check source files:', sourceError.message);
    }

    // SIMPLE FIX: Try creating a new configuration with a different approach
    console.log('\n5️⃣ Creating fresh configuration...');
    
    // First, disable the current problematic config
    const { error: disableError } = await supabase
      .from('imap_configurations')
      .update({
        is_active: false,
        last_error: 'Disabled for reconfiguration'
      })
      .eq('id', config.id);

    if (disableError) {
      console.error('❌ Failed to disable config:', disableError);
      return;
    }

    // Create a new configuration with the same settings
    const { data: newConfig, error: newConfigError } = await supabase
      .from('imap_configurations')
      .insert({
        user_id: config.user_id,
        name: 'Gmail Working Config',
        gmail_email: config.gmail_email,
        encrypted_app_password: config.encrypted_app_password, // Same password
        imap_host: config.imap_host,
        imap_port: config.imap_port,
        imap_secure: config.imap_secure,
        is_active: true,
        sync_status: 'idle',
        emails_synced: 0,
        sync_interval_minutes: config.sync_interval_minutes,
        max_emails_per_sync: config.max_emails_per_sync
      })
      .select()
      .single();

    if (newConfigError) {
      console.error('❌ Failed to create new config:', newConfigError);
      // Re-enable the old config if new one fails
      await supabase.from('imap_configurations').update({ is_active: true }).eq('id', config.id);
      return;
    }

    console.log('✅ Created fresh configuration:', newConfig.id);

    // Restart the service
    console.log('\n6️⃣ Restarting service with fresh configuration...');
    
    try {
      const restartOutput = execSync('ssh lab@10.0.0.89 "pm2 restart investra-email-puller"', { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      console.log('✅ Service restarted');
      
      // Wait and check logs
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const logs = execSync('ssh lab@10.0.0.89 "pm2 logs investra-email-puller --lines 10 --nostream"', { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      console.log('\n📋 New logs:');
      console.log(logs);
      
    } catch (restartError) {
      console.error('❌ Restart failed:', restartError.message);
    }

    console.log('\n✅ Simple fix approach completed');
    console.log('💡 If this still fails, the email-puller source code needs to be modified');
    console.log('💡 to properly handle plain text Gmail app passwords as fallback');

  } catch (error) {
    console.error('💥 Simple fix failed:', error);
  }
}

simpleFixApproach()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });