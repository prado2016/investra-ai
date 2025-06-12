/**
 * Test script to verify portfolio functionality is working correctly
 * Run this in the browser console to test the fixes
 */

// Test 1: Check if Supabase singleton is working
console.log('🧪 Test 1: Checking Supabase singleton...');
const checkSupabaseSingleton = () => {
  // Import supabase from two different ways and check if they're the same instance
  import('/src/lib/supabase.js').then(module1 => {
    import('/src/lib/supabase.js').then(module2 => {
      if (module1.supabase === module2.supabase) {
        console.log('✅ Supabase singleton working correctly');
      } else {
        console.error('❌ Multiple Supabase instances detected');
      }
    });
  });
};

// Test 2: Check portfolio context
console.log('🧪 Test 2: Checking portfolio context...');
const checkPortfolioContext = () => {
  // This will be run from the browser console
  const portfolioElements = document.querySelectorAll('[data-portfolio-id]');
  console.log(`Found ${portfolioElements.length} elements with portfolio data`);
  
  // Check if portfolio persists across navigation
  console.log('Navigate to Transactions page and check if portfolio is still available');
};

// Test 3: Check transaction creation
console.log('🧪 Test 3: Instructions for testing transaction creation:');
console.log('1. Navigate to Dashboard - verify portfolio loads');
console.log('2. Navigate to Transactions - verify portfolio is still available');
console.log('3. Try to add a transaction - verify it saves successfully');
console.log('4. Refresh the page - verify data persists');

// Test 4: Monitor console for warnings
console.log('🧪 Test 4: Monitoring for GoTrueClient warnings...');
const originalWarn = console.warn;
let goTrueWarnings = 0;
console.warn = function(...args) {
  if (args[0] && args[0].includes('GoTrueClient')) {
    goTrueWarnings++;
    console.error(`⚠️ GoTrueClient warning detected (${goTrueWarnings} total):`, args[0]);
  }
  originalWarn.apply(console, args);
};

// Test 5: Check if portfolio state is shared
console.log('🧪 Test 5: Portfolio state sharing test');
window.__portfolioTest = {
  checkSharedState: () => {
    // Get current URL
    const currentPath = window.location.pathname;
    console.log('Current page:', currentPath);
    
    // Instructions for manual testing
    console.log('Manual test steps:');
    console.log('1. Open browser DevTools');
    console.log('2. In Application tab, check localStorage for portfolio data');
    console.log('3. Navigate between pages and verify portfolio persists');
    console.log('4. Check Network tab for duplicate portfolio API calls');
  }
};

console.log('');
console.log('🔍 Run these tests:');
console.log('- checkSupabaseSingleton()');
console.log('- checkPortfolioContext()');
console.log('- window.__portfolioTest.checkSharedState()');
console.log('');
console.log('✨ All test functions loaded. Follow the manual test instructions above.');

// Export test functions for browser console
window.__portfolioTests = {
  checkSupabaseSingleton,
  checkPortfolioContext,
  goTrueWarnings: () => goTrueWarnings
};
