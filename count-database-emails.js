/**
 * Count emails in database tables directly
 */

import { database } from './email-puller/dist/database.js';

async function countEmails() {
  try {
    console.log('📊 Counting emails in database tables...');
    
    // Count inbox emails
    const { count: inboxCount, error: inboxError } = await database['client']
      .from('imap_inbox')
      .select('*', { count: 'exact', head: true });
    
    if (inboxError) {
      console.error('❌ Error counting inbox:', inboxError);
    } else {
      console.log(`📥 imap_inbox: ${inboxCount} emails`);
    }
    
    // Count processed emails
    const { count: processedCount, error: processedError } = await database['client']
      .from('imap_processed')
      .select('*', { count: 'exact', head: true });
    
    if (processedError) {
      console.error('❌ Error counting processed:', processedError);
    } else {
      console.log(`✅ imap_processed: ${processedCount} emails`);
    }
    
    const total = (inboxCount || 0) + (processedCount || 0);
    console.log(`📧 Total in database: ${total}`);
    console.log(`📮 Gmail reports: 57`);
    console.log(`❓ Difference: ${57 - total}`);
    
    // Check recent emails in inbox
    const { data: recentInbox, error: recentError } = await database['client']
      .from('imap_inbox')
      .select('message_id, subject, received_at')
      .order('received_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ Error getting recent inbox:', recentError);
    } else {
      console.log('\n📝 Recent inbox emails:');
      recentInbox?.forEach((email, i) => {
        console.log(`   ${i+1}. ${email.subject} (${email.received_at})`);
      });
    }
    
    // Check recent processed emails
    const { data: recentProcessed, error: recentProcessedError } = await database['client']
      .from('imap_processed')
      .select('message_id, subject, processed_at')
      .order('processed_at', { ascending: false })
      .limit(5);
    
    if (recentProcessedError) {
      console.error('❌ Error getting recent processed:', recentProcessedError);
    } else {
      console.log('\n✅ Recent processed emails:');
      recentProcessed?.forEach((email, i) => {
        console.log(`   ${i+1}. ${email.subject} (${email.processed_at})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

countEmails();