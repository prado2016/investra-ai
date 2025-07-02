/**
 * Batch Update Transactions Portfolio Assignment
 * 
 * This utility analyzes raw email data in transaction notes to extract
 * the correct portfolio/account names and updates portfolio assignments
 */

import { supabase } from '../lib/supabase';

interface UpdateResult {
  id: string;
  oldPortfolioId: string;
  newPortfolioId: string;
  accountType: string;
  createdAt: string;
}

export async function batchUpdateTransactionPortfolios(): Promise<{
  success: boolean;
  totalAnalyzed: number;
  totalUpdated: number;
  errors: string[];
  results: UpdateResult[];
}> {
  const errors: string[] = [];
  const results: UpdateResult[] = [];

  try {
    console.log('🔄 Starting batch update of transaction portfolios...');

    // Step 1: Get all portfolios for mapping
    console.log('📋 Fetching portfolios...');
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*');

    if (portfolioError) {
      console.error('❌ Error fetching portfolios:', portfolioError);
      throw new Error(`Failed to fetch portfolios: ${portfolioError.message}`);
    }

    console.log(`✅ Found ${portfolios?.length || 0} portfolios`);
    portfolios?.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });

    if (!portfolios || portfolios.length === 0) {
      throw new Error('No portfolios found');
    }

    // Step 2: Get all transactions with raw email data
    console.log('📋 Fetching transactions...');
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id, portfolio_id, notes, created_at')
      .not('notes', 'is', null);

    if (transactionError) {
      console.error('❌ Error fetching transactions:', transactionError);
      throw new Error(`Failed to fetch transactions: ${transactionError.message}`);
    }

    console.log(`✅ Found ${transactions?.length || 0} transactions with notes`);

    if (!transactions || transactions.length === 0) {
      return {
        success: true,
        totalAnalyzed: 0,
        totalUpdated: 0,
        errors: [],
        results: []
      };
    }

    // Step 3: Create portfolio mapping by account type
    const portfolioMapping: { [key: string]: string } = {};
    
    for (const accountType of ['TFSA', 'RSP', 'RRSP', 'MARGIN', 'CASH']) {
      const matchingPortfolio = portfolios.find(p => 
        p.name.toUpperCase().includes(accountType)
      );
      if (matchingPortfolio) {
        portfolioMapping[accountType] = matchingPortfolio.id;
        console.log(`🔗 Mapped ${accountType} → ${matchingPortfolio.name} (${matchingPortfolio.id})`);
      }
    }

    // Step 4: Analyze and prepare updates
    const updates: UpdateResult[] = [];
    
    for (const transaction of transactions) {
      try {
        const notes = JSON.parse(transaction.notes);
        let extractedAccountType: string | null = null;

        // Check multiple places for portfolio/account info
        if (notes.aiResponse?.extractedData?.portfolioName) {
          extractedAccountType = notes.aiResponse.extractedData.portfolioName.toUpperCase();
        } else if (notes.aiResponse?.rawData?.extractedText) {
          // Look for "Account: *TFSA*" pattern in raw text
          const accountMatch = notes.aiResponse.rawData.extractedText.match(/Account:\s*\*([^*]+)\*/i);
          if (accountMatch) {
            extractedAccountType = accountMatch[1].toUpperCase();
          }
        } else if (notes.originalEmail?.content) {
          // Look in original email content
          const accountMatch = notes.originalEmail.content.match(/Account:\s*\*([^*]+)\*/i);
          if (accountMatch) {
            extractedAccountType = accountMatch[1].toUpperCase();
          }
        }

        if (extractedAccountType && portfolioMapping[extractedAccountType]) {
          const newPortfolioId = portfolioMapping[extractedAccountType];
          if (transaction.portfolio_id !== newPortfolioId) {
            updates.push({
              id: transaction.id,
              oldPortfolioId: transaction.portfolio_id,
              newPortfolioId: newPortfolioId,
              accountType: extractedAccountType,
              createdAt: transaction.created_at
            });
          }
        } else {
          console.log(`⚠️  Could not extract account type for transaction ${transaction.id}`);
        }

      } catch (parseError) {
        const errorMsg = `Could not parse notes for transaction ${transaction.id}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
        console.log(`⚠️  ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n📊 Analysis Results:`);
    console.log(`   Total transactions analyzed: ${transactions.length}`);
    console.log(`   Transactions needing update: ${updates.length}`);

    if (updates.length === 0) {
      console.log('✅ No updates needed - all transactions are already correctly assigned!');
      return {
        success: true,
        totalAnalyzed: transactions.length,
        totalUpdated: 0,
        errors,
        results: []
      };
    }

    // Group updates by account type for summary
    const updatesByType: { [key: string]: number } = {};
    updates.forEach(update => {
      updatesByType[update.accountType] = (updatesByType[update.accountType] || 0) + 1;
    });

    console.log('📋 Updates needed by account type:');
    Object.entries(updatesByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} transactions`);
    });

    // Step 5: Execute updates
    console.log('\n🚀 Proceeding with batch update...');
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ portfolio_id: update.newPortfolioId })
          .eq('id', update.id);

        if (updateError) {
          const errorMsg = `Error updating transaction ${update.id}: ${updateError.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          errorCount++;
        } else {
          console.log(`✅ Updated transaction ${update.id}: ${update.accountType} → ${update.newPortfolioId}`);
          results.push(update);
          successCount++;
        }
      } catch (error) {
        const errorMsg = `Exception updating transaction ${update.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        errorCount++;
      }
    }

    console.log('\n🎉 Batch Update Complete!');
    console.log('========================');
    console.log(`✅ Successfully updated: ${successCount} transactions`);
    console.log(`❌ Failed to update: ${errorCount} transactions`);
    console.log(`📊 Total processed: ${successCount + errorCount} transactions`);

    return {
      success: errorCount === 0,
      totalAnalyzed: transactions.length,
      totalUpdated: successCount,
      errors,
      results
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Script error:', errorMsg);
    errors.push(errorMsg);
    
    return {
      success: false,
      totalAnalyzed: 0,
      totalUpdated: 0,
      errors,
      results: []
    };
  }
}