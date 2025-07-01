/**
 * Update the 14 expense emails to have proper status for clarity
 */

import { database } from './email-puller/dist/database.js';

async function fixExpenseEmailStatus() {
  try {
    console.log('🔧 Updating Expense Email Status');
    console.log('===============================\n');

    // Get the 14 approved emails marked as expenses
    const { data: expenseEmails, error: fetchError } = await database['client']
      .from('imap_processed')
      .select('*')
      .eq('processing_result', 'approved')
      .is('transaction_id', null)
      .ilike('processing_notes', '%expense%');

    if (fetchError) {
      console.error('❌ Error fetching expense emails:', fetchError);
      return;
    }

    if (!expenseEmails || expenseEmails.length === 0) {
      console.log('✅ No expense emails found to update');
      return;
    }

    console.log(`📧 Found ${expenseEmails.length} emails marked as expenses`);

    // Show what we're about to update
    console.log('\n📋 EMAILS TO UPDATE:');
    expenseEmails.forEach((email, i) => {
      console.log(`   ${i+1}. ${email.subject} (${email.processed_at})`);
    });

    console.log('\n🔄 UPDATING STATUS...');

    // Update processing_result from "approved" to "expense" for clarity
    const { error: updateError } = await database['client']
      .from('imap_processed')
      .update({
        processing_result: 'expense',
        processing_notes: 'Classified as expense - no transaction created'
      })
      .eq('processing_result', 'approved')
      .is('transaction_id', null)
      .ilike('processing_notes', '%expense%');

    if (updateError) {
      console.error('❌ Error updating emails:', updateError);
      return;
    }

    console.log('✅ Successfully updated expense emails!');

    // Verify the update
    const { data: verifyData, error: verifyError } = await database['client']
      .from('imap_processed')
      .select('*')
      .eq('processing_result', 'expense');

    if (!verifyError && verifyData) {
      console.log(`\n📊 VERIFICATION: ${verifyData.length} emails now have "expense" status`);
    }

    // Show updated summary
    const { data: summaryData, error: summaryError } = await database['client']
      .from('imap_processed')
      .select('processing_result');

    if (!summaryError && summaryData) {
      const statusCounts = {};
      summaryData.forEach(email => {
        const status = email.processing_result || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log('\n📈 UPDATED STATUS DISTRIBUTION:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        const percentage = ((count / summaryData.length) * 100).toFixed(1);
        console.log(`   ${status}: ${count} (${percentage}%)`);
      });
    }

    console.log('\n✅ Expense email status update complete!');
    console.log('💡 Now your analytics will show:');
    console.log('   • Approved emails = emails that created transactions');
    console.log('   • Expense emails = emails that were expenses/fees');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Ask for confirmation before running
console.log('⚠️  This will update 14 emails from "approved" to "expense" status');
console.log('   This is recommended for clarity but is irreversible');
console.log('   Continue? Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

setTimeout(() => {
  fixExpenseEmailStatus();
}, 5000);