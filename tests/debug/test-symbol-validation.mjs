#!/usr/bin/env node

/**
 * Test script to verify symbol validation functionality
 * Run this script to test the SOXL validation that was originally failing
 */

console.log('🧪 Symbol Validation Test Script');
console.log('=================================\n');

// Import the validation utilities
import('./src/utils/symbolValidationTest.js').then(async ({ validateSymbolStandalone, testSOXLValidation }) => {
  console.log('📋 Testing multiple symbol validation scenarios...\n');

  const testCases = [
    'SOXL Jun 6 $17 Call',
    'AAPL',
    'TSLA Jul 15 $250 Put',
    'NVDA',
    'SPY Mar 21 $400 Call',
    'invalid query 123'
  ];

  for (const testCase of testCases) {
    console.log(`🔍 Testing: "${testCase}"`);
    
    try {
      const result = await validateSymbolStandalone(testCase);
      
      if (result.isValid) {
        console.log(`  ✅ VALID - Parsed as: ${result.parsedSymbol}`);
      } else {
        console.log(`  ❌ INVALID - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`  💥 ERROR - ${error.message}`);
    }
    
    console.log(''); // Empty line for spacing
  }

  console.log('\n🎯 Running dedicated SOXL test...\n');
  await testSOXLValidation();

  console.log('\n✅ Test script completed!');
  console.log('Check the results above to see if the validation is working correctly.');

}).catch(error => {
  console.error('❌ Failed to load validation utilities:', error);
  console.log('\nThis might be because the modules need to be transpiled.');
  console.log('Try testing directly in the browser instead.');
});
