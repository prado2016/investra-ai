#!/usr/bin/env node

/**
 * Email Server Connection Test
 * Simple test to verify all dependencies are available on the server
 */

console.log('🔧 Email Server Dependency Test');
console.log('================================');

// Test 1: Check Node.js version
console.log('\n📦 Checking Node.js environment...');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);

// Test 2: Check required modules
console.log('\n📧 Testing email processing dependencies...');

const requiredModules = [
  'imapflow',
  'mailparser', 
  'http',
  'https',
  'fs',
  'path'
];

let allDependenciesAvailable = true;

for (const moduleName of requiredModules) {
  try {
    require.resolve(moduleName);
    console.log(`✅ ${moduleName}: Available`);
  } catch (error) {
    console.log(`❌ ${moduleName}: Missing`);
    allDependenciesAvailable = false;
    
    if (!['http', 'https', 'fs', 'path'].includes(moduleName)) {
      console.log(`   Install with: npm install ${moduleName}`);
    }
  }
}

// Test 3: Test IMAP module functionality
if (allDependenciesAvailable) {
  console.log('\n🧪 Testing IMAP module functionality...');
  
  try {
    const { ImapFlow } = require('imapflow');
    
    // Test instantiation
    const testConfig = {
      host: 'test.example.com',
      port: 993,
      secure: true,
      auth: {
        user: 'test@example.com',
        pass: 'testpass'
      }
    };
    
    const client = new ImapFlow(testConfig);
    console.log('✅ ImapFlow: Can instantiate client');
    
    // Don't actually connect in test
    console.log('✅ ImapFlow: Module working correctly');
    
  } catch (error) {
    console.log(`❌ ImapFlow test failed: ${error.message}`);
    allDependenciesAvailable = false;
  }
}

// Test 4: Test mailparser module
if (allDependenciesAvailable) {
  console.log('\n📨 Testing mailparser module...');
  
  try {
    const { simpleParser } = require('mailparser');
    console.log('✅ mailparser: Module loaded successfully');
    
    // Test with sample email
    const sampleEmail = `From: test@example.com
To: receiver@example.com
Subject: Test Email

This is a test email.`;
    
    simpleParser(sampleEmail, (err, parsed) => {
      if (err) {
        console.log(`❌ mailparser test failed: ${err.message}`);
      } else {
        console.log('✅ mailparser: Can parse emails');
        console.log(`   Parsed subject: ${parsed.subject}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ mailparser test failed: ${error.message}`);
    allDependenciesAvailable = false;
  }
}

// Test 5: Network connectivity test
console.log('\n🌐 Testing network connectivity...');

const dns = require('dns');
dns.lookup('google.com', (err) => {
  if (err) {
    console.log('❌ No internet connectivity');
  } else {
    console.log('✅ Internet connectivity available');
  }
});

// Test 6: File system permissions
console.log('\n📁 Testing file system permissions...');

const fs = require('fs');
const path = require('path');

try {
  const testFile = path.join(__dirname, 'test-write.tmp');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ File system: Read/write permissions OK');
} catch (error) {
  console.log(`❌ File system: Permission error - ${error.message}`);
}

// Final summary
setTimeout(() => {
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  if (allDependenciesAvailable) {
    console.log('✅ All dependencies available');
    console.log('🚀 Email server is ready for email processing');
    console.log('\n📋 Next steps:');
    console.log('1. Configure IMAP settings in your application');
    console.log('2. Set up environment variables');
    console.log('3. Test with real email server connection');
  } else {
    console.log('❌ Some dependencies are missing');
    console.log('\n🔧 To fix dependency issues:');
    console.log('1. Run: npm install imapflow mailparser axios');
    console.log('2. Check Node.js version (recommended: 16+)');
    console.log('3. Verify internet connectivity');
    console.log('4. Re-run this test: node test-server-deps.js');
  }
  
  console.log('\n📧 For email processing issues:');
  console.log('- Check IMAP server is running on ports 993/143');
  console.log('- Verify email credentials');
  console.log('- Test firewall settings');
  
  process.exit(allDependenciesAvailable ? 0 : 1);
}, 1000);
