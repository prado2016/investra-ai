/**
 * Manual Portfolio Reassignment
 * For transactions without notes that need manual portfolio assignment
 */

import { supabase } from '../lib/supabase';

interface TransactionForReassignment {
  id: string;
  asset_id: string;
  symbol?: string;
  transaction_type: string;
  quantity: number;
  price: number;
  transaction_date: string;
  created_at: string;
  portfolio_id: string;
  portfolio_name?: string;
  notes?: string;
}

export async function getTransactionsNeedingReassignment(limit: number = 50): Promise<{
  success: boolean;
  transactions: TransactionForReassignment[];
  totalCount: number;
  error?: string;
}> {
  try {
    console.log('🔍 Fetching transactions that need manual reassignment...');

    // Get all TFSA portfolios 
    const { data: tfsaPortfolios } = await supabase
      .from('portfolios')
      .select('id, name')
      .ilike('name', '%TFSA%');

    if (!tfsaPortfolios || tfsaPortfolios.length === 0) {
      throw new Error('No TFSA portfolios found');
    }

    console.log(`📋 Found ${tfsaPortfolios.length} TFSA portfolios:`, tfsaPortfolios);

    // Get all portfolios to identify which ones are NOT TFSA
    const { data: allPortfolios } = await supabase
      .from('portfolios')
      .select('id, name');

    const nonTfsaPortfolios = allPortfolios?.filter(p => 
      !p.name.toLowerCase().includes('tfsa')
    ) || [];

    console.log(`📋 Found ${nonTfsaPortfolios.length} non-TFSA portfolios:`, nonTfsaPortfolios);

    if (nonTfsaPortfolios.length === 0) {
      throw new Error('No non-TFSA portfolios found - all transactions are already correctly assigned');
    }

    // Get transactions that are in NON-TFSA portfolios but should be in TFSA
    // These are the ones that need manual reassignment TO a TFSA portfolio
    const { data: transactions, error, count } = await supabase
      .from('transactions')
      .select(`
        id,
        asset_id,
        transaction_type,
        quantity,
        price,
        transaction_date,
        created_at,
        portfolio_id,
        notes,
        assets!inner(symbol),
        portfolios!inner(name)
      `, { count: 'exact' })
      .in('portfolio_id', nonTfsaPortfolios.map(p => p.id))
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const formattedTransactions: TransactionForReassignment[] = (transactions || []).map(t => ({
      id: t.id,
      asset_id: t.asset_id,
      symbol: (t.assets as { symbol?: string })?.symbol || 'Unknown',
      transaction_type: t.transaction_type,
      quantity: t.quantity,
      price: t.price,
      transaction_date: t.transaction_date,
      created_at: t.created_at,
      portfolio_id: t.portfolio_id,
      portfolio_name: (t.portfolios as { name?: string })?.name || 'Unknown',
      notes: t.notes
    }));

    console.log(`✅ Found ${formattedTransactions.length} transactions needing reassignment`);
    console.log(`📊 Total count: ${count || 0}`);

    return {
      success: true,
      transactions: formattedTransactions,
      totalCount: count || 0
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching transactions:', errorMsg);
    return {
      success: false,
      transactions: [],
      totalCount: 0,
      error: errorMsg
    };
  }
}

export async function bulkReassignTransactions(
  transactionIds: string[],
  newPortfolioId: string
): Promise<{
  success: boolean;
  updatedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;

  try {
    console.log(`🔄 Bulk reassigning ${transactionIds.length} transactions to portfolio ${newPortfolioId}...`);
    console.log(`📋 Transaction IDs:`, transactionIds);

    // First, let's verify the transactions exist and their current state
    const { data: currentTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, portfolio_id')
      .in('id', transactionIds);

    if (fetchError) {
      console.error('❌ Failed to fetch current transactions:', fetchError);
      return {
        success: false,
        updatedCount: 0,
        errors: [`Failed to fetch current transactions: ${fetchError.message}`]
      };
    }

    console.log(`🔍 Found ${currentTransactions?.length || 0} transactions to update:`, currentTransactions);
    
    // Also get portfolio names for debugging
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id, name')
      .in('id', [newPortfolioId, ...(currentTransactions?.map(t => t.portfolio_id) || [])]);
    
    console.log(`📋 Portfolios involved:`, portfolios);
    console.log(`🎯 Target portfolio ID: ${newPortfolioId}`);
    console.log(`🎯 Target portfolio name: ${portfolios?.find(p => p.id === newPortfolioId)?.name || 'NOT FOUND'}`);
    
    // Log each source transaction's current portfolio
    currentTransactions?.forEach(tx => {
      const sourcePortfolio = portfolios?.find(p => p.id === tx.portfolio_id);
      console.log(`📋 Transaction ${tx.id} is currently in: ${sourcePortfolio?.name || 'UNKNOWN'} (${tx.portfolio_id})`);
    });

    // Update in batches of 10
    const batchSize = 10;
    for (let i = 0; i < transactionIds.length; i += batchSize) {
      const batch = transactionIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      
      console.log(`🔄 Processing batch ${batchNumber}: updating ${batch.length} transactions`);
      console.log(`📋 Batch ${batchNumber} transaction IDs:`, batch);
      
      try {
        const { error, count, data } = await supabase
          .from('transactions')
          .update({ portfolio_id: newPortfolioId })
          .in('id', batch)
          .select('id, portfolio_id');

        console.log(`📊 Batch ${batchNumber} result:`, { error, count, data });

        if (error) {
          console.error(`❌ Batch ${batchNumber} error:`, error);
          errors.push(`Batch ${batchNumber}: ${error.message}`);
        } else {
          // Use data length instead of count when count is null
          const actualUpdated = count !== null ? count : (data?.length || 0);
          updatedCount += actualUpdated;
          console.log(`✅ Batch ${batchNumber}: Updated ${actualUpdated} transactions (count: ${count}, data length: ${data?.length})`);
          if (data && data.length > 0) {
            console.log(`📋 Updated transactions:`, data);
            data.forEach(tx => {
              const beforePortfolio = portfolios?.find(p => p.id === currentTransactions?.find(ct => ct.id === tx.id)?.portfolio_id)?.name || 'Unknown';
              const afterPortfolio = portfolios?.find(p => p.id === tx.portfolio_id)?.name || 'Unknown';
              console.log(`   📋 Transaction ${tx.id}: ${beforePortfolio} → ${afterPortfolio} (${tx.portfolio_id})`);
            });
            
            // Double-check by querying the database directly after a short delay
            setTimeout(async () => {
              try {
                const { data: verificationData } = await supabase
                  .from('transactions')
                  .select('id, portfolio_id, portfolios!inner(name)')
                  .in('id', data.map(tx => tx.id));
                
                console.log(`🔍 VERIFICATION: Direct database query results:`, verificationData);
                verificationData?.forEach(tx => {
                  const actualPortfolio = (tx.portfolios as { name?: string })?.name || 'Unknown';
                  console.log(`   🔍 Transaction ${tx.id} is actually in: ${actualPortfolio} (${tx.portfolio_id})`);
                });
              } catch (verErr) {
                console.error('❌ Verification query failed:', verErr);
              }
            }, 1000);
          }
        }
      } catch (batchError) {
        const errorMsg = batchError instanceof Error ? batchError.message : 'Unknown batch error';
        console.error(`❌ Batch ${batchNumber} exception:`, batchError);
        errors.push(`Batch ${batchNumber}: ${errorMsg}`);
      }
    }

    console.log(`✅ Bulk reassignment complete: ${updatedCount} transactions updated`);

    return {
      success: errors.length === 0,
      updatedCount,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Bulk reassignment error:', errorMsg);
    return {
      success: false,
      updatedCount: 0,
      errors: [errorMsg]
    };
  }
}

export async function getAllPortfolios(): Promise<{
  success: boolean;
  portfolios: Array<{id: string; name: string}>;
  error?: string;
}> {
  try {
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      success: true,
      portfolios: portfolios || []
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      portfolios: [],
      error: errorMsg
    };
  }
}