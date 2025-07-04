/**
 * Batch Update Covered Calls Utility
 * Processes all portfolios to identify and tag covered call transactions
 */

import { coveredCallProcessor, type CoveredCallAnalysis } from './coveredCallProcessor';
import { SupabaseService } from '../services/supabaseService';

export interface BatchCoveredCallResults {
  success: boolean;
  totalAnalyzed: number;
  totalTagged: number;
  coveredCallsFound: number;
  orphanSellsFound: number;
  portfoliosProcessed: number;
  errors: string[];
  results: Array<{
    portfolioId: string;
    portfolioName: string;
    analysis: CoveredCallAnalysis;
  }>;
}

/**
 * Main function to batch process covered calls across all portfolios
 */
export async function batchUpdateCoveredCalls(): Promise<BatchCoveredCallResults> {
  console.log('🚀 Starting batch covered call analysis and tagging');
  
  const results: BatchCoveredCallResults = {
    success: false,
    totalAnalyzed: 0,
    totalTagged: 0,
    coveredCallsFound: 0,
    orphanSellsFound: 0,
    portfoliosProcessed: 0,
    errors: [],
    results: []
  };

  try {
    // Get all portfolios
    const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
    if (!portfoliosResult.success) {
      throw new Error(`Failed to fetch portfolios: ${portfoliosResult.error}`);
    }

    const portfolios = portfoliosResult.data || [];
    console.log(`📁 Found ${portfolios.length} portfolios to process`);

    for (const portfolio of portfolios) {
      try {
        console.log(`🔄 Processing portfolio: ${portfolio.name} (${portfolio.id})`);
        
        // Analyze covered calls for this portfolio
        const analysis = await coveredCallProcessor.analyzePortfolioCoveredCalls(portfolio.id);
        
        // Tag transactions that are identified as covered calls
        const taggingResults = await tagCoveredCallTransactions(portfolio.id, analysis);
        
        results.results.push({
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          analysis
        });
        
        results.totalAnalyzed += analysis.orphanSells.length + analysis.coveredCallPairs.length;
        results.totalTagged += taggingResults.tagged;
        results.coveredCallsFound += analysis.newRules.length;
        results.orphanSellsFound += analysis.orphanSells.length;
        results.portfoliosProcessed++;
        
        if (analysis.errors.length > 0) {
          results.errors.push(...analysis.errors);
        }
        
        console.log(`✅ Portfolio ${portfolio.name}: ${analysis.newRules.length} covered calls found, ${taggingResults.tagged} transactions tagged`);
        
      } catch (error) {
        const errorMsg = `Error processing portfolio ${portfolio.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    results.success = results.errors.length === 0 || results.portfoliosProcessed > 0;
    
    console.log(`🎉 Batch processing complete:`);
    console.log(`   📊 Portfolios processed: ${results.portfoliosProcessed}`);
    console.log(`   🎯 Covered calls found: ${results.coveredCallsFound}`);
    console.log(`   📝 Transactions tagged: ${results.totalTagged}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);

    return results;
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Tag transactions in the database as covered calls
 */
async function tagCoveredCallTransactions(
  _portfolioId: string, 
  analysis: CoveredCallAnalysis
): Promise<{ tagged: number; errors: string[] }> {
  let tagged = 0;
  const errors: string[] = [];
  
  // Tag covered call sells
  for (const rule of analysis.newRules) {
    try {
      // Check if the sell transaction is already tagged
      const sellTransaction = analysis.orphanSells.find(t => t.id === rule.sellTransactionId);
      if (sellTransaction?.strategy_type === 'covered_call') {
        console.log(`⏭️ Sell transaction ${rule.sellTransactionId} already tagged as covered_call, skipping`);
        continue;
      }

      // Update the sell transaction
      const updateResult = await SupabaseService.transaction.updateTransaction(rule.sellTransactionId, {
        strategy_type: 'covered_call'
      });
      
      if (updateResult.success) {
        tagged++;
        console.log(`📝 Tagged sell transaction ${rule.sellTransactionId} as covered_call`);
      } else {
        const errorMsg = `Failed to tag sell transaction ${rule.sellTransactionId}: ${updateResult.error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
      
      // Tag buyback transaction if it exists
      if (rule.buybackTransactionId) {
        // For buyback transactions, we need to get the transaction first to check if it's already tagged
        // (we can't check orphanSells for buybacks since they're buy transactions)
        const buybackUpdateResult = await SupabaseService.transaction.updateTransaction(rule.buybackTransactionId, {
          strategy_type: 'covered_call'
        });
        
        if (buybackUpdateResult.success) {
          tagged++;
          console.log(`📝 Tagged buyback transaction ${rule.buybackTransactionId} as covered_call`);
        } else {
          const errorMsg = `Failed to tag buyback transaction ${rule.buybackTransactionId}: ${buybackUpdateResult.error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
    } catch (error) {
      const errorMsg = `Error tagging transactions for rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }
  
  return { tagged, errors };
}

/**
 * Detect potential covered call transactions and create update rules
 */
export async function detectCoveredCallOpportunities(): Promise<{
  success: boolean;
  potentialCoveredCalls: Array<{
    portfolioId: string;
    portfolioName: string;
    symbol: string;
    transactionId: string;
    transactionDate: string;
    premiumReceived: number;
    reason: string;
  }>;
  errors: string[];
}> {
  console.log('🔍 Detecting potential covered call opportunities');
  
  const potentialCoveredCalls: Array<{
    portfolioId: string;
    portfolioName: string;
    symbol: string;
    transactionId: string;
    transactionDate: string;
    premiumReceived: number;
    reason: string;
  }> = [];
  const errors: string[] = [];
  
  try {
    // Get all portfolios
    const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
    if (!portfoliosResult.success) {
      throw new Error(`Failed to fetch portfolios: ${portfoliosResult.error}`);
    }

    const portfolios = portfoliosResult.data || [];
    
    for (const portfolio of portfolios) {
      try {
        // Get all transactions
        const transactionsResult = await SupabaseService.transaction.getTransactions(portfolio.id);
        if (!transactionsResult.success) {
          errors.push(`Failed to fetch transactions for portfolio ${portfolio.name}: ${transactionsResult.error}`);
          continue;
        }
        
        const transactions = transactionsResult.data || [];
        
        // Find option sells that are NOT already tagged as covered_call
        const untaggedOptionSells = transactions.filter(t => 
          t.asset.asset_type === 'option' &&
          t.transaction_type === 'sell' &&
          t.strategy_type !== 'covered_call'
        );
        
        for (const sell of untaggedOptionSells) {
          // Check if there's insufficient quantity before this sell
          const earlierBuys = transactions.filter(t => 
            t.asset.symbol === sell.asset.symbol &&
            t.transaction_type === 'buy' &&
            new Date(t.transaction_date) < new Date(sell.transaction_date)
          );
          
          const totalBoughtQty = earlierBuys.reduce((sum, buy) => sum + buy.quantity, 0);
          
          if (totalBoughtQty < sell.quantity) {
            potentialCoveredCalls.push({
              portfolioId: portfolio.id,
              portfolioName: portfolio.name,
              symbol: sell.asset.symbol,
              transactionId: sell.id,
              transactionDate: sell.transaction_date,
              premiumReceived: sell.total_amount,
              reason: `Option sell of ${sell.quantity} with only ${totalBoughtQty} owned`
            });
          }
        }
        
      } catch (error) {
        const errorMsg = `Error analyzing portfolio ${portfolio.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`🎯 Found ${potentialCoveredCalls.length} potential covered call transactions`);
    
    return {
      success: true,
      potentialCoveredCalls,
      errors
    };
    
  } catch (error) {
    console.error('❌ Detection failed:', error);
    return {
      success: false,
      potentialCoveredCalls: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

export default batchUpdateCoveredCalls;