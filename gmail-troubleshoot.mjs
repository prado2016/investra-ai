#!/usr/bin/env node

/**
 * Gmail IMAP Troubleshooting Guide
 * Helps diagnose Gmail authentication issues
 */

console.log('🔍 Gmail IMAP Troubleshooting Guide');
console.log('====================================');
console.log('');

console.log('❌ Authentication Failed - Possible Issues:');
console.log('');

console.log('1. 📧 GMAIL ACCOUNT SETTINGS:');
console.log('   • Go to Gmail → Settings → Forwarding and POP/IMAP');
console.log('   • Ensure "IMAP Access" is ENABLED');
console.log('   • Save changes if needed');
console.log('');

console.log('2. 🔐 TWO-FACTOR AUTHENTICATION:');
console.log('   • Go to Google Account Security settings');
console.log('   • Ensure 2-Step Verification is ENABLED');
console.log('   • This is REQUIRED for App Passwords');
console.log('');

console.log('3. 🔑 APP PASSWORD GENERATION:');
console.log('   • Go to https://myaccount.google.com/apppasswords');
console.log('   • Select "Mail" as the app');
console.log('   • Select "Mac" or "Other (Custom name)" as device');
console.log('   • Copy the 16-character password EXACTLY');
console.log('   • Format: "abcd efgh ijkl mnop" (with spaces)');
console.log('');

console.log('4. ⚠️  COMMON MISTAKES:');
console.log('   • Using regular Gmail password instead of App Password');
console.log('   • Typing App Password incorrectly (copy-paste recommended)');
console.log('   • Not enabling 2FA before generating App Password');
console.log('   • IMAP disabled in Gmail settings');
console.log('');

console.log('5. 🧪 TESTING STEPS:');
console.log('   • Generate a NEW App Password');
console.log('   • Copy it exactly (including spaces or no spaces)');
console.log('   • Update .env.production file');
console.log('   • Test connection again');
console.log('');

console.log('6. 🔄 ALTERNATIVE: Test with Gmail web interface');
console.log('   • Login to gmail.com with regular password');
console.log('   • Verify account access works normally');
console.log('   • Then generate fresh App Password');
console.log('');

console.log('📋 CURRENT CREDENTIALS CHECK:');
console.log(`   Email: investra.transactions@gmail.com`);
console.log(`   Password length: ${process.env.GMAIL_APP_PASSWORD?.length || 0} characters`);
console.log(`   Password format: ${process.env.GMAIL_APP_PASSWORD ? 'Configured' : 'Missing'}`);

if (process.env.GMAIL_APP_PASSWORD) {
  console.log(`   Password preview: ${process.env.GMAIL_APP_PASSWORD.substring(0, 4)}...${process.env.GMAIL_APP_PASSWORD.substring(-4)}`);
}

console.log('');
console.log('🎯 NEXT STEPS:');
console.log('1. Verify Gmail IMAP is enabled');
console.log('2. Verify 2FA is enabled');
console.log('3. Generate a NEW App Password');
console.log('4. Test with the new password');
