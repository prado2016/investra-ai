/**
 * Debug utility for position calculation issues
 * This utility helps debug position synchronization problems
 */

import { supabase } from '../lib/supabase/client';

export class PositionDebugger {
  /**
   * Check for orphaned positions (positions without transactions)
   */
  static async findOrphanedPositions(portfolioId: string) {
    console.log('🔍 Checking for orphaned positions...');
    
    try {
      // Get all positions
      const { data: positions } = await supabase
        .from('positions')
        .select('id, asset_id, quantity, asset:assets(symbol)')
        .eq('portfolio_id', portfolioId);
      
      if (!positions || positions.length === 0) {
        console.log('✅ No positions found');
        return { orphaned: [], summary: 'No positions found' };
      }
      
      // Get all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('asset_id')
        .eq('portfolio_id', portfolioId);
      
      const transactionAssetIds = new Set(transactions?.map(t => t.asset_id) || []);
      
      // Find orphaned positions
      const orphaned = positions.filter(pos => !transactionAssetIds.has(pos.asset_id));
      
      console.log(`📊 Found ${positions.length} positions, ${orphaned.length} orphaned`);
      
      if (orphaned.length > 0) {
        console.log('🚨 Orphaned positions:');
        orphaned.forEach(pos => {
          console.log(`- ${pos.asset?.symbol || pos.asset_id}: ${pos.quantity} shares`);
        });
      }
      
      return {
        orphaned,
        total: positions.length,
        summary: `Found ${orphaned.length} orphaned positions out of ${positions.length} total`
      };
      
    } catch (error) {
      console.error('❌ Error checking orphaned positions:', error);
      return { orphaned: [], summary: 'Error occurred during check' };
    }
  }
  
  /**
   * Clean up orphaned positions manually
   */
  static async cleanupOrphanedPositions(portfolioId: string) {
    console.log('🧹 Cleaning up orphaned positions...');
    
    const check = await this.findOrphanedPositions(portfolioId);
    
    if (check.orphaned.length === 0) {
      console.log('✅ No orphaned positions to clean up');
      return { deleted: 0, message: 'No orphaned positions found' };
    }
    
    try {
      const orphanedIds = check.orphaned.map(pos => pos.id);
      
      const { error } = await supabase
        .from('positions')
        .delete()
        .in('id', orphanedIds);
      
      if (error) {
        console.error('❌ Error deleting orphaned positions:', error);
        return { deleted: 0, message: error.message };
      }
      
      console.log(`✅ Deleted ${orphanedIds.length} orphaned positions`);
      return { 
        deleted: orphanedIds.length, 
        message: `Successfully deleted ${orphanedIds.length} orphaned positions` 
      };
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return { deleted: 0, message: 'Error occurred during cleanup' };
    }
  }
  
  /**
   * Validate transaction-position consistency
   */
  static async validatePositionConsistency(portfolioId: string) {
    console.log('🔍 Validating position consistency...');
    
    try {
      // Get all transactions grouped by asset
      const { data: transactions } = await supabase
        .from('transactions')
        .select('asset_id, quantity, transaction_type, price, fees')
        .eq('portfolio_id', portfolioId)
        .order('transaction_date');
      
      // Get all positions
      const { data: positions } = await supabase
        .from('positions')
        .select('asset_id, quantity, total_cost_basis, asset:assets(symbol)')
        .eq('portfolio_id', portfolioId);
      
      const issues = [];
      
      // Check each position against calculated values
      const positionMap = new Map(positions?.map(p => [p.asset_id, p]) || []);
      
      // Group transactions by asset
      const transactionsByAsset = new Map();
      transactions?.forEach(t => {
        if (!transactionsByAsset.has(t.asset_id)) {
          transactionsByAsset.set(t.asset_id, []);
        }
        transactionsByAsset.get(t.asset_id).push(t);
      });
      
      // Calculate expected quantities for each asset
      for (const [assetId, assetTransactions] of transactionsByAsset) {
        let expectedQuantity = 0;
        let expectedCostBasis = 0;
        let weightedAvgCost = 0;
        
        for (const t of assetTransactions) {
          if (t.transaction_type === 'buy') {
            const cost = t.quantity * t.price + (t.fees || 0);
            const currentValue = expectedQuantity * weightedAvgCost;
            expectedQuantity += t.quantity;
            if (expectedQuantity > 0) {
              weightedAvgCost = (currentValue + cost) / expectedQuantity;
              expectedCostBasis = currentValue + cost;
            }
          } else if (t.transaction_type === 'sell') {
            const costOfSold = t.quantity * weightedAvgCost;
            expectedQuantity -= t.quantity;
            expectedCostBasis -= costOfSold;
          }
        }
        
        const position = positionMap.get(assetId);
        
        if (expectedQuantity <= 0 && position) {
          issues.push({
            type: 'orphaned',
            assetId,
            symbol: position.asset?.symbol,
            message: `Position exists but expected quantity is ${expectedQuantity}`
          });
        } else if (expectedQuantity > 0 && !position) {
          issues.push({
            type: 'missing',
            assetId,
            message: `Expected position with ${expectedQuantity} shares but none exists`
          });
        } else if (position && Math.abs(position.quantity - expectedQuantity) > 0.001) {
          issues.push({
            type: 'quantity_mismatch',
            assetId,
            symbol: position.asset?.symbol,
            expected: expectedQuantity,
            actual: position.quantity,
            message: `Quantity mismatch: expected ${expectedQuantity}, got ${position.quantity}`
          });
        }
      }
      
      // Check for positions without any transactions
      for (const position of positions || []) {
        if (!transactionsByAsset.has(position.asset_id)) {
          issues.push({
            type: 'no_transactions',
            assetId: position.asset_id,
            symbol: position.asset?.symbol,
            message: `Position exists but no transactions found`
          });
        }
      }
      
      console.log(`🔍 Validation complete: ${issues.length} issues found`);
      issues.forEach(issue => console.log(`- ${issue.type}: ${issue.message}`));
      
      return {
        valid: issues.length === 0,
        issues,
        summary: `Found ${issues.length} consistency issues`
      };
      
    } catch (error) {
      console.error('❌ Error validating consistency:', error);
      return { valid: false, issues: [], summary: 'Error occurred during validation' };
    }
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).PositionDebugger = PositionDebugger;
}