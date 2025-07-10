/**
 * Covered Call Processor Utility
 * Handles detection and P/L calculation for covered call transactions
 */

import { SupabaseService } from '../services/supabaseService';
import type { EnhancedTransaction } from '../services/analytics/dailyPLService';

export interface CoveredCallRule {
  id: string;
  symbol: string;
  sellTransactionId: string;
  buybackTransactionId?: string;
  sellDate: string;
  buybackDate?: string;
  premiumReceived: number;
  premiumPaid?: number;
  profit: number;
  status: 'open' | 'closed' | 'expired';
  portfolioId: string;
}

export interface CoveredCallAnalysis {
  orphanSells: EnhancedTransaction[];
  coveredCallPairs: CoveredCallRule[];
  newRules: CoveredCallRule[];
  errors: string[];
}

export class CoveredCallProcessor {
  /**
   * Analyze all option transactions and identify covered call patterns
   */
  async analyzePortfolioCoveredCalls(portfolioId: string): Promise<CoveredCallAnalysis> {
    console.log(`🔍 Analyzing covered calls for portfolio: ${portfolioId}`);
    
    try {
      // Get all option transactions for this portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      if (!transactionsResult.success) {
        throw new Error(`Failed to fetch transactions: ${transactionsResult.error}`);
      }

      const allTransactions = transactionsResult.data || [];
      
      // Filter option transactions
      const optionTransactions = allTransactions.filter(t => 
        t.asset.asset_type === 'option'
      );

      console.log(`📊 Found ${optionTransactions.length} option transactions`);

      // Group by symbol
      const transactionsBySymbol = this.groupTransactionsBySymbol(optionTransactions);
      
      const orphanSells: EnhancedTransaction[] = [];
      const coveredCallPairs: CoveredCallRule[] = [];
      const newRules: CoveredCallRule[] = [];
      const errors: string[] = [];

      // Process each symbol
      for (const [symbol, transactions] of transactionsBySymbol.entries()) {
        try {
          const symbolAnalysis = await this.analyzeSymbolTransactions(symbol, transactions, portfolioId);
          orphanSells.push(...symbolAnalysis.orphanSells);
          coveredCallPairs.push(...symbolAnalysis.coveredCallPairs);
          newRules.push(...symbolAnalysis.newRules);
        } catch (error) {
          const errorMsg = `Error analyzing symbol ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`✅ Analysis complete: ${orphanSells.length} orphan sells, ${coveredCallPairs.length} covered call pairs, ${newRules.length} new rules`);

      return {
        orphanSells,
        coveredCallPairs,
        newRules,
        errors
      };
    } catch (error) {
      console.error('❌ Failed to analyze covered calls:', error);
      throw error;
    }
  }

  /**
   * Group transactions by symbol
   */
  private groupTransactionsBySymbol(transactions: EnhancedTransaction[]): Map<string, EnhancedTransaction[]> {
    const grouped = new Map<string, EnhancedTransaction[]>();
    
    for (const transaction of transactions) {
      const symbol = transaction.asset.symbol;
      if (!grouped.has(symbol)) {
        grouped.set(symbol, []);
      }
      grouped.get(symbol)!.push(transaction);
    }

    // Sort transactions by date within each symbol group
    for (const [_symbol, transactions] of grouped.entries()) {
      transactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    }

    return grouped;
  }

  /**
   * Analyze transactions for a specific symbol to identify covered call patterns
   */
  private async analyzeSymbolTransactions(
    symbol: string, 
    transactions: EnhancedTransaction[], 
    portfolioId: string
  ): Promise<CoveredCallAnalysis> {
    const orphanSells: EnhancedTransaction[] = [];
    const coveredCallPairs: CoveredCallRule[] = [];
    const newRules: CoveredCallRule[] = [];

    // Track running position (FIFO queue for buys)
    const buyQueue: Array<{ transaction: EnhancedTransaction; remainingQuantity: number }> = [];
    
    for (const transaction of transactions) {
      if (transaction.transaction_type === 'buy') {
        // Add to buy queue
        buyQueue.push({
          transaction,
          remainingQuantity: transaction.quantity
        });
        console.log(`📥 Added buy to queue: ${symbol} qty=${transaction.quantity} on ${transaction.transaction_date}`);
      } 
      else if (transaction.transaction_type === 'sell') {
        // Check if we have sufficient quantity in buy queue
        const totalAvailable = buyQueue.reduce((sum, buy) => sum + buy.remainingQuantity, 0);
        
        if (totalAvailable < transaction.quantity) {
          // Check if this transaction is already tagged as a covered call
          if (transaction.strategy_type === 'covered_call') {
            console.log(`⏭️ Transaction ${transaction.id} already tagged as covered_call, skipping`);
            continue;
          }

          // This is likely a covered call sell (selling without owning)
          console.log(`🎯 Potential covered call sell detected: ${symbol} qty=${transaction.quantity} on ${transaction.transaction_date}`);
          
          const rule: CoveredCallRule = {
            id: this.generateRuleId(transaction),
            symbol,
            sellTransactionId: transaction.id,
            sellDate: transaction.transaction_date,
            premiumReceived: transaction.total_amount,
            profit: transaction.total_amount, // Initial profit is just the premium
            status: 'open',
            portfolioId
          };

          orphanSells.push(transaction);
          newRules.push(rule);
          
          // Update transaction to mark as covered call
          await this.markTransactionAsCoveredCall(transaction);
        } else {
          // Normal sell - match against buy queue
          let remainingToSell = transaction.quantity;
          
          while (remainingToSell > 0 && buyQueue.length > 0) {
            const buyItem = buyQueue[0];
            const matchedQuantity = Math.min(buyItem.remainingQuantity, remainingToSell);
            
            buyItem.remainingQuantity -= matchedQuantity;
            remainingToSell -= matchedQuantity;
            
            if (buyItem.remainingQuantity === 0) {
              buyQueue.shift();
            }
          }
          
          console.log(`💰 Normal sell processed: ${symbol} qty=${transaction.quantity} on ${transaction.transaction_date}`);
        }
      }
    }

    // Now look for buy-back transactions that might close covered calls
    await this.findCoveredCallBuybacks(newRules, transactions);

    return {
      orphanSells,
      coveredCallPairs,
      newRules,
      errors: []
    };
  }

  /**
   * Find buy transactions that might be buying back covered calls
   */
  private async findCoveredCallBuybacks(rules: CoveredCallRule[], transactions: EnhancedTransaction[]): Promise<void> {
    for (const rule of rules) {
      if (rule.status === 'open') {
        // Look for buy transactions after the sell date
        const potentialBuybacks = transactions.filter(t => 
          t.transaction_type === 'buy' && 
          new Date(t.transaction_date) > new Date(rule.sellDate) &&
          !this.isAlreadyMatched(t.id, rules)
        );

        if (potentialBuybacks.length > 0) {
          const buyback = potentialBuybacks[0]; // Take the first chronological buyback
          
          rule.buybackTransactionId = buyback.id;
          rule.buybackDate = buyback.transaction_date;
          rule.premiumPaid = buyback.total_amount;
          rule.profit = rule.premiumReceived - buyback.total_amount;
          rule.status = 'closed';
          
          console.log(`🔄 Found buyback for ${rule.symbol}: profit=${rule.profit} (premium ${rule.premiumReceived} - buyback ${buyback.total_amount})`);
          
          // Mark buyback transaction
          await this.markTransactionAsCoveredCallBuyback(buyback);
        }
      }
    }
  }

  /**
   * Check if a transaction is already matched to a rule
   */
  private isAlreadyMatched(transactionId: string, rules: CoveredCallRule[]): boolean {
    return rules.some(rule => rule.buybackTransactionId === transactionId);
  }

  /**
   * Generate a unique rule ID
   */
  private generateRuleId(transaction: EnhancedTransaction): string {
    return `cc_${transaction.id.slice(0, 8)}_${Date.now()}`;
  }

  /**
   * Mark transaction as covered call sell
   */
  private async markTransactionAsCoveredCall(transaction: EnhancedTransaction): Promise<void> {
    try {
      console.log(`📝 Marking transaction ${transaction.id} as covered_call sell`);
      
      const result = await SupabaseService.transaction.updateTransaction(
        transaction.id,
        { strategy_type: 'covered_call' }
      );
      
      if (!result.success) {
        console.error(`❌ Failed to mark transaction ${transaction.id} as covered_call: ${result.error}`);
      } else {
        console.log(`✅ Successfully marked transaction ${transaction.id} as covered_call`);
        // Update the local transaction object
        transaction.strategy_type = 'covered_call';
      }
    } catch (error) {
      console.error(`❌ Error marking transaction ${transaction.id} as covered_call:`, error);
    }
  }

  /**
   * Mark transaction as covered call buyback
   */
  private async markTransactionAsCoveredCallBuyback(transaction: EnhancedTransaction): Promise<void> {
    try {
      console.log(`📝 Marking transaction ${transaction.id} as covered_call buyback`);
      
      const result = await SupabaseService.transaction.updateTransaction(
        transaction.id,
        { strategy_type: 'covered_call' }
      );
      
      if (!result.success) {
        console.error(`❌ Failed to mark transaction ${transaction.id} as covered_call buyback: ${result.error}`);
      } else {
        console.log(`✅ Successfully marked transaction ${transaction.id} as covered_call buyback`);
        // Update the local transaction object
        transaction.strategy_type = 'covered_call';
      }
    } catch (error) {
      console.error(`❌ Error marking transaction ${transaction.id} as covered_call buyback:`, error);
    }
  }

  /**
   * Apply covered call rules to all portfolios
   */
  async batchProcessAllPortfolios(): Promise<{
    success: boolean;
    totalRulesCreated: number;
    portfoliosProcessed: number;
    errors: string[];
  }> {
    console.log('🚀 Starting batch covered call processing for all portfolios');
    
    try {
      // Get all portfolios
      const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
      if (!portfoliosResult.success) {
        throw new Error(`Failed to fetch portfolios: ${portfoliosResult.error}`);
      }

      const portfolios = portfoliosResult.data || [];
      console.log(`📁 Found ${portfolios.length} portfolios to process`);

      let totalRulesCreated = 0;
      let portfoliosProcessed = 0;
      const errors: string[] = [];

      for (const portfolio of portfolios) {
        try {
          console.log(`🔄 Processing portfolio: ${portfolio.name} (${portfolio.id})`);
          
          const analysis = await this.analyzePortfolioCoveredCalls(portfolio.id);
          
          // Here you would save the rules to a database table
          // For now, just count them
          totalRulesCreated += analysis.newRules.length;
          portfoliosProcessed++;
          
          console.log(`✅ Portfolio ${portfolio.name}: ${analysis.newRules.length} new rules created`);
          
          if (analysis.errors.length > 0) {
            errors.push(...analysis.errors);
          }
          
        } catch (error) {
          const errorMsg = `Error processing portfolio ${portfolio.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 Batch processing complete: ${totalRulesCreated} rules created across ${portfoliosProcessed} portfolios`);

      return {
        success: true,
        totalRulesCreated,
        portfoliosProcessed,
        errors
      };
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      return {
        success: false,
        totalRulesCreated: 0,
        portfoliosProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

export const coveredCallProcessor = new CoveredCallProcessor();
export default coveredCallProcessor;