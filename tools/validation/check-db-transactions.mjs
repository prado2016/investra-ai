// Check actual database for 2025-04-28 transactions
import { createClient } from '@supabase/supabase-js';

// Note: In a real test, you'd get these from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ Supabase credentials not found in environment');
  console.log('This test would need to be run with proper environment variables');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTransactions() {
  try {
    console.log('🔍 Checking transactions for 2025-04-28...');
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        transaction_type,
        quantity,
        price,
        total_amount,
        fees,
        assets (
          symbol,
          name
        )
      `)
      .eq('transaction_date', '2025-04-28')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching transactions:', error);
      return;
    }

    console.log(`📊 Found ${transactions.length} transactions for 2025-04-28:`);
    
    transactions.forEach((t, index) => {
      console.log(`Transaction ${index + 1}:`, {
        id: t.id,
        date: t.transaction_date,
        type: t.transaction_type,
        symbol: t.assets?.symbol,
        quantity: t.quantity,
        price: t.price,
        totalAmount: t.total_amount,
        fees: t.fees
      });
    });

    if (transactions.length === 0) {
      console.log('⚠️ No transactions found for 2025-04-28');
      console.log('This might explain why the daily details modal is empty');
    } else {
      console.log('✅ Transactions exist for 2025-04-28');
      console.log('The issue should be resolved with our date filtering fix');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTransactions();
