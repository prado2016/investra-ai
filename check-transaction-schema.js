/**
 * Check the actual transaction table schema
 */

import { database } from './email-puller/dist/database.js';

async function checkTransactionSchema() {
  try {
    console.log('🔍 Checking Transaction Table Schema');
    console.log('===================================\n');

    // Get sample transaction to see structure
    const { data: sampleTransactions, error } = await database['client']
      .from('transactions')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching transactions:', error);
      return;
    }

    if (sampleTransactions && sampleTransactions.length > 0) {
      console.log('📝 Sample Transaction Structure:');
      const sample = sampleTransactions[0];
      Object.keys(sample).forEach(key => {
        console.log(`   ${key}: ${typeof sample[key]} (${sample[key]})`);
      });
      console.log('\n');
      
      // Check if any column might contain email references
      console.log('🔍 Looking for email-related columns:');
      const emailColumns = Object.keys(sample).filter(key => 
        key.toLowerCase().includes('email') || 
        key.toLowerCase().includes('message') ||
        key.toLowerCase().includes('source')
      );
      
      if (emailColumns.length > 0) {
        console.log('   Found potential email columns:', emailColumns);
      } else {
        console.log('   ❌ No obvious email-related columns found');
      }
      
      // Check recent transactions
      console.log('\n🕒 Recent Transactions:');
      sampleTransactions.forEach((trans, i) => {
        console.log(`   ${i+1}. Type: ${trans.transaction_type}`);
        console.log(`      Symbol: ${trans.symbol}`);
        console.log(`      Date: ${trans.transaction_date}`);
        console.log(`      Amount: ${trans.quantity} @ ${trans.price}`);
        if (trans.notes) console.log(`      Notes: ${trans.notes}`);
        console.log('');
      });
      
    } else {
      console.log('❌ No transactions found in table');
    }

    // Check processed emails to see if they reference transactions
    const { data: processedEmails, error: processedError } = await database['client']
      .from('imap_processed')
      .select('*')
      .not('transaction_id', 'is', null)
      .limit(5);

    if (!processedError && processedEmails) {
      console.log('🔗 Processed Emails with Transaction References:');
      if (processedEmails.length === 0) {
        console.log('   No processed emails have transaction_id references');
      } else {
        processedEmails.forEach((email, i) => {
          console.log(`   ${i+1}. Subject: ${email.subject}`);
          console.log(`      Transaction ID: ${email.transaction_id}`);
          console.log(`      Processing Result: ${email.processing_result}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkTransactionSchema();