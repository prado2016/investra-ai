/**
 * Browser Console Test Script for Dashboard Data Loading
 * 
 * Copy and paste this into your browser console while on the dashboard
 * to test the data loading functionality
 */

console.log('🧪 Dashboard Data Loading Test Starting...\n');

// Test 1: Check if mock data toggle works
console.log('1️⃣ Testing Mock Data Toggle...');
try {
  const mockDataEnabled = localStorage.getItem('FORCE_MOCK_DASHBOARD') === 'true';
  console.log('   Mock data forced:', mockDataEnabled);
  
  // You can toggle mock data for testing
  window.toggleMockData = () => {
    const current = localStorage.getItem('FORCE_MOCK_DASHBOARD') === 'true';
    localStorage.setItem('FORCE_MOCK_DASHBOARD', (!current).toString());
    console.log('Mock data toggled to:', !current);
    window.location.reload();
  };
  
  console.log('   Use window.toggleMockData() to toggle mock data mode');
} catch (e) {
  console.log('   ⚠️ Mock data toggle setup failed:', e.message);
}

// Test 2: Check portfolio context
console.log('\n2️⃣ Checking Portfolio Context...');
try {
  // Look for portfolio debug info in the DOM
  const debugInfo = document.querySelector('[data-testid="portfolio-debug"]') || 
                   document.querySelector('div[style*="position: fixed"][style*="bottom"]');
  
  if (debugInfo) {
    console.log('   ✅ Portfolio debug info found');
    console.log('   Content:', debugInfo.textContent);
  } else {
    console.log('   ⚠️ Portfolio debug info not visible');
  }
} catch (e) {
  console.log('   ❌ Portfolio context check failed:', e.message);
}

// Test 3: Test dashboard metrics directly
console.log('\n3️⃣ Testing Dashboard Metrics Hook...');
try {
  // This will trigger the dashboard metrics calculation
  window.testDashboardMetrics = async () => {
    console.log('🔍 Manual dashboard metrics test triggered');
    
    // Look for React DevTools or try to access component state
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      console.log('   React detected, checking for dashboard component...');
    }
    
    // Check for dashboard metric elements
    const metricElements = document.querySelectorAll('[data-testid*="metric"], .metric-box, [class*="metric"]');
    console.log(`   Found ${metricElements.length} potential metric elements`);
    
    metricElements.forEach((el, i) => {
      const text = el.textContent?.trim();
      if (text && text.includes('$')) {
        console.log(`   Metric ${i + 1}: ${text}`);
      }
    });
  };
  
  console.log('   Use window.testDashboardMetrics() to manually test metrics');
} catch (e) {
  console.log('   ❌ Dashboard metrics test setup failed:', e.message);
}

// Test 4: Monitor for specific error patterns
console.log('\n4️⃣ Setting up Error Monitoring...');
const originalError = console.error;
const originalWarn = console.warn;

window.dashboardErrors = [];
window.dashboardWarnings = [];

console.error = function(...args) {
  window.dashboardErrors.push({ time: new Date(), args });
  
  // Check for specific patterns
  const errorStr = args.join(' ');
  if (errorStr.includes('DashboardMetrics') || 
      errorStr.includes('Portfolio') || 
      errorStr.includes('dailyPL')) {
    console.log('🚨 Dashboard-related error detected:', errorStr);
  }
  
  originalError.apply(console, args);
};

console.warn = function(...args) {
  window.dashboardWarnings.push({ time: new Date(), args });
  
  const warnStr = args.join(' ');
  if (warnStr.includes('DashboardMetrics') || 
      warnStr.includes('Portfolio') || 
      warnStr.includes('dailyPL')) {
    console.log('⚠️ Dashboard-related warning detected:', warnStr);
  }
  
  originalWarn.apply(console, args);
};

// Test 5: Check for expected console messages
console.log('\n5️⃣ Monitoring for Expected Messages...');
console.log('   Watch for these positive indicators:');
console.log('   • "🔍 DashboardMetrics: calculateMetrics called"');
console.log('   • "🏦 PortfolioContext: Fetched portfolios"');
console.log('   • "✅ DashboardMetrics: Final metrics calculated"');
console.log('   • "🔍 dailyPLService: Data fetched successfully"');

console.log('\n   Watch for these error indicators:');
console.log('   • "❌ dailyPLService: Failed to fetch"');
console.log('   • "⚠️ DashboardMetrics: Today data fetch failed"');
console.log('   • "Using mock data" (when not expected)');

// Test 6: Utility functions
console.log('\n6️⃣ Utility Functions Available:');
console.log('   • window.toggleMockData() - Toggle mock/real data');
console.log('   • window.testDashboardMetrics() - Test metrics manually');
console.log('   • window.dashboardErrors - Array of dashboard errors');
console.log('   • window.dashboardWarnings - Array of dashboard warnings');

window.getDashboardSummary = () => {
  console.log('\n📊 Dashboard Test Summary:');
  console.log(`   Errors: ${window.dashboardErrors.length}`);
  console.log(`   Warnings: ${window.dashboardWarnings.length}`);
  
  if (window.dashboardErrors.length > 0) {
    console.log('   Recent errors:');
    window.dashboardErrors.slice(-3).forEach((err, i) => {
      console.log(`     ${i + 1}. ${err.args.join(' ')}`);
    });
  }
  
  if (window.dashboardWarnings.length > 0) {
    console.log('   Recent warnings:');
    window.dashboardWarnings.slice(-3).forEach((warn, i) => {
      console.log(`     ${i + 1}. ${warn.args.join(' ')}`);
    });
  }
  
  // Check for dashboard elements
  const dashboardElements = document.querySelectorAll('[class*="dashboard"], [id*="dashboard"]');
  console.log(`   Dashboard elements found: ${dashboardElements.length}`);
  
  // Check for error messages in UI
  const errorElements = document.querySelectorAll('[class*="error"], .error-message, [role="alert"]');
  console.log(`   Error UI elements: ${errorElements.length}`);
  
  if (errorElements.length > 0) {
    console.log('   Error messages in UI:');
    errorElements.forEach((el, i) => {
      const text = el.textContent?.trim();
      if (text) {
        console.log(`     ${i + 1}. ${text}`);
      }
    });
  }
};

console.log('   • window.getDashboardSummary() - Get test summary');

console.log('\n✅ Dashboard test setup complete!');
console.log('📋 Next steps:');
console.log('   1. Navigate to /dashboard if not already there');
console.log('   2. Watch console for the expected messages');
console.log('   3. Run window.getDashboardSummary() after a few seconds');
console.log('   4. Try window.toggleMockData() to test both modes');
