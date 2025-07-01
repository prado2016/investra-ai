/**
 * Examine the actual encryption.js code to understand the issue
 */

import { execSync } from 'child_process';

async function examineEncryptionCode() {
  console.log('🔍 Examining actual encryption code on server...');
  
  try {
    // Look at the encryption.js file
    console.log('1️⃣ Checking encryption.js code...');
    
    const encryptionCode = execSync('ssh lab@10.0.0.89 "cat /opt/investra/email-puller/dist/encryption.js"', { 
      encoding: 'utf8', 
      timeout: 10000 
    });
    
    console.log('📋 encryption.js content:');
    console.log(encryptionCode);
    
    // Also check the imap-client.js to see how it calls encryption
    console.log('\n2️⃣ Checking how imap-client.js uses encryption...');
    
    const imapClientSnippet = execSync('ssh lab@10.0.0.89 "grep -A 10 -B 10 \'decrypt\\|encrypt\\|password\' /opt/investra/email-puller/dist/imap-client.js"', { 
      encoding: 'utf8', 
      timeout: 10000 
    });
    
    console.log('📋 imap-client.js encryption usage:');
    console.log(imapClientSnippet);

  } catch (error) {
    console.error('💥 Failed to examine code:', error.message);
  }
}

examineEncryptionCode()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });