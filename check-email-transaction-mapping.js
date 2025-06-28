/**
 * Check if processed emails were actually converted to transactions
 */

import { database } from './email-puller/dist/database.js';

async function checkEmailTransactionMapping() {
  try {
    console.log('🔍 Checking Email to Transaction Mapping');
    console.log('=========================================\n');

    // 1. Overall summary
    console.log('📊 OVERALL SUMMARY:');
    
    const { data: processedEmails, error: processedError } = await database['client']
      .from('imap_processed')
      .select('*')
      .eq('processing_result', 'processed');
    
    if (processedError) {
      console.error('❌ Error fetching processed emails:', processedError);
      return;
    }

    const { data: transactions, error: transError } = await database['client']
      .from('transactions')
      .select('email_message_id')
      .not('email_message_id', 'is', null);
    
    if (transError) {
      console.error('❌ Error fetching transactions:', transError);
      return;
    }

    const processedCount = processedEmails?.length || 0;
    const transactionCount = transactions?.length || 0;
    const uniqueEmailTransactions = new Set(transactions?.map(t => t.email_message_id)).size;

    console.log(`   📧 Processed emails: ${processedCount}`);
    console.log(`   💰 Transactions with email_id: ${transactionCount}`);
    console.log(`   🔗 Unique email transactions: ${uniqueEmailTransactions}`);
    console.log(`   ❓ Missing transactions: ${processedCount - uniqueEmailTransactions}\n`);

    // 2. Find processed emails without transactions
    const emailsWithTransactions = new Set(transactions?.map(t => t.email_message_id));
    const emailsWithoutTransactions = processedEmails?.filter(email => 
      !emailsWithTransactions.has(email.message_id)
    ) || [];

    console.log('❌ PROCESSED EMAILS WITHOUT TRANSACTIONS:');
    if (emailsWithoutTransactions.length === 0) {
      console.log('   ✅ All processed emails have corresponding transactions!\n');
    } else {
      console.log(`   Found ${emailsWithoutTransactions.length} processed emails without transactions:\n`);
      emailsWithoutTransactions.slice(0, 10).forEach((email, i) => {
        console.log(`   ${i+1}. Subject: ${email.subject || 'No Subject'}`);
        console.log(`      From: ${email.from_email || 'Unknown'}`);
        console.log(`      Processed: ${email.processed_at}`);
        console.log(`      Message ID: ${email.message_id}`);
        console.log(`      Notes: ${email.processing_notes || 'None'}\n`);
      });
      
      if (emailsWithoutTransactions.length > 10) {
        console.log(`   ... and ${emailsWithoutTransactions.length - 10} more\n`);
      }
    }

    // 3. Check processing results distribution
    const { data: allProcessed, error: allError } = await database['client']
      .from('imap_processed')
      .select('processing_result');

    if (!allError && allProcessed) {
      const resultCounts = {};
      allProcessed.forEach(email => {
        const result = email.processing_result || 'unknown';
        resultCounts[result] = (resultCounts[result] || 0) + 1;
      });

      console.log('📈 PROCESSING RESULTS DISTRIBUTION:');
      Object.entries(resultCounts).forEach(([result, count]) => {
        const percentage = ((count / allProcessed.length) * 100).toFixed(1);
        console.log(`   ${result}: ${count} (${percentage}%)`);
      });
      console.log('');
    }

    // 4. Check recent activity
    const { data: recentEmails, error: recentError } = await database['client']
      .from('imap_processed')
      .select('*')
      .gte('processed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('processed_at', { ascending: false })
      .limit(10);

    if (!recentError && recentEmails) {
      console.log('🕒 RECENT PROCESSED EMAILS (Last 7 days):');
      if (recentEmails.length === 0) {
        console.log('   No emails processed in the last 7 days\n');
      } else {
        for (const email of recentEmails) {
          const hasTransaction = emailsWithTransactions.has(email.message_id);
          console.log(`   📧 ${email.subject || 'No Subject'}`);
          console.log(`      From: ${email.from_email || 'Unknown'}`);
          console.log(`      Processed: ${email.processed_at}`);
          console.log(`      Result: ${email.processing_result}`);
          console.log(`      Transaction: ${hasTransaction ? '✅ Yes' : '❌ No'}\n`);
        }
      }
    }

    // 5. Check for failed processing
    const { data: failedEmails, error: failedError } = await database['client']
      .from('imap_processed')
      .select('*')
      .or('processing_result.eq.failed,processing_notes.ilike.%failed%,processing_notes.ilike.%error%');

    if (!failedError && failedEmails) {
      console.log('⚠️ FAILED OR ERROR PROCESSING:');
      if (failedEmails.length === 0) {
        console.log('   ✅ No failed processing found!\n');
      } else {
        console.log(`   Found ${failedEmails.length} emails with processing issues:\n`);
        failedEmails.slice(0, 5).forEach((email, i) => {
          console.log(`   ${i+1}. Subject: ${email.subject || 'No Subject'}`);
          console.log(`      Result: ${email.processing_result}`);
          console.log(`      Notes: ${email.processing_notes || 'None'}\n`);
        });
      }
    }

    console.log('✅ Email to Transaction mapping analysis complete!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkEmailTransactionMapping();