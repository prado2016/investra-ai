#!/usr/bin/env node

/**
 * Email Parsing Test Runner for Dev Environment
 * Tests Wealthsimple email parsing on remote dev server
 */

import { WealthsimpleEmailParser } from './src/services/email/wealthsimpleEmailParser.js';
import { EmailParserTestSuite } from './src/services/email/tests/emailParserTests.js';
import { MOCK_WEALTHSIMPLE_EMAILS, INVALID_EMAILS, EDGE_CASES } from './src/services/email/tests/mockWealthsimpleEmails.js';

console.log('🧪 Email Parsing Test Suite for Dev Environment');
console.log('================================================');
console.log(`Server: 10.0.0.89`);
console.log(`Date: ${new Date().toISOString()}`);
console.log('');

// Test 1: Basic Parser Functionality
console.log('📧 PHASE 1: Basic Email Parser Tests');
console.log('====================================');

function testBasicParsing() {
  const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
  
  console.log('🧪 Testing: Basic stock purchase parsing');
  console.log(`Subject: ${testEmail.subject}`);
  console.log(`From: ${testEmail.from}`);
  
  try {
    const result = WealthsimpleEmailParser.parseEmail(
      testEmail.subject,
      testEmail.from,
      testEmail.html,
      testEmail.text
    );
    
    if (result.success && result.data) {
      console.log('✅ PASS: Basic parsing successful');
      console.log(`   Symbol: ${result.data.symbol}`);
      console.log(`   Type: ${result.data.transactionType}`);
      console.log(`   Quantity: ${result.data.quantity}`);
      console.log(`   Price: $${result.data.price}`);
      console.log(`   Account: ${result.data.accountType}`);
      console.log(`   Confidence: ${result.data.confidence.toFixed(2)}`);
      return true;
    } else {
      console.log('❌ FAIL: Basic parsing failed');
      console.log(`   Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Exception during parsing');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test 2: Multiple Email Types
console.log('');
function testMultipleEmailTypes() {
  console.log('📧 PHASE 2: Multiple Email Type Tests');
  console.log('=====================================');
  
  const testTypes = [
    { name: 'Stock Buy', email: MOCK_WEALTHSIMPLE_EMAILS.stockBuy },
    { name: 'Stock Sell', email: MOCK_WEALTHSIMPLE_EMAILS.stockSell },
    { name: 'Canadian Stock', email: MOCK_WEALTHSIMPLE_EMAILS.canadianStock },
    { name: 'Dividend', email: MOCK_WEALTHSIMPLE_EMAILS.dividend },
    { name: 'Option Expired', email: MOCK_WEALTHSIMPLE_EMAILS.optionExpired },
    { name: 'ETF Purchase', email: MOCK_WEALTHSIMPLE_EMAILS.etfPurchase }
  ];
  
  let passed = 0;
  let total = testTypes.length;
  
  for (const test of testTypes) {
    console.log(`🧪 Testing: ${test.name}`);
    
    try {
      const result = WealthsimpleEmailParser.parseEmail(
        test.email.subject,
        test.email.from,
        test.email.html,
        test.email.text
      );
      
      if (result.success && result.data) {
        console.log(`✅ PASS: ${test.name} - ${result.data.symbol} ${result.data.transactionType}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ FAIL: ${test.name} - Exception: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  return passed === total;
}

// Test 3: Edge Cases
console.log('');
function testEdgeCases() {
  console.log('📧 PHASE 3: Edge Case Tests');
  console.log('============================');
  
  const edgeTests = [
    { name: 'Fractional Shares', email: EDGE_CASES.fractionalShares },
    { name: 'High Value Trade', email: EDGE_CASES.highValue },
    { name: 'Foreign Currency', email: EDGE_CASES.foreignCurrency }
  ];
  
  let passed = 0;
  
  for (const test of edgeTests) {
    console.log(`🧪 Testing: ${test.name}`);
    
    try {
      const result = WealthsimpleEmailParser.parseEmail(
        test.email.subject,
        test.email.from,
        test.email.html,
        test.email.text
      );
      
      if (result.success && result.data) {
        console.log(`✅ PASS: ${test.name} - ${result.data.symbol} (${result.data.quantity} shares)`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ FAIL: ${test.name} - Exception: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Edge Cases: ${passed}/${edgeTests.length} passed`);
  return passed === edgeTests.length;
}

// Test 4: Invalid Emails (Should Fail)
console.log('');
function testInvalidEmails() {
  console.log('📧 PHASE 4: Invalid Email Tests (Should Fail)');
  console.log('==============================================');
  
  const invalidTests = [
    { name: 'Non-Wealthsimple', email: INVALID_EMAILS.nonWealthsimple },
    { name: 'Non-Transaction', email: INVALID_EMAILS.nonTransaction },
    { name: 'Malformed', email: INVALID_EMAILS.malformed }
  ];
  
  let correctlyRejected = 0;
  
  for (const test of invalidTests) {
    console.log(`🧪 Testing: ${test.name} (should fail)`);
    
    try {
      const result = WealthsimpleEmailParser.parseEmail(
        test.email.subject,
        test.email.from,
        test.email.html,
        test.email.text
      );
      
      if (!result.success) {
        console.log(`✅ PASS: ${test.name} correctly rejected - ${result.error}`);
        correctlyRejected++;
      } else {
        console.log(`❌ FAIL: ${test.name} incorrectly accepted`);
      }
    } catch (error) {
      console.log(`✅ PASS: ${test.name} correctly rejected with exception`);
      correctlyRejected++;
    }
  }
  
  console.log(`\n📊 Invalid Emails: ${correctlyRejected}/${invalidTests.length} correctly rejected`);
  return correctlyRejected === invalidTests.length;
}

// Test 5: Performance Test
console.log('');
function testPerformance() {
  console.log('📧 PHASE 5: Performance Test');
  console.log('=============================');
  
  const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
  const iterations = 1000;
  
  console.log(`🧪 Testing: Parsing ${iterations} emails`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    WealthsimpleEmailParser.parseEmail(
      testEmail.subject,
      testEmail.from,
      testEmail.html,
      testEmail.text
    );
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const emailsPerSecond = Math.round(1000 / avgTime);
  
  console.log(`⏱️ Performance Results:`);
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Average Time per Email: ${avgTime.toFixed(2)}ms`);
  console.log(`   Emails per Second: ${emailsPerSecond}`);
  
  return avgTime < 10; // Should be under 10ms per email
}

// Test 6: Custom Email Test (for live testing)
function testCustomEmail() {
  console.log('');
  console.log('📧 PHASE 6: Custom Email Test');
  console.log('==============================');
  
  // You can customize this section to test with real emails
  const customEmail = {
    subject: "Your order has been filled",
    from: "noreply@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p>Account: RRSP</p>
          <p>Type: Limit Buy to Close</p>
          <p>Option: TSLL 13.00 call</p>
          <p>Contracts: 10</p>
          <p>Average price: US$0.02</p>
          <p>Total cost: US$27.50</p>
          <p>Time: June 13, 2025 10:44 EDT</p>
        </body>
      </html>
    `,
    text: `
      Trade Confirmation
      Account: RRSP
      Type: Limit Buy to Close
      Option: TSLL 13.00 call
      Contracts: 10
      Average price: US$0.02
      Total cost: US$27.50
      Time: June 13, 2025 10:44 EDT
    `
  };
  
  console.log('🧪 Testing: Custom email (option trade)');
  console.log(`Subject: ${customEmail.subject}`);
  
  try {
    const result = WealthsimpleEmailParser.parseEmail(
      customEmail.subject,
      customEmail.from,
      customEmail.html,
      customEmail.text
    );
    
    if (result.success && result.data) {
      console.log('✅ PASS: Custom email parsed successfully');
      console.log(`   Symbol: ${result.data.symbol}`);
      console.log(`   Type: ${result.data.transactionType}`);
      console.log(`   Quantity: ${result.data.quantity}`);
      console.log(`   Price: $${result.data.price}`);
      console.log(`   Total: $${result.data.totalAmount}`);
      console.log(`   Account: ${result.data.accountType}`);
      console.log(`   Confidence: ${result.data.confidence.toFixed(2)}`);
      
      // Validate the parsing
      const validation = WealthsimpleEmailParser.validateParsedData(result.data);
      if (validation.isValid) {
        console.log('✅ PASS: Data validation successful');
        return true;
      } else {
        console.log('❌ FAIL: Data validation failed');
        validation.errors.forEach(error => console.log(`   - ${error}`));
        return false;
      }
    } else {
      console.log('❌ FAIL: Custom email parsing failed');
      console.log(`   Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Exception during custom email parsing');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Email Parsing Test Suite...\n');
  
  const results = [
    testBasicParsing(),
    testMultipleEmailTypes(),
    testEdgeCases(),
    testInvalidEmails(),
    testPerformance(),
    testCustomEmail()
  ];
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n');
  console.log('📊 FINAL TEST SUMMARY');
  console.log('=====================');
  console.log(`Total Test Phases: ${total}`);
  console.log(`Phases Passed: ${passed}`);
  console.log(`Success Rate: ${Math.round(passed/total*100)}%`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Email parsing is working correctly.');
    console.log('✅ Ready for production email processing');
  } else {
    console.log('⚠️ Some tests failed. Please review the results above.');
    console.log('🔧 Fix any issues before deploying to production');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Deploy this parser to your dev environment');
  console.log('2. Test with real Wealthsimple emails');
  console.log('3. Set up email server integration');
  console.log('4. Configure automated email processing');
  
  return passed === total;
}

// Export for use as module or run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
  });
}

export { runAllTests };
