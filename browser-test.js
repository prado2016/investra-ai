// Browser Console Test for Investra AI Transaction Fixes
// Copy and paste this into browser console after loading the application

console.log('🧪 Investra AI Transaction Fixes - Browser Test');
console.log('==============================================');

// Test 1: Check if Settings page is accessible
console.log('\n1. Testing Settings page accessibility...');
const settingsLinks = document.querySelectorAll('a[href*="settings"], button[onclick*="settings"]');
console.log(`✅ Found ${settingsLinks.length} settings navigation elements`);

// Test 2: Check if Transactions page is accessible  
console.log('\n2. Testing Transactions page accessibility...');
const transactionLinks = document.querySelectorAll('a[href*="transaction"], button[onclick*="transaction"]');
console.log(`✅ Found ${transactionLinks.length} transaction navigation elements`);

// Test 3: Look for asset type filter elements
console.log('\n3. Testing Asset Type Filter elements...');
const assetFilters = document.querySelectorAll('select[name*="asset"], option[value*="etf"], select[id*="filter"]');
console.log(`✅ Found ${assetFilters.length} potential asset filter elements`);

// Test 4: Look for transaction action buttons
console.log('\n4. Testing Transaction Action buttons...');
const editButtons = document.querySelectorAll('button[onclick*="edit"], button[aria-label*="edit"], .edit-btn');
const deleteButtons = document.querySelectorAll('button[onclick*="delete"], button[aria-label*="delete"], .delete-btn');
console.log(`✅ Found ${editButtons.length} edit button elements`);
console.log(`✅ Found ${deleteButtons.length} delete button elements`);

// Test 5: Check for Clear All Data functionality
console.log('\n5. Testing Clear All Data functionality...');
const clearButtons = document.querySelectorAll('button[onclick*="clear"], button[aria-label*="clear"]');
console.log(`✅ Found ${clearButtons.length} clear data button elements`);

console.log('\n🎯 Next Steps for Manual Testing:');
console.log('1. Navigate to Transactions page');
console.log('2. Create a test transaction');
console.log('3. Try editing the transaction');
console.log('4. Try filtering by asset type (look for ETF option)');
console.log('5. Try deleting the transaction');
console.log('6. Navigate to Settings and try Clear All Data');

console.log('\n📝 Debug Tips:');
console.log('- Watch console for debug logs when filtering transactions');
console.log('- Edit form should pre-populate with existing transaction data');
console.log('- Delete should remove transaction from list immediately');
console.log('- Clear All Data should clear all transactions');
