#!/usr/bin/env node

/**
 * Simple dashboard debug script
 * Tests the core functionality step by step
 */

import { SupabaseService } from './src/services/supabaseService.js';
import { dailyPLAnalyticsService } from './src/services/analytics/dailyPLService.js';

async function debugDashboard() {
  console.log('🔍 Dashboard Debug - Starting...\n');
  
  try {
    console.log('1️⃣ Testing Authentication...');
    const authResult = await SupabaseService.auth.getUser();
    console.log('   Auth result:', authResult.user ? `User: ${authResult.user.email}` : 'No user');
    
    if (!authResult.user) {
      console.log('❌ No authenticated user found.');
      console.log('💡 You need to sign in first. Try this:');
      console.log('   1. Open the app in browser');
      console.log('   2. Sign in/sign up');
      console.log('   3. Run this script again');
      return;
    }
    
    console.log('\n2️⃣ Testing Portfolio Fetch...');
    const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
    console.log('   Portfolios result:', portfoliosResult.success ? `${portfoliosResult.data.length} portfolios` : `Error: ${portfoliosResult.error}`);
    
    if (!portfoliosResult.success || portfoliosResult.data.length === 0) {
      console.log('📝 Creating default portfolio...');
      const createResult = await SupabaseService.portfolio.createPortfolio(
        'Test Portfolio',
        'Created by debug script',
        'USD'
      );
      
      if (createResult.success) {
        console.log('✅ Portfolio created:', createResult.data.name);
        portfoliosResult.data = [createResult.data];
      } else {
        console.log('❌ Failed to create portfolio:', createResult.error);
        return;
      }
    }
    
    const portfolio = portfoliosResult.data[0];
    console.log(`   Using portfolio: ${portfolio.name} (${portfolio.id})`);
    
    console.log('\n3️⃣ Testing Transaction Fetch...');
    const transactionsResult = await SupabaseService.transaction.getTransactions(portfolio.id);
    console.log('   Transactions result:', transactionsResult.success ? `${transactionsResult.data.length} transactions` : `Error: ${transactionsResult.error}`);
    
    console.log('\n4️⃣ Testing Daily P/L Service...');
    const today = new Date();
    const todayResult = await dailyPLAnalyticsService.getDayPLDetails(portfolio.id, today);
    console.log('   Today P/L result:', todayResult.error ? `Error: ${todayResult.error}` : `Success - P/L: $${todayResult.data.totalPL}`);
    
    const monthResult = await dailyPLAnalyticsService.getCurrentMonthPL(portfolio.id);
    console.log('   Current month result:', monthResult.error ? `Error: ${monthResult.error}` : `Success - Total P/L: $${monthResult.data.totalMonthlyPL}`);
    
    console.log('\n5️⃣ Summary:');
    console.log('   ✅ Auth:', authResult.user ? 'Working' : 'Failed');
    console.log('   ✅ Portfolios:', portfoliosResult.success ? 'Working' : 'Failed');
    console.log('   ✅ Transactions:', transactionsResult.success ? 'Working' : 'Failed');
    console.log('   ✅ Daily P/L:', todayResult.error ? 'Failed' : 'Working');
    console.log('   ✅ Monthly P/L:', monthResult.error ? 'Failed' : 'Working');
    
    if (todayResult.error || monthResult.error) {
      console.log('\n❌ Dashboard metrics will fail because Daily P/L service has issues.');
      console.log('💡 Try enabling mock data: VITE_USE_MOCK_DASHBOARD=true');
    } else {
      console.log('\n✅ All systems working. Dashboard should display real data.');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDashboard();
