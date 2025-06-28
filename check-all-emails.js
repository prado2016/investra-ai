/**
 * Check all emails in database regardless of user_id
 */

import { database } from './email-puller/dist/database.js';

async function checkAllEmails() {
  try {
    console.log('🔍 Checking ALL emails in database');
    console.log('=================================\n');

    // Check total emails in imap_inbox (all users)
    console.log('1️⃣ All emails in imap_inbox...');
    
    const { count: totalInboxCount, error: inboxError } = await database['client']
      .from('imap_inbox')
      .select('*', { count: 'exact', head: true });

    if (inboxError) {
      console.error('❌ Failed to count inbox emails:', inboxError);
    } else {
      console.log(`✅ Total emails in imap_inbox: ${totalInboxCount || 0}`);
    }

    // Check total emails in imap_processed (all users)
    console.log('\n2️⃣ All emails in imap_processed...');
    
    const { count: totalProcessedCount, error: processedError } = await database['client']
      .from('imap_processed')
      .select('*', { count: 'exact', head: true });

    if (processedError) {
      console.error('❌ Failed to count processed emails:', processedError);
    } else {
      console.log(`✅ Total emails in imap_processed: ${totalProcessedCount || 0}`);
    }

    // Show unique user_ids in each table
    console.log('\n3️⃣ Unique user IDs in imap_inbox...');
    
    const { data: inboxUsers, error: inboxUsersError } = await database['client']
      .from('imap_inbox')
      .select('user_id')
      .not('user_id', 'is', null);

    if (!inboxUsersError && inboxUsers) {
      const uniqueInboxUsers = [...new Set(inboxUsers.map(u => u.user_id))];
      console.log(`Found ${uniqueInboxUsers.length} unique user(s) in imap_inbox:`);
      uniqueInboxUsers.forEach(userId => {
        console.log(`   - ${userId}`);
      });
    }

    console.log('\n4️⃣ Unique user IDs in imap_processed...');
    
    const { data: processedUsers, error: processedUsersError } = await database['client']
      .from('imap_processed')
      .select('user_id')
      .not('user_id', 'is', null);

    if (!processedUsersError && processedUsers) {
      const uniqueProcessedUsers = [...new Set(processedUsers.map(u => u.user_id))];
      console.log(`Found ${uniqueProcessedUsers.length} unique user(s) in imap_processed:`);
      uniqueProcessedUsers.forEach(userId => {
        console.log(`   - ${userId}`);
      });
    }

    // Sample recent emails with user_id
    console.log('\n5️⃣ Sample recent emails from imap_inbox...');
    const { data: sampleInbox } = await database['client']
      .from('imap_inbox')
      .select('user_id, subject, received_at')
      .order('received_at', { ascending: false })
      .limit(5);

    if (sampleInbox && sampleInbox.length > 0) {
      sampleInbox.forEach((email, i) => {
        console.log(`   ${i+1}. User: ${email.user_id} | ${email.subject.substring(0, 40)}... | ${email.received_at}`);
      });
    } else {
      console.log('   No emails found in imap_inbox');
    }

    console.log('\n6️⃣ Sample recent emails from imap_processed...');
    const { data: sampleProcessed } = await database['client']
      .from('imap_processed')
      .select('user_id, subject, processed_at')
      .order('processed_at', { ascending: false })
      .limit(5);

    if (sampleProcessed && sampleProcessed.length > 0) {
      sampleProcessed.forEach((email, i) => {
        console.log(`   ${i+1}. User: ${email.user_id} | ${email.subject.substring(0, 40)}... | ${email.processed_at}`);
      });
    } else {
      console.log('   No emails found in imap_processed');
    }

    // Total summary
    const grandTotal = (totalInboxCount || 0) + (totalProcessedCount || 0);
    console.log('\n📊 GRAND TOTAL SUMMARY:');
    console.log(`   📧 Total inbox: ${totalInboxCount || 0}`);
    console.log(`   ✅ Total processed: ${totalProcessedCount || 0}`);
    console.log(`   🔢 GRAND TOTAL: ${grandTotal}`);

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkAllEmails();