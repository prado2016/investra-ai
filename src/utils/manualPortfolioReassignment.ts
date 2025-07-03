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

    // Get TFSA portfolio ID
    const { data: tfsaPortfolio } = await supabase
      .from('portfolios')
      .select('id, name')
      .ilike('name', '%TFSA%')
      .single();

    if (!tfsaPortfolio) {
      throw new Error('TFSA portfolio not found');
    }

    // Get transactions in TFSA (include notes for manual review)
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
        assets!inner(symbol)
      `, { count: 'exact' })
      .eq('portfolio_id', tfsaPortfolio.id)
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
      portfolio_name: tfsaPortfolio.name,
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
          updatedCount += count || 0;
          console.log(`✅ Batch ${batchNumber}: Updated ${count || 0} transactions`);
          if (data && data.length > 0) {
            console.log(`📋 Updated transactions:`, data);
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