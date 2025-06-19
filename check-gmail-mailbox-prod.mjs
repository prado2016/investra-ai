#!/usr/bin/env node

/**
 * Check Gmail Mailbox for Pending Emails (Production Version)
 * Connect to investra.transactions@gmail.com using credentials from Supabase
 */

import { ImapFlow } from 'imapflow';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase configuration!');
  console.log('Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getGmailCredentials() {
  try {
    console.log('🔍 Fetching Gmail credentials from Supabase...');
    
    // Try to get Gmail IMAP configuration from email_configurations table
    const { data: emailConfig, error: emailError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single();

    if (emailError) {
      console.log('⚠️  No email_configurations found, trying system_configurations...');
      
      // Try to get from system_configurations
      const { data: systemConfigs, error: systemError } = await supabase
        .from('system_configurations')
        .select('*')
        .eq('category', 'email_server')
        .in('config_key', ['imap_host', 'imap_port', 'imap_username', 'imap_password', 'imap_secure']);
      
      if (systemError) {
        throw new Error(`Failed to fetch system configurations: ${systemError.message}`);
      }
      
      if (!systemConfigs || systemConfigs.length === 0) {
        throw new Error('No email server configurations found in system_configurations');
      }
      
      // Convert system configs to object
      const configObj = {};
      systemConfigs.forEach(config => {
        configObj[config.config_key] = config.config_value;
      });
      
      return {
        host: configObj.imap_host || 'imap.gmail.com',
        port: parseInt(configObj.imap_port) || 993,
        secure: configObj.imap_secure !== 'false',
        username: configObj.imap_username,
        password: configObj.imap_password
      };
    }
    
    return {
      host: emailConfig.imap_host || 'imap.gmail.com',
      port: emailConfig.imap_port || 993,
      secure: emailConfig.imap_secure !== false,
      username: emailConfig.imap_username,
      password: emailConfig.imap_password
    };
    
  } catch (error) {
    console.log(`❌ Failed to fetch credentials: ${error.message}`);
    return null;
  }
}

async function checkGmailMailbox() {
  console.log('📧 Checking Gmail Mailbox for Pending Emails (Production)');
  console.log('=========================================================');
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log('');

  // Get credentials from Supabase
  const credentials = await getGmailCredentials();
  
  if (!credentials) {
    console.log('❌ Could not retrieve Gmail credentials from Supabase!');
    console.log('');
    console.log('🔧 Expected tables and configurations:');
    console.log('1. email_configurations table with Gmail settings');
    console.log('2. OR system_configurations with email_server category');
    return;
  }

  console.log(`📮 Email: ${credentials.username}`);
  console.log(`🔐 Password configured: ${!!credentials.password}`);
  console.log(`🏠 Host: ${credentials.host}:${credentials.port}`);
  console.log(`🔒 Secure: ${credentials.secure}`);
  console.log('');

  if (!credentials.password) {
    console.log('❌ No password found in Supabase configuration!');
    console.log('Please check the email configuration in Supabase.');
    return;
  }

  const GMAIL_CONFIG = {
    host: credentials.host,
    port: credentials.port,
    secure: credentials.secure,
    auth: {
      user: credentials.username,
      pass: credentials.password
    }
  };

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

      // Check for any processed emails (if there's a way to identify them)
      console.log('');
      console.log('🔍 Additional analysis...');
      
      // Get all Wealthsimple emails (read and unread)
      const allWealthsimpleEmails = await client.search({
        from: 'notifications@wealthsimple.com'
      });
      
      console.log(`📧 Total Wealthsimple emails: ${allWealthsimpleEmails.length}`);
      console.log(`📖 Read Wealthsimple emails: ${allWealthsimpleEmails.length - wealthsimpleEmails.length}`);

      // Summary
      console.log('');
      console.log('📊 FINAL SUMMARY:');
      console.log('================');
      console.log(`   ✅ Connection: Working`);
      console.log(`   📨 Total messages in mailbox: ${mailboxStatus.messages}`);
      console.log(`   📧 Total Wealthsimple emails: ${allWealthsimpleEmails.length}`);
      console.log(`   🔴 UNREAD Wealthsimple emails: ${wealthsimpleEmails.length}`);
      console.log(`   📖 Read Wealthsimple emails: ${allWealthsimpleEmails.length - wealthsimpleEmails.length}`);
      console.log(`   📬 Total unread emails: ${allUnreadEmails.length}`);
      console.log(`   📅 Recent Wealthsimple emails (7 days): ${recentEmails.length}`);
      
      if (wealthsimpleEmails.length > 0) {
        console.log('');
        console.log('🚨 ACTION REQUIRED:');
        console.log(`   ${wealthsimpleEmails.length} Wealthsimple emails are waiting to be processed!`);
        console.log('   These emails should be automatically processed by the IMAP service.');
        console.log('   Check if the IMAP processing service is running and configured correctly.');
      } else {
        console.log('');
        console.log('✅ All Wealthsimple emails have been processed (marked as read).');
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
      console.log('1. Verify the Gmail App Password is correct in Supabase');
      console.log('2. Ensure 2-factor authentication is enabled on Gmail');
      console.log('3. Check that the App Password has IMAP access');
      console.log('4. Update the email configuration in Supabase database');
    } else if (error.message.includes('connection')) {
      console.log('');
      console.log('🔧 Connection issue - possible fixes:');
      console.log('1. Check internet connectivity on production server');
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
