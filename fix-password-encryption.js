/**
 * Fix the password encryption using the EXACT same logic as the email-puller
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

// Use the EXACT same encryption logic as the email-puller
const ENCRYPTION_KEY = 'investra-email-key-change-in-production-32'; // From the code
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    try {
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        throw new Error(`Encryption failed: ${error}`);
    }
}

function decrypt(encryptedText) {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted text format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error}`);
    }
}

async function fixPasswordEncryption() {
  console.log('🔧 Fixing password encryption with EXACT email-puller logic...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // Get the current plain text password
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

    const plainTextPassword = config.encrypted_app_password;
    console.log(`📋 Current password: "${plainTextPassword}"`);
    console.log(`📋 Length: ${plainTextPassword.length} characters`);

    // Encrypt using the EXACT same method as email-puller
    console.log('\n🔐 Encrypting password using email-puller logic...');
    
    const encryptedPassword = encrypt(plainTextPassword);
    console.log(`✅ Encrypted password: ${encryptedPassword.substring(0, 30)}...`);
    
    // Test that we can decrypt it back
    console.log('\n🧪 Testing decryption...');
    const decryptedTest = decrypt(encryptedPassword);
    
    if (decryptedTest === plainTextPassword) {
      console.log('✅ Encryption/Decryption test passed!');
    } else {
      console.error('❌ Encryption/Decryption test failed!');
      console.log(`Original: "${plainTextPassword}"`);
      console.log(`Decrypted: "${decryptedTest}"`);
      return;
    }

    // Update the database with the properly encrypted password
    console.log('\n💾 Updating database with encrypted password...');
    
    const { error: updateError } = await supabase
      .from('imap_configurations')
      .update({
        encrypted_app_password: encryptedPassword,
        last_error: null,
        sync_status: 'idle'
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('❌ Failed to update password:', updateError);
      return;
    }

    console.log('✅ Password updated successfully in database');

    // Restart the email-puller service
    console.log('\n🔄 Restarting email-puller service...');
    
    const { execSync } = await import('child_process');
    
    try {
      const restartOutput = execSync('ssh lab@10.0.0.89 "pm2 restart investra-email-puller"', { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      console.log('✅ Service restarted');
      
      // Wait a moment for startup
      console.log('\n⏳ Waiting for service startup...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check the logs
      const logs = execSync('ssh lab@10.0.0.89 "pm2 logs investra-email-puller --lines 15 --nostream"', { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      
      console.log('\n📋 Recent logs after restart:');
      console.log(logs);
      
      // Look for success/failure indicators
      if (logs.includes('Decryption failed') || logs.includes('Failed to connect')) {
        console.log('\n❌ Still seeing encryption/connection errors');
      } else if (logs.includes('Connected to IMAP') || logs.includes('sync completed')) {
        console.log('\n🎉 SUCCESS! No more encryption errors visible');
      } else {
        console.log('\n⏳ Service started, monitoring for connection success...');
      }
      
    } catch (restartError) {
      console.error('❌ Failed to restart or check logs:', restartError.message);
    }

    console.log('\n✅ Password encryption fix completed!');
    console.log('💡 The email-puller should now be able to decrypt the password properly');

  } catch (error) {
    console.error('💥 Fix failed:', error);
  }
}

fixPasswordEncryption()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });