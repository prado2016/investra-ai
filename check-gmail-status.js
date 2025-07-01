/**
 * Quick script to check Gmail folder status
 */

import { ImapFlow } from 'imapflow';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

async function checkGmailStatus() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.IMAP_USERNAME,
      pass: process.env.IMAP_PASSWORD
    },
    logger: false
  });

  try {
    await client.connect();
    console.log('✅ Connected to Gmail');

    // Check INBOX
    await client.mailboxOpen('INBOX');
    const inboxStatus = await client.status('INBOX', { messages: true, unseen: true });
    console.log(`📥 INBOX: ${inboxStatus.messages} total, ${inboxStatus.unseen} unseen`);

    // Check processed folder
    let processedStatus = null;
    try {
      await client.mailboxOpen('Investra/Processed');
      processedStatus = await client.status('Investra/Processed', { messages: true });
      console.log(`✅ Processed folder: ${processedStatus.messages} emails`);
    } catch {
      console.log('❌ Processed folder does not exist or cannot be accessed');
    }

    // List all folders
    console.log('\n📁 All folders:');
    const folders = await client.list();
    folders.forEach(folder => {
      console.log(`   ${folder.name} (${folder.delimiter})`);
    });

    await client.logout();
    console.log('\n✅ Total emails in Gmail system:', inboxStatus.messages + (processedStatus?.messages || 0));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGmailStatus();