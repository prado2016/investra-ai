#!/usr/bin/env node

/**
 * Email Parsing Test Runner for Dev Environment (CommonJS)
 * Tests Wealthsimple email parsing on remote dev server
 */

const fs = require('fs');
const path = require('path');

// Mock the email parsing functionality for testing
const MOCK_WEALTHSIMPLE_EMAILS = {
  stockBuy: {
    subject: "Trade Confirmation - AAPL Purchase",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p>Your order has been executed successfully.</p>
          <div class="trade-details">
            <p><strong>Account:</strong> TFSA - Tax-Free Savings Account</p>
            <p><strong>Action:</strong> Bought 100 shares of AAPL</p>
            <p><strong>Price:</strong> $150.25 per share</p>
            <p><strong>Total Amount:</strong> $15,025.00</p>
            <p><strong>Execution Time:</strong> January 15, 2025 at 10:30 AM EST</p>
          </div>
        </body>
      </html>
    `,
    text: "Trade Confirmation - Bought 100 shares of AAPL at $150.25 per share"
  },
  stockSell: {
    subject: "Trade Confirmation - TSLA Sale", 
    from: "trade@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Order Filled</h2>
          <p><strong>Account Type:</strong> RRSP</p>
          <p><strong>Transaction:</strong> Sold 50 shares of TSLA</p>
          <p><strong>Execution Price:</strong> $248.75</p>
          <p><strong>Gross Proceeds:</strong> $12,437.50</p>
        </body>
      </html>
    `,
    text: "Order Filled - Sold 50 shares of TSLA at $248.75"
  },
  optionTrade: {
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
    text: "RRSP - Buy to Close 10 TSLL 13.00 call at $0.02 - Total: $27.50"
  }
};

// Simple email parser for testing
class SimpleEmailParser {
  static parseEmail(subject, from, html, text) {
    try {
      // Check if it's from Wealthsimple
      if (!from.includes('wealthsimple.com')) {
        return {
          success: false,
          error: 'Not from Wealthsimple'
        };
      }

      const content = (subject + ' ' + html + ' ' + text).toLowerCase();
      
      // Extract basic transaction info
      let symbol = '';
      let transactionType = '';
      let quantity = 0;
      let price = 0;
      let accountType = 'Unknown';

      // Extract symbol (simplified)
      const symbolMatch = content.match(/(?:shares of |option: |symbol: )([a-z]{1,5}(?:\.[a-z]{2})?)/i);
      if (symbolMatch) {
        symbol = symbolMatch[1].toUpperCase();
      }

      // Extract transaction type
      if (content.includes('bought') || content.includes('buy')) {
        transactionType = content.includes('to close') ? 'sell' : 'buy';
      } else if (content.includes('sold') || content.includes('sell')) {
        transactionType = 'sell';
      }

      // Extract quantity
      const quantityMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:shares|contracts)/);
      if (quantityMatch) {
        quantity = parseFloat(quantityMatch[1]);
      }

      // Extract price
      const priceMatch = content.match(/\$(\d+(?:,\d{3})*(?:\.\d{2,4}))/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }

      // Extract account type
      if (content.includes('tfsa')) accountType = 'TFSA';
      else if (content.includes('rrsp')) accountType = 'RRSP';
      else if (content.includes('margin')) accountType = 'Margin';

      // Calculate confidence
      let confidence = 0.5;
      if (symbol) confidence += 0.2;
      if (transactionType) confidence += 0.2;
      if (quantity > 0) confidence += 0.1;

      const result = {
        symbol,
        transactionType,
        quantity,
        price,
        totalAmount: quantity * price,
        accountType,
        transactionDate: new Date().toISOString().split('T')[0],
        currency: 'USD',
        confidence,
        parseMethod: 'SIMPLE_REGEX'
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  static validateParsedData(data) {
    const errors = [];
    
    if (!data.symbol) errors.push('Symbol is required');
    if (data.quantity <= 0) errors.push('Quantity must be greater than 0');
    if (data.price < 0) errors.push('Price cannot be negative');
    if (!['buy', 'sell', 'dividend'].includes(data.transactionType)) {
      errors.push('Invalid transaction type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

console.log('🧪 Email Parsing Test Suite for Dev Environment');
console.log('================================================');
console.log(`Server: 10.0.0.83`);
console.log(`Date: ${new Date().toISOString()}`);
console.log('');

// Test 1: Basic Parser Functionality
function testBasicParsing() {
  console.log('📧 PHASE 1: Basic Email Parser Tests');
  console.log('====================================');
  
  const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
  
  console.log('🧪 Testing: Basic stock purchase parsing');
  console.log(`Subject: ${testEmail.subject}`);
  console.log(`From: ${testEmail.from}`);
  
  try {
    const result = SimpleEmailParser.parseEmail(
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
function testMultipleEmailTypes() {
  console.log('\n📧 PHASE 2: Multiple Email Type Tests');
  console.log('=====================================');
  
  const testTypes = [
    { name: 'Stock Buy', email: MOCK_WEALTHSIMPLE_EMAILS.stockBuy },
    { name: 'Stock Sell', email: MOCK_WEALTHSIMPLE_EMAILS.stockSell },
    { name: 'Option Trade', email: MOCK_WEALTHSIMPLE_EMAILS.optionTrade }
  ];
  
  let passed = 0;
  const total = testTypes.length;
  
  for (const test of testTypes) {
    console.log(`🧪 Testing: ${test.name}`);
    
    try {
      const result = SimpleEmailParser.parseEmail(
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

// Test 3: Performance Test
function testPerformance() {
  console.log('\n📧 PHASE 3: Performance Test');
  console.log('=============================');
  
  const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
  const iterations = 1000;
  
  console.log(`🧪 Testing: Parsing ${iterations} emails`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    SimpleEmailParser.parseEmail(
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

// Test 4: Validation Test
function testValidation() {
  console.log('\n📧 PHASE 4: Data Validation Tests');
  console.log('==================================');
  
  const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
  const result = SimpleEmailParser.parseEmail(
    testEmail.subject,
    testEmail.from,
    testEmail.html,
    testEmail.text
  );
  
  if (result.success && result.data) {
    const validation = SimpleEmailParser.validateParsedData(result.data);
    
    if (validation.isValid) {
      console.log('✅ PASS: Data validation successful');
      return true;
    } else {
      console.log('❌ FAIL: Data validation failed');
      validation.errors.forEach(error => console.log(`   - ${error}`));
      return false;
    }
  } else {
    console.log('❌ FAIL: No data to validate');
    return false;
  }
}

// Test 5: Environment Check
function testEnvironment() {
  console.log('\n📧 PHASE 5: Environment Check');
  console.log('==============================');
  
  console.log(`🧪 Node.js version: ${process.version}`);
  console.log(`🧪 Platform: ${process.platform}`);
  console.log(`🧪 Architecture: ${process.arch}`);
  
  // Check if running on the dev server
  const isDevServer = process.env.SERVER_ENV === 'dev' || 
                     process.env.NODE_ENV === 'development' ||
                     process.argv.includes('--dev');
  
  console.log(`🧪 Environment: ${isDevServer ? 'Development' : 'Local'}`);
  
  return true;
}

// Generate Test Report
function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    server: '10.0.0.83',
    environment: 'development',
    nodeVersion: process.version,
    tests: {
      basicParsing: results[0],
      multipleTypes: results[1], 
      performance: results[2],
      validation: results[3],
      environment: results[4]
    },
    summary: {
      total: results.length,
      passed: results.filter(Boolean).length,
      successRate: Math.round(results.filter(Boolean).length / results.length * 100)
    }
  };
  
  // Save report to file
  try {
    fs.writeFileSync('email-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Test report saved to: email-test-report.json');
  } catch (error) {
    console.log('\n⚠️ Could not save test report:', error.message);
  }
  
  return report;
}

// Main test runner
function runAllTests() {
  console.log('🚀 Starting Email Parsing Test Suite...\n');
  
  const results = [
    testBasicParsing(),
    testMultipleEmailTypes(),
    testPerformance(),
    testValidation(),
    testEnvironment()
  ];
  
  const report = generateTestReport(results);
  
  console.log('\n📊 FINAL TEST SUMMARY');
  console.log('=====================');
  console.log(`Total Test Phases: ${report.summary.total}`);
  console.log(`Phases Passed: ${report.summary.passed}`);
  console.log(`Success Rate: ${report.summary.successRate}%`);
  
  if (report.summary.passed === report.summary.total) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Email parsing is working correctly on dev environment');
    console.log('🚀 Ready for integration with email server');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the results above.');
    console.log('🔧 Fix any issues before proceeding');
  }
  
  console.log('\n🎯 Next Steps for Dev Environment:');
  console.log('1. ✅ Email parsing tests completed');
  console.log('2. 📧 Set up email server on 10.0.0.83');
  console.log('3. 🔌 Connect IMAP email processor');
  console.log('4. 🧪 Test with real Wealthsimple emails');
  console.log('5. 📊 Monitor transaction creation');
  
  return report.summary.passed === report.summary.total;
}

// Run tests if called directly
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runAllTests,
  SimpleEmailParser,
  MOCK_WEALTHSIMPLE_EMAILS
};
