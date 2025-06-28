/**
 * Check if processed emails were actually converted to transactions
 * Updated to use the correct transaction_id relationship
 */

import { database } from './email-puller/dist/database.js';

async function checkEmailTransactionMapping() {
  try {
    console.log('🔍 Checking Email to Transaction Mapping');
    console.log('=========================================\n');

    // 1. Overall summary
    console.log('📊 OVERALL SUMMARY:');
    
    const { data: allProcessedEmails, error: allProcessedError } = await database['client']
      .from('imap_processed')
      .select('*');
    
    if (allProcessedError) {
      console.error('❌ Error fetching processed emails:', allProcessedError);
      return;
    }

    const { data: allTransactions, error: transError } = await database['client']
      .from('transactions')
      .select('id');
    
    if (transError) {
      console.error('❌ Error fetching transactions:', transError);
      return;
    }

    const totalProcessedEmails = allProcessedEmails?.length || 0;
    const approvedEmails = allProcessedEmails?.filter(e => e.processing_result === 'approved') || [];
    const processedEmails = allProcessedEmails?.filter(e => e.processing_result === 'processed') || [];
    const emailsWithTransactions = allProcessedEmails?.filter(e => e.transaction_id) || [];
    const totalTransactions = allTransactions?.length || 0;

    console.log(`   📧 Total processed emails: ${totalProcessedEmails}`);
    console.log(`   ✅ Approved emails: ${approvedEmails.length}`);
    console.log(`   🔄 Processed emails: ${processedEmails.length}`);
    console.log(`   🔗 Emails with transaction_id: ${emailsWithTransactions.length}`);
    console.log(`   💰 Total transactions: ${totalTransactions}`);
    console.log(`   ❓ Approved emails without transactions: ${approvedEmails.length - emailsWithTransactions.length}\n`);

    // 2. Processing results distribution
    const resultCounts = {};
    allProcessedEmails?.forEach(email => {
      const result = email.processing_result || 'unknown';
      resultCounts[result] = (resultCounts[result] || 0) + 1;
    });

    console.log('📈 PROCESSING RESULTS DISTRIBUTION:');
    Object.entries(resultCounts).forEach(([result, count]) => {
      const percentage = ((count / totalProcessedEmails) * 100).toFixed(1);
      console.log(`   ${result}: ${count} (${percentage}%)`);
    });
    console.log('');

    // 3. Find approved emails without transactions
    const approvedWithoutTransactions = approvedEmails.filter(email => !email.transaction_id);

    console.log('❌ APPROVED EMAILS WITHOUT TRANSACTIONS:');
    if (approvedWithoutTransactions.length === 0) {
      console.log('   ✅ All approved emails have corresponding transactions!\n');
    } else {
      console.log(`   Found ${approvedWithoutTransactions.length} approved emails without transactions:\n`);
      approvedWithoutTransactions.slice(0, 10).forEach((email, i) => {
        console.log(`   ${i+1}. Subject: ${email.subject || 'No Subject'}`);
        console.log(`      From: ${email.from_email || 'Unknown'}`);
        console.log(`      Processed: ${email.processed_at}`);
        console.log(`      Result: ${email.processing_result}`);
        console.log(`      Notes: ${email.processing_notes || 'None'}\n`);
      });
      
      if (approvedWithoutTransactions.length > 10) {
        console.log(`   ... and ${approvedWithoutTransactions.length - 10} more\n`);
      }
    }

    // 4. Check for orphaned transaction references
    const transactionIds = new Set(allTransactions?.map(t => t.id));
    const emailsWithInvalidTransactionId = emailsWithTransactions.filter(email => 
      email.transaction_id && !transactionIds.has(email.transaction_id)
    );

    console.log('🔗 TRANSACTION REFERENCE VALIDATION:');
    if (emailsWithInvalidTransactionId.length === 0) {
      console.log('   ✅ All email transaction references are valid!\n');
    } else {
      console.log(`   ❌ Found ${emailsWithInvalidTransactionId.length} emails with invalid transaction_id references\n`);
    }

    // 5. Recent email processing activity
    const { data: recentEmails, error: recentError } = await database['client']
      .from('imap_processed')
      .select('*')
      .gte('processed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('processed_at', { ascending: false })
      .limit(15);

    if (!recentError && recentEmails) {
      console.log('🕒 RECENT PROCESSED EMAILS (Last 7 days):');
      if (recentEmails.length === 0) {
        console.log('   No emails processed in the last 7 days\n');
      } else {
        recentEmails.forEach((email, i) => {
          console.log(`   ${i+1}. ${email.subject || 'No Subject'}`);
          console.log(`      From: ${email.from_email || 'Unknown'}`);
          console.log(`      Result: ${email.processing_result}`);
          console.log(`      Transaction: ${email.transaction_id ? '✅ ' + email.transaction_id : '❌ None'}`);
          console.log(`      Processed: ${email.processed_at}\n`);
        });
      }
    }

    // 6. Check for failed or pending emails
    const failedEmails = allProcessedEmails?.filter(email => 
      email.processing_result === 'failed' || 
      email.processing_result === 'pending' ||
      (email.processing_notes && (
        email.processing_notes.toLowerCase().includes('failed') ||
        email.processing_notes.toLowerCase().includes('error')
      ))
    ) || [];

    console.log('⚠️ FAILED OR PENDING PROCESSING:');
    if (failedEmails.length === 0) {
      console.log('   ✅ No failed or pending processing found!\n');
    } else {
      console.log(`   Found ${failedEmails.length} emails with processing issues:\n`);
      failedEmails.slice(0, 5).forEach((email, i) => {
        console.log(`   ${i+1}. Subject: ${email.subject || 'No Subject'}`);
        console.log(`      Result: ${email.processing_result}`);
        console.log(`      Notes: ${email.processing_notes || 'None'}`);
        console.log(`      Processed: ${email.processed_at}\n`);
      });
    }

    // 7. Summary and recommendations
    console.log('📋 SUMMARY & RECOMMENDATIONS:');
    const successRate = emailsWithTransactions.length / Math.max(approvedEmails.length, 1) * 100;
    console.log(`   📊 Transaction creation success rate: ${successRate.toFixed(1)}%`);
    
    if (approvedWithoutTransactions.length > 0) {
      console.log(`   ⚠️  ${approvedWithoutTransactions.length} approved emails need transaction creation`);
    }
    
    if (failedEmails.length > 0) {
      console.log(`   ⚠️  ${failedEmails.length} emails need reprocessing`);
    }
    
    if (approvedWithoutTransactions.length === 0 && failedEmails.length === 0) {
      console.log('   ✅ All emails are properly processed!');
    }

    console.log('\n✅ Email to Transaction mapping analysis complete!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkEmailTransactionMapping();