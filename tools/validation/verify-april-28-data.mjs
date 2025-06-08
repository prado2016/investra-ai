/**
 * Quick Database Verification for April 28, 2025 Transactions
 * Run this to verify if transactions exist in the database for the date
 */

import { SupabaseService } from './src/services/supabaseService.js';

async function verifyApril28Data() {
  try {
    console.log('🔍 Checking database for April 28, 2025 transactions...\n');
    
    // Get all portfolios
    const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
    if (!portfoliosResult.success) {
      console.error('❌ Failed to fetch portfolios:', portfoliosResult.error);
      return;
    }
    
    console.log(`📁 Found ${portfoliosResult.data.length} portfolios`);
    
    for (const portfolio of portfoliosResult.data) {
      console.log(`\n📊 Checking portfolio: ${portfolio.name} (${portfolio.id})`);
      
      // Get transactions for this portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolio.id);
      if (!transactionsResult.success) {
        console.error('❌ Failed to fetch transactions:', transactionsResult.error);
        continue;
      }
      
      console.log(`💰 Total transactions: ${transactionsResult.data.length}`);
      
      // Filter for April 28, 2025
      const april28Transactions = transactionsResult.data.filter(t => {
        const dateStr = typeof t.transaction_date === 'string' 
          ? t.transaction_date.split('T')[0] 
          : new Date(t.transaction_date).toISOString().split('T')[0];
        return dateStr === '2025-04-28';
      });
      
      console.log(`📅 April 28, 2025 transactions: ${april28Transactions.length}`);
      
      if (april28Transactions.length > 0) {
        console.log('🎯 Found April 28 transactions:');
        april28Transactions.forEach((t, index) => {
          console.log(`  ${index + 1}. ${t.asset?.symbol || 'Unknown'} - ${t.transaction_type} - $${t.total_amount}`);
          console.log(`     Date: ${t.transaction_date}`);
          console.log(`     ID: ${t.id}`);
        });
      } else {
        console.log('⚠️  No transactions found for April 28, 2025');
        
        // Show some sample transactions to verify date format
        const sampleTransactions = transactionsResult.data.slice(0, 3);
        console.log('\n📋 Sample transaction dates for reference:');
        sampleTransactions.forEach((t, index) => {
          console.log(`  ${index + 1}. ${t.asset?.symbol || 'Unknown'} - ${t.transaction_date}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyApril28Data();
