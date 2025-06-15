#!/usr/bin/env node

/**
 * Quick database check script
 */

import { SupabaseService } from './src/services/supabaseService.js';

async function checkData() {
  console.log('🔍 Checking database data...\n');
  
  try {
    // Check portfolios
    const portfolios = await SupabaseService.portfolio.getPortfolios();
    console.log('📁 Portfolios:', portfolios.success ? `${portfolios.data.length} found` : `Error: ${portfolios.error}`);
    
    if (portfolios.success && portfolios.data.length > 0) {
      const portfolio = portfolios.data[0];
      console.log(`   - First portfolio: ${portfolio.name} (ID: ${portfolio.id})`);
      
      // Check transactions
      const transactions = await SupabaseService.transaction.getTransactions(portfolio.id);
      console.log('💰 Transactions:', transactions.success ? `${transactions.data.length} found` : `Error: ${transactions.error}`);
      
      // Check positions  
      const positions = await SupabaseService.position.getPositions(portfolio.id);
      console.log('📊 Positions:', positions.success ? `${positions.data.length} found` : `Error: ${positions.error}`);
      
      if (transactions.success && transactions.data.length > 0) {
        console.log('\n📝 Sample transactions:');
        transactions.data.slice(0, 3).forEach((t, i) => {
          console.log(`   ${i+1}. ${t.transaction_type} - ${t.asset?.symbol || 'N/A'} - $${t.total_amount} on ${t.transaction_date}`);
        });
      }
      
      // Test daily PL service
      console.log('\n🧮 Testing Daily PL Service...');
      const { dailyPLAnalyticsService } = await import('./src/services/analytics/dailyPLService.js');
      
      const today = new Date();
      const todayResult = await dailyPLAnalyticsService.getDayPLDetails(portfolio.id, today);
      console.log('Today PL Result:', todayResult.error ? `Error: ${todayResult.error}` : 'Success');
      
      if (todayResult.data) {
        console.log(`   - Total P/L: $${todayResult.data.totalPL}`);
        console.log(`   - Transaction Count: ${todayResult.data.transactionCount}`);
        console.log(`   - Has Transactions: ${todayResult.data.hasTransactions}`);
      }
      
    } else {
      console.log('\n💡 No portfolios found. Try running: node tools/debug/insert-mock-data.mjs');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkData();
