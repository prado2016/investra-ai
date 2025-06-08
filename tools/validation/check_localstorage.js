
// Browser console script to check localStorage for April 28, 2025 transactions
const storageService = window.storageService || {
  getTransactions: () => JSON.parse(localStorage.getItem('stock_tracker_transactions') || '[]'),
  getPositions: () => JSON.parse(localStorage.getItem('stock_tracker_positions') || '[]'),
  getPortfolios: () => JSON.parse(localStorage.getItem('stock_tracker_portfolios') || '[]')
};

console.log('=== LOCALSTORAGE DATA ANALYSIS ===');
console.log('Transactions:', storageService.getTransactions());
console.log('Positions:', storageService.getPositions());
console.log('Portfolios:', storageService.getPortfolios());

// Check for April 28, 2025 transactions specifically
const transactions = storageService.getTransactions();
const april28Transactions = transactions.filter(t => {
  const date = new Date(t.date);
  return date.getFullYear() === 2025 && 
         date.getMonth() === 3 && // April is month 3 (0-indexed)
         date.getDate() === 28;
});

console.log('=== APRIL 28, 2025 TRANSACTIONS ===');
console.log('Count:', april28Transactions.length);
console.log('Transactions:', april28Transactions);

