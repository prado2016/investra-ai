/**
 * Analyze All Transactions
 * Get overview of all transactions and their portfolio distribution
 */

import { supabase } from '../lib/supabase';

export async function analyzeAllTransactions(): Promise<void> {
  try {
    console.log('🔍 Analyzing ALL transactions...');

    // Get all portfolios first
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*');

    if (portfolioError) {
      console.error('❌ Error fetching portfolios:', portfolioError);
      return;
    }

    console.log(`📋 Found ${portfolios?.length || 0} portfolios:`);
    portfolios?.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });

    // Get ALL transactions
    const { data: allTransactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id, portfolio_id, notes, created_at')
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.error('❌ Error fetching transactions:', transactionError);
      return;
    }

    console.log(`\n📊 TOTAL TRANSACTIONS: ${allTransactions?.length || 0}`);

    if (!allTransactions || allTransactions.length === 0) {
      console.log('No transactions found');
      return;
    }

    // Analyze portfolio distribution
    const portfolioDistribution: { [key: string]: number } = {};
    let transactionsWithNotes = 0;
    let transactionsWithoutNotes = 0;

    for (const transaction of allTransactions) {
      // Count by portfolio
      const portfolioName = portfolios?.find(p => p.id === transaction.portfolio_id)?.name || 'Unknown';
      portfolioDistribution[portfolioName] = (portfolioDistribution[portfolioName] || 0) + 1;

      // Count notes
      if (transaction.notes) {
        transactionsWithNotes++;
      } else {
        transactionsWithoutNotes++;
      }
    }

    console.log('\n📊 PORTFOLIO DISTRIBUTION:');
    Object.entries(portfolioDistribution).forEach(([portfolioName, count]) => {
      console.log(`   ${portfolioName}: ${count} transactions`);
    });

    console.log('\n📝 NOTES ANALYSIS:');
    console.log(`   With notes: ${transactionsWithNotes} transactions`);
    console.log(`   Without notes: ${transactionsWithoutNotes} transactions`);

    // Check if there's a TFSA concentration issue
    const tfsaCount = portfolioDistribution['TFSA'] || 0;
    const totalCount = allTransactions.length;
    const tfsaPercentage = ((tfsaCount / totalCount) * 100).toFixed(1);

    if (tfsaCount > totalCount * 0.8) {
      console.log(`\n⚠️  WARNING: ${tfsaCount}/${totalCount} (${tfsaPercentage}%) transactions are in TFSA!`);
      console.log('   This suggests the original portfolio assignment issue.');
      
      // Sample some transactions without notes that are in TFSA
      const tfsaPortfolioId = portfolios?.find(p => p.name === 'TFSA')?.id;
      if (tfsaPortfolioId) {
        const { data: tfsaTransactionsWithoutNotes } = await supabase
          .from('transactions')
          .select('id, created_at, notes')
          .eq('portfolio_id', tfsaPortfolioId)
          .is('notes', null)
          .limit(10);

        if (tfsaTransactionsWithoutNotes && tfsaTransactionsWithoutNotes.length > 0) {
          console.log(`\n📋 Sample TFSA transactions WITHOUT notes (${tfsaTransactionsWithoutNotes.length} shown):`);
          tfsaTransactionsWithoutNotes.forEach(t => {
            console.log(`   - ${t.id} (${t.created_at})`);
          });
        }
      }
    }

    // Show recent transaction creation dates
    console.log('\n📅 RECENT TRANSACTIONS (last 10):');
    allTransactions.slice(0, 10).forEach(t => {
      const portfolioName = portfolios?.find(p => p.id === t.portfolio_id)?.name || 'Unknown';
      const hasNotes = t.notes ? '📝' : '📄';
      console.log(`   ${hasNotes} ${t.created_at}: ${portfolioName} (${t.id.slice(0, 8)}...)`);
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}