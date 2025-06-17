#!/usr/bin/env node

/**
 * Test Email Server Connection
 * Tests IMAP connection to root@10.0.0.83
 */

const { ImapFlow } = require('imapflow');

async function testEmailConnection() {
  console.log('🧪 Testing Email Server Connection...');
  console.log('📧 Server: root@10.0.0.83');
  
  // Test configurations - you'll need to adjust these based on your server setup
  const testConfigs = [
    {
      name: 'Standard IMAPS (993)',
      config: {
        host: '10.0.0.83',
        port: 993,
        secure: true,
        auth: {
          user: 'root',  // Adjust this based on your actual email account
          pass: 'your_password_here'  // You'll need to provide the actual password
        },
        logger: false
      }
    },
    {
      name: 'IMAP with STARTTLS (143)',
      config: {
        host: '10.0.0.83',
        port: 143,
        secure: false,
        auth: {
          user: 'root',
          pass: 'your_password_here'
        },
        logger: false
      }
    }
  ];

  for (const testConfig of testConfigs) {
    console.log(`\n🔍 Testing: ${testConfig.name}`);
    
    try {
      const client = new ImapFlow(testConfig.config);
      
      console.log('   Connecting...');
      await client.connect();
      
      console.log('   ✅ Connected successfully!');
      console.log(`   Server info: ${JSON.stringify(client.serverInfo)}`);
      
      // List mailboxes
      console.log('   📁 Listing mailboxes...');
      const mailboxes = await client.list();
      console.log(`   Found ${mailboxes.length} mailboxes:`);
      mailboxes.forEach(mb => {
        console.log(`     - ${mb.name} (${mb.flags?.join(', ') || 'no flags'})`);
      });
      
      // Check INBOX
      console.log('   📬 Opening INBOX...');
      const inbox = await client.mailboxOpen('INBOX');
      console.log(`   INBOX status: ${inbox.exists} messages, ${inbox.unseen} unread`);
      
      await client.logout();
      console.log('   ✅ Test completed successfully');
      
      return testConfig; // Return successful config
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ All connection tests failed');
  console.log('\n💡 Next steps:');
  console.log('   1. Verify the email server is running on 10.0.0.83');
  console.log('   2. Check firewall settings (ports 993, 143, 587, 25)');
  console.log('   3. Confirm email account credentials');
  console.log('   4. Test basic connectivity: telnet 10.0.0.83 993');
  
  return null;
}

// Run the test
if (require.main === module) {
  testEmailConnection()
    .then(result => {
      if (result) {
        console.log('\n🎉 Connection test passed! Ready for email processing tests.');
      } else {
        console.log('\n⚠️ Fix connection issues before proceeding to full testing.');
      }
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testEmailConnection };
