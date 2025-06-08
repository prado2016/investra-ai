// Debug script to test daily P/L date filtering
console.log('🔍 Testing date filtering logic...');

// Simulate transaction data as it would come from Supabase
const mockTransactions = [
  {
    id: '1',
    transaction_date: '2025-04-28', // String format from PostgreSQL DATE
    asset: { symbol: 'AAPL' },
    transaction_type: 'buy',
    quantity: 100,
    price: 150
  },
  {
    id: '2', 
    transaction_date: '2025-04-28T00:00:00', // String with time
    asset: { symbol: 'GOOGL' },
    transaction_type: 'buy',
    quantity: 50,
    price: 200
  },
  {
    id: '3',
    transaction_date: '2025-04-27', // Different date
    asset: { symbol: 'MSFT' },
    transaction_type: 'buy',
    quantity: 75,
    price: 300
  }
];

// Test the filtering logic for April 28, 2025
const targetDate = new Date(2025, 3, 28); // April 28, 2025 (month is 0-indexed)
const dateString = targetDate.toISOString().split('T')[0]; // Should be '2025-04-28'

console.log('Target date:', targetDate.toISOString());
console.log('Target date string:', dateString);

const filteredTransactions = mockTransactions.filter(transaction => {
  let transactionDateString;
  
  if (typeof transaction.transaction_date === 'string') {
    transactionDateString = transaction.transaction_date.includes('T') 
      ? transaction.transaction_date.split('T')[0]
      : transaction.transaction_date;
  } else {
    const transactionDate = new Date(transaction.transaction_date);
    transactionDateString = transactionDate.toISOString().split('T')[0];
  }
  
  console.log(`Transaction ${transaction.id}:`, {
    originalDate: transaction.transaction_date,
    extractedDate: transactionDateString,
    targetDate: dateString,
    matches: transactionDateString === dateString
  });
  
  return transactionDateString === dateString;
});

console.log('\n🎯 Results:');
console.log('Total transactions:', mockTransactions.length);
console.log('Filtered transactions for 2025-04-28:', filteredTransactions.length);
console.log('Filtered transaction IDs:', filteredTransactions.map(t => t.id));

// Test potential timezone issues
console.log('\n🌍 Timezone tests:');
const utcDate = new Date('2025-04-28T12:00:00.000Z');
const localDate = new Date('2025-04-28');

console.log('UTC date ISO string:', utcDate.toISOString());
console.log('Local date ISO string:', localDate.toISOString());
console.log('UTC date string part:', utcDate.toISOString().split('T')[0]);
console.log('Local date string part:', localDate.toISOString().split('T')[0]);
