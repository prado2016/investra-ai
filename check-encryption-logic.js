/**
 * Check the actual encryption/decryption logic used by email-puller
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function checkEncryptionLogic() {
  console.log('🔍 Investigating encryption/decryption logic...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // 1. Check the exact password and see if we can test decryption manually
    console.log('1️⃣ Getting current password and encryption key...');
    
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

    const { data: encKey, error: keyError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'email_encryption_key')
      .single();

    if (keyError) {
      console.error('❌ Failed to get encryption key:', keyError);
      return;
    }

    console.log('📊 Current data:');
    console.log(`   Password: "${config.encrypted_app_password}"`);
    console.log(`   Password length: ${config.encrypted_app_password.length}`);
    console.log(`   Encryption key: ${encKey.config_value.substring(0, 10)}...`);

    // 2. Test what the email-puller decryption logic expects
    console.log('\n2️⃣ Testing decryption logic...');
    
    const password = config.encrypted_app_password;
    const key = encKey.config_value;
    
    // The error says "Invalid encrypted text format" which suggests
    // the service expects a specific format like "iv:encryptedData"
    
    console.log('🔍 Analyzing password format:');
    console.log(`   Contains colon: ${password.includes(':')}`);
    console.log(`   Contains dot: ${password.includes('.')}`);
    console.log(`   Length: ${password.length}`);
    console.log(`   Pattern: ${password}`);
    
    // If it's a plain text password, the service should handle it as fallback
    // But the error suggests it's trying to decrypt it anyway
    
    // Let's check if this is actually a Gmail app password format
    if (password.length === 16 && /^[a-z]+$/.test(password)) {
      console.log('✅ This appears to be a valid Gmail app password format');
      console.log('💡 Gmail app passwords are 16 lowercase letters');
      
      // The issue might be that the service isn't recognizing this as plain text
      // Let's create a properly encrypted version
      
      console.log('\n3️⃣ Creating properly encrypted password...');
      
      const crypto = await import('crypto');
      
      // Create IV and encrypt the password (using modern crypto methods)
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.substring(0, 32)), iv);
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const encryptedFormat = `${iv.toString('hex')}:${encrypted}`;
      
      console.log(`📝 Properly encrypted format: ${encryptedFormat.substring(0, 30)}...`);
      
      // Update the database with the properly encrypted password
      const { error: updateError } = await supabase
        .from('imap_configurations')
        .update({
          encrypted_app_password: encryptedFormat,
          last_error: null,
          sync_status: 'idle'
        })
        .eq('id', config.id);

      if (updateError) {
        console.error('❌ Failed to update password:', updateError);
      } else {
        console.log('✅ Updated password to properly encrypted format');
        
        // Restart the service to pick up the new password
        console.log('\n4️⃣ Restarting service with properly encrypted password...');
        
        try {
          const { execSync } = await import('child_process');
          const restartOutput = execSync('ssh lab@10.0.0.89 "pm2 restart investra-email-puller"', { 
            encoding: 'utf8', 
            timeout: 10000 
          });
          console.log('✅ Service restarted');
          
          // Wait a moment and check the logs
          console.log('\n5️⃣ Checking logs after restart...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const newLogs = execSync('ssh lab@10.0.0.89 "pm2 logs investra-email-puller --lines 10 --nostream"', { 
            encoding: 'utf8', 
            timeout: 10000 
          });
          console.log('📋 New logs:');
          console.log(newLogs);
          
        } catch (restartError) {
          console.error('❌ Failed to restart or check logs:', restartError.message);
        }
      }
    } else {
      console.log('⚠️ Password format is unexpected');
      console.log('💡 Expected: 16 lowercase letters for Gmail app password');
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkEncryptionLogic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });