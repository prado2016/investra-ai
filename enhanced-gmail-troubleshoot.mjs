#!/usr/bin/env node

/**
 * Enhanced Gmail IMAP Troubleshooter
 * Tests multiple authentication methods and configurations
 */

import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '/Users/eduardo/investra-ai/.env.production' });

const GMAIL_EMAIL = 'investra.transactions@gmail.com';
const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.IMAP_PASSWORD || '';

console.log('🔧 Enhanced Gmail IMAP Troubleshooter');
console.log('====================================');
console.log('📅 Date:', new Date().toISOString());
console.log('📧 Email:', GMAIL_EMAIL);
console.log('🔐 Password Length:', GMAIL_PASSWORD.length);
console.log('🔐 Password Format:', GMAIL_PASSWORD ? 'Configured' : 'Missing');
console.log('');

async function testGmailConnection(config, testName) {
  console.log(`🧪 Testing: ${testName}`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   Auth Type: ${config.authType || 'PLAIN'}`);
  
  const client = new ImapFlow(config);
  
  try {
    console.log('   🔌 Connecting...');
    await client.connect();
    console.log('   ✅ SUCCESS! Connection established');
    
    // Try to get mailbox status
    const status = await client.status('INBOX', { messages: true, unseen: true });
    console.log(`   📊 Mailbox: ${status.messages} total, ${status.unseen} unread`);
    
    await client.logout();
    console.log('   🔌 Disconnected cleanly');
    return true;
    
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    
    if (error.message.includes('AUTHENTICATIONFAILED')) {
      console.log('   🔍 Authentication Error Details:');
      console.log('      - This is specifically an authentication failure');
      console.log('      - Password format or account settings issue');
    }
    
    try {
      await client.logout();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

async function runAllTests() {
  if (!GMAIL_PASSWORD) {
    console.log('❌ No Gmail App Password found in environment!');
    return;
  }
  
  console.log('🚀 Running Gmail IMAP Connection Tests...');
  console.log('');
  
  // Test 1: Standard configuration
  const config1 = {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_PASSWORD
    }
  };
  
  const success1 = await testGmailConnection(config1, 'Standard Gmail IMAP (Port 993, TLS)');
  console.log('');
  
  if (success1) {
    console.log('🎉 SUCCESS! Gmail IMAP is working with standard configuration');
    return;
  }
  
  // Test 2: Alternative port configuration
  const config2 = {
    host: 'imap.gmail.com', 
    port: 993,
    secure: true,
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_PASSWORD
    }
  };
  
  const success2 = await testGmailConnection(config2, 'Gmail IMAP with relaxed TLS');
  console.log('');
  
  if (success2) {
    console.log('🎉 SUCCESS! Gmail IMAP working with relaxed TLS');
    return;
  }
  
  // Test 3: Password with spaces (in case format is wrong)
  const passwordWithSpaces = GMAIL_PASSWORD.replace(/(.{4})/g, '$1 ').trim();
  const config3 = {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: GMAIL_EMAIL,
      pass: passwordWithSpaces
    }
  };
  
  const success3 = await testGmailConnection(config3, 'Gmail IMAP with spaced password format');
  console.log('');
  
  if (success3) {
    console.log('🎉 SUCCESS! Gmail IMAP working with spaced password format');
    console.log('💡 Note: Use password with spaces for future connections');
    return;
  }
  
  // Test 4: Password with dashes (original format)
  const passwordWithDashes = 'guhfyf-fuhmu3-rAkxox';
  const config4 = {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: GMAIL_EMAIL,
      pass: passwordWithDashes
    }
  };
  
  const success4 = await testGmailConnection(config4, 'Gmail IMAP with original dashed password');
  console.log('');
  
  if (success4) {
    console.log('🎉 SUCCESS! Gmail IMAP working with original dashed format');
    console.log('💡 Note: Use password with dashes for future connections');
    return;
  }
  
  console.log('❌ All authentication tests failed!');
  console.log('');
  console.log('🔧 Next Steps:');
  console.log('1. Check if Advanced Protection is enabled on Gmail account');
  console.log('2. Generate a completely NEW App Password');
  console.log('3. Verify 2FA is enabled and working');
  console.log('4. Try testing from a different network/location');
  console.log('5. Consider using OAuth2 authentication instead');
  console.log('');
  console.log('🌐 Account Settings to Check:');
  console.log('   • https://myaccount.google.com/security');
  console.log('   • https://myaccount.google.com/apppasswords');
  console.log('   • Gmail Settings → Forwarding and POP/IMAP');
}

// Run tests
runAllTests().catch(console.error);
