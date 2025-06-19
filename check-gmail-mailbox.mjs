#!/usr/bin/env node

/**
 * Check Gmail Mailbox for Pending Emails
 * Connect to investra.transactions@gmail.com and count unprocessed emails
 */

import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '/Users/eduardo/investra-ai/.env.production' });

// For testing - you'll need to generate this from Gmail
// Go to https://myaccount.google.com/apppasswords and generate for "Investra AI"
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.IMAP_PASSWORD || '';

const GMAIL_CONFIG = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'investra.transactions@gmail.com',
    pass: GMAIL_APP_PASSWORD
  }
};

async function checkGmailMailbox() {
  console.log('📧 Checking Gmail Mailbox for Pending Emails');
  console.log('===============================================');
  console.log(`📮 Email: ${GMAIL_CONFIG.auth.user}`);
  console.log(`🔐 Password configured: ${!!GMAIL_CONFIG.auth.pass}`);
  console.log('');

  if (!GMAIL_CONFIG.auth.pass) {
    console.log('❌ No Gmail app password found in environment variables!');
    console.log('Expected: GMAIL_APP_PASSWORD or IMAP_PASSWORD');
    console.log('');
    console.log('🔧 To fix this:');
    console.log('1. Generate an App Password in Gmail settings');
    console.log('2. Add it to your .env.production file');
    console.log('3. Deploy the updated configuration');
    return;
  }

  const client = new ImapFlow(GMAIL_CONFIG);

  try {
    console.log('🔌 Connecting to Gmail IMAP...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Get mailbox status
    console.log('📊 Checking INBOX status...');
    const mailboxStatus = await client.status('INBOX', {
      messages: true,
      recent: true,
      unseen: true,
      uidNext: true,
      uidValidity: true
    });

    console.log('📋 Mailbox Statistics:');
    console.log(`   📨 Total messages: ${mailboxStatus.messages}`);
    console.log(`   🆕 Recent messages: ${mailboxStatus.recent}`);
    console.log(`   👁️  Unseen messages: ${mailboxStatus.unseen}`);
    console.log(`   🔄 Next UID: ${mailboxStatus.uidNext}`);
    console.log('');

    // Select INBOX for detailed analysis
    const mailboxLock = await client.getMailboxLock('INBOX');
    
    try {
      // Get unread emails from Wealthsimple
      console.log('🔍 Searching for unprocessed Wealthsimple emails...');
      
      const wealthsimpleEmails = await client.search({
        unseen: true,
        from: 'notifications@wealthsimple.com'
      });

      console.log(`📧 Unread Wealthsimple emails: ${wealthsimpleEmails.length}`);

      if (wealthsimpleEmails.length > 0) {
        console.log('');
        console.log('📋 Recent unprocessed emails:');
        
        // Get details of the first 5 unread emails
        const emailsToShow = wealthsimpleEmails.slice(0, Math.min(5, wealthsimpleEmails.length));
        
        for await (const message of client.fetch(emailsToShow, { 
          envelope: true, 
          bodyStructure: true,
          uid: true 
        })) {
          const date = message.envelope.date;
          const subject = message.envelope.subject;
          const from = message.envelope.from?.[0]?.address;
          
          console.log(`   • UID: ${message.uid}`);
          console.log(`     📅 Date: ${date?.toLocaleString()}`);
          console.log(`     📧 From: ${from}`);
          console.log(`     📝 Subject: ${subject}`);
          console.log('');
        }

        if (wealthsimpleEmails.length > 5) {
          console.log(`   ... and ${wealthsimpleEmails.length - 5} more emails`);
          console.log('');
        }
      }

      // Get all unread emails (not just Wealthsimple)
      const allUnreadEmails = await client.search({ unseen: true });
      console.log(`📬 Total unread emails in INBOX: ${allUnreadEmails.length}`);

      // Get emails from last 7 days
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const recentEmails = await client.search({
        since: lastWeek,
        from: 'notifications@wealthsimple.com'
      });

      console.log(`📅 Wealthsimple emails from last 7 days: ${recentEmails.length}`);

      // Summary
      console.log('');
      console.log('📊 Summary:');
      console.log(`   ✅ Connection: Working`);
      console.log(`   📨 Total messages: ${mailboxStatus.messages}`);
      console.log(`   📧 Unread Wealthsimple emails: ${wealthsimpleEmails.length}`);
      console.log(`   📬 Total unread emails: ${allUnreadEmails.length}`);
      console.log(`   📅 Recent Wealthsimple emails (7 days): ${recentEmails.length}`);
      
      if (wealthsimpleEmails.length > 0) {
        console.log('');
        console.log('🎯 Action Required:');
        console.log(`   ${wealthsimpleEmails.length} Wealthsimple emails are waiting to be processed!`);
        console.log('   These emails should be automatically processed by the IMAP service.');
      } else {
        console.log('');
        console.log('✅ No unprocessed Wealthsimple emails found.');
      }

    } finally {
      mailboxLock.release();
    }

  } catch (error) {
    console.log('❌ Connection failed!');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('authentication')) {
      console.log('');
      console.log('🔧 Authentication issue - possible fixes:');
      console.log('1. Verify the Gmail App Password is correct');
      console.log('2. Ensure 2-factor authentication is enabled on Gmail');
      console.log('3. Check that the App Password has IMAP access');
    } else if (error.message.includes('connection')) {
      console.log('');
      console.log('🔧 Connection issue - possible fixes:');
      console.log('1. Check internet connectivity');
      console.log('2. Verify Gmail IMAP is enabled');
      console.log('3. Check firewall settings');
    }
  } finally {
    try {
      await client.logout();
      console.log('🔌 Disconnected from Gmail');
    } catch (error) {
      // Ignore logout errors
    }
  }
}

// Run the check
checkGmailMailbox().catch(console.error);
