/**
 * Batch Update Transactions Portfolio Assignment
 * 
 * This script analyzes raw email data in transaction notes to extract
 * the correct portfolio/account names and updates portfolio assignments
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Create Supabase client using main app configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function batchUpdateTransactionPortfolios() {
  try {
    console.log('🔄 Starting batch update of transaction portfolios...');
    console.log('=========================================================\n');
    
    // Test connection and authentication
    console.log('🔍 Testing database connection...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.log('⚠️  No authenticated user found. Checking anonymous access...');
      
      // Try to fetch portfolios without authentication to see if RLS allows it
      const { data: testPortfolios, error: testError } = await supabase
        .from('portfolios')
        .select('count()', { count: 'exact', head: true });
      
      if (testError) {
        console.error('❌ Database access failed:', testError);
        console.log('💡 This script may need to be run from within the authenticated application context');
        return;
      } else {
        console.log(`✅ Anonymous access successful. Found ${testPortfolios || 0} portfolios total`);
      }
    } else {
      console.log(`✅ Authenticated as user: ${authData.user.id}`);
    }

    // Step 1: Get all portfolios for mapping
    console.log('📋 Fetching portfolios...');
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*');

    if (portfolioError) {
      console.error('❌ Error fetching portfolios:', portfolioError);
      return;
    }

    console.log(`✅ Found ${portfolios.length} portfolios:`);
    portfolios.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    console.log('');

    // Step 2: Get all transactions with raw email data
    console.log('📋 Fetching transactions...');
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id, portfolio_id, notes, created_at')
      .not('notes', 'is', null);

    if (transactionError) {
      console.error('❌ Error fetching transactions:', transactionError);
      return;
    }

    console.log(`✅ Found ${transactions.length} transactions with notes\n`);

    // Step 3: Analyze and update transactions
    let updateCount = 0;
    const updates = [];
    const portfolioMapping = {
      'TFSA': null,
      'RSP': null, 
      'RRSP': null,
      'MARGIN': null,
      'CASH': null
    };

    // Create portfolio mapping by name (case insensitive)
    for (const [accountType] of Object.entries(portfolioMapping)) {
      const matchingPortfolio = portfolios.find(p => 
        p.name.toUpperCase().includes(accountType)
      );
      if (matchingPortfolio) {
        portfolioMapping[accountType] = matchingPortfolio.id;
        console.log(`🔗 Mapped ${accountType} → ${matchingPortfolio.name} (${matchingPortfolio.id})`);
      }
    }
    console.log('');

    for (const transaction of transactions) {
      try {
        // Parse the notes JSON to extract portfolio info
        const notes = JSON.parse(transaction.notes);
        let extractedAccountType = null;

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
            updateCount++;
          }
        } else {
          console.log(`⚠️  Could not extract account type for transaction ${transaction.id}`);
        }

      } catch (parseError) {
        console.log(`⚠️  Could not parse notes for transaction ${transaction.id}:`, parseError.message);
      }
    }

    console.log(`\n📊 Analysis Results:`);
    console.log(`   Total transactions analyzed: ${transactions.length}`);
    console.log(`   Transactions needing update: ${updateCount}`);
    console.log('');

    if (updates.length === 0) {
      console.log('✅ No updates needed - all transactions are already correctly assigned!');
      return;
    }

    // Group updates by account type for summary
    const updatesByType = {};
    updates.forEach(update => {
      if (!updatesByType[update.accountType]) {
        updatesByType[update.accountType] = 0;
      }
      updatesByType[update.accountType]++;
    });

    console.log('📋 Updates needed by account type:');
    Object.entries(updatesByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} transactions`);
    });
    console.log('');

    // Ask for confirmation (in production, you might want to add a prompt here)
    console.log('🚀 Proceeding with batch update...');

    // Step 4: Execute updates in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(updates.length/batchSize)} (${batch.length} transactions)`);

      for (const update of batch) {
        try {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ portfolio_id: update.newPortfolioId })
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Error updating transaction ${update.id}:`, updateError.message);
            errorCount++;
          } else {
            console.log(`✅ Updated transaction ${update.id}: ${update.accountType} → ${update.newPortfolioId}`);
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Exception updating transaction ${update.id}:`, error.message);
          errorCount++;
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Batch Update Complete!');
    console.log('========================');
    console.log(`✅ Successfully updated: ${successCount} transactions`);
    console.log(`❌ Failed to update: ${errorCount} transactions`);
    console.log(`📊 Total processed: ${successCount + errorCount} transactions`);

    // Step 5: Verification - count transactions by portfolio
    console.log('\n📊 Final Portfolio Distribution:');
    const { data: finalCounts } = await supabase
      .from('transactions')
      .select('portfolio_id, count(*)')
      .group('portfolio_id');

    if (finalCounts) {
      for (const count of finalCounts) {
        const portfolio = portfolios.find(p => p.id === count.portfolio_id);
        const portfolioName = portfolio ? portfolio.name : 'Unknown';
        console.log(`   ${portfolioName}: ${count.count} transactions`);
      }
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
batchUpdateTransactionPortfolios();