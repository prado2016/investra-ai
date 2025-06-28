/**
 * Analyze the 14 approved emails without transactions to understand why
 */

import { database } from './email-puller/dist/database.js';

async function analyzeMissingTransactions() {
  try {
    console.log('🔍 Analyzing 14 Approved Emails Without Transactions');
    console.log('=================================================\n');

    // Get the 14 approved emails without transactions
    const { data: missingTransactionEmails, error } = await database['client']
      .from('imap_processed')
      .select('*')
      .eq('processing_result', 'approved')
      .is('transaction_id', null)
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching emails:', error);
      return;
    }

    if (!missingTransactionEmails || missingTransactionEmails.length === 0) {
      console.log('✅ No approved emails without transactions found!');
      return;
    }

    console.log(`📧 Found ${missingTransactionEmails.length} approved emails without transactions:\n`);

    // Analyze each email
    missingTransactionEmails.forEach((email, i) => {
      console.log(`${i + 1}. EMAIL ANALYSIS:`);
      console.log(`   Subject: ${email.subject || 'No Subject'}`);
      console.log(`   From: ${email.from_email || 'Unknown'}`);
      console.log(`   Processed: ${email.processed_at}`);
      console.log(`   Processing Notes: ${email.processing_notes || 'None'}`);
      console.log(`   Message ID: ${email.message_id}`);
      
      // Check if it has text content to analyze
      if (email.text_content) {
        const textSnippet = email.text_content.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   Text Preview: ${textSnippet}...`);
      }
      
      console.log('');
    });

    // Look for patterns
    console.log('📊 PATTERN ANALYSIS:');
    
    // Group by processing notes
    const notePatterns = {};
    missingTransactionEmails.forEach(email => {
      const note = email.processing_notes || 'No Notes';
      notePatterns[note] = (notePatterns[note] || 0) + 1;
    });

    console.log('   Processing Notes Patterns:');
    Object.entries(notePatterns).forEach(([note, count]) => {
      console.log(`     "${note}": ${count} emails`);
    });
    console.log('');

    // Group by date
    const datePatterns = {};
    missingTransactionEmails.forEach(email => {
      const date = email.processed_at.split('T')[0];
      datePatterns[date] = (datePatterns[date] || 0) + 1;
    });

    console.log('   Processing Date Patterns:');
    Object.entries(datePatterns).forEach(([date, count]) => {
      console.log(`     ${date}: ${count} emails`);
    });
    console.log('');

    // Check if they contain transaction data we could extract
    console.log('💰 TRANSACTION DATA ANALYSIS:');
    let potentialTransactions = 0;
    
    missingTransactionEmails.forEach((email, i) => {
      const text = email.text_content || '';
      const hasSymbol = /[A-Z]{2,5}/.test(text);
      const hasAmount = /\$[\d,]+(\.\d{2})?/.test(text);
      const hasShares = /\d+(\.\d+)?\s*(shares?|units?)/.test(text);
      
      if (hasSymbol || hasAmount || hasShares) {
        potentialTransactions++;
        console.log(`   Email ${i + 1}: Could contain transaction data`);
        if (hasSymbol) console.log(`     - Has symbol pattern`);
        if (hasAmount) console.log(`     - Has amount pattern`);
        if (hasShares) console.log(`     - Has shares pattern`);
      }
    });

    console.log(`\n   ${potentialTransactions}/${missingTransactionEmails.length} emails might contain extractable transaction data\n`);

    // Show options for resolution
    console.log('🛠️ RESOLUTION OPTIONS:');
    console.log('   1. REPROCESS EMAILS: Try to extract transaction data from these emails');
    console.log('   2. MARK AS EXPENSES: Update their status to indicate they are expenses');
    console.log('   3. MANUAL REVIEW: Examine each email individually');
    console.log('   4. IGNORE: Leave as-is if they are correctly marked as expenses');
    console.log('');

    // Generate specific recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (notePatterns['Reviewed as expense: Your order has been filled']) {
      const expenseCount = notePatterns['Reviewed as expense: Your order has been filled'];
      console.log(`   • ${expenseCount} emails are marked as "expenses" - these may be fees or non-transaction emails`);
      console.log(`   • Consider updating processing_result to "expense" for clarity`);
    }

    if (potentialTransactions > 0) {
      console.log(`   • ${potentialTransactions} emails might contain transaction data worth reprocessing`);
      console.log(`   • Try running AI extraction on these emails again`);
    }

    console.log('\n✅ Analysis complete! Use the options above to resolve the missing transactions.');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

analyzeMissingTransactions();