// Comprehensive test to identify numeric field overflow issue
console.log('=== COMPREHENSIVE FUND MOVEMENT DEBUG ===');

// Test multiple scenarios that could cause numeric overflow
function runComprehensiveTests() {
  console.log('Testing various scenarios that could cause numeric overflow...\n');
  
  // Scenario 1: Normal conversion (baseline)
  testScenario({
    originalAmount: 13000,
    exchangeRate: 0.710347,
    description: 'Normal conversion (baseline)'
  });
  
  // Scenario 2: Very large amount
  testScenario({
    originalAmount: 900000000, // Close to DECIMAL(15,6) limit
    exchangeRate: 0.75,
    description: 'Very large amount'
  });
  
  // Scenario 3: Very small exchange rate
  testScenario({
    originalAmount: 10000,
    exchangeRate: 0.000001, // Very small rate
    description: 'Very small exchange rate'
  });
  
  // Scenario 4: Exchange rate > 1 (could cause negative fees)
  testScenario({
    originalAmount: 10000,
    exchangeRate: 1.5,
    description: 'Exchange rate > 1'
  });
  
  // Scenario 5: High precision exchange rate
  testScenario({
    originalAmount: 50000,
    exchangeRate: 0.123456789, // High precision
    description: 'High precision exchange rate'
  });
  
  // Scenario 6: Exchange rate causing high fee percentage
  testScenario({
    originalAmount: 1000,
    exchangeRate: 0.9, // Would cause ~1% fee
    description: 'High fee percentage scenario'
  });
  
  // Scenario 7: Edge case - maximum possible values
  testScenario({
    originalAmount: 999999999, // Max for DECIMAL(15,6) integer part
    exchangeRate: 0.000001, // Min reasonable rate
    description: 'Edge case - max amount, min rate'
  });
  
  // Scenario 8: Test with string inputs (like from form)
  testStringScenario({
    originalAmount: '13000.00',
    exchangeRate: '0.710347',
    description: 'String inputs (form simulation)'
  });
}

function testScenario({ originalAmount, exchangeRate, description }) {
  console.log(`--- ${description} ---`);
  console.log(`Input: ${originalAmount} at rate ${exchangeRate}`);
  
  try {
    // Calculate values using the same logic as the form
    const realRate = exchangeRate / 0.99;
    const convertedAmount = originalAmount * exchangeRate;
    const feeAmount = (originalAmount * realRate) - convertedAmount;
    const feePercentage = originalAmount > 0 ? (feeAmount / originalAmount) * 100 : 0;
    
    // Apply constraints
    const validConvertedAmount = Math.max(0, convertedAmount);
    const validFeePercentage = Math.min(Math.max(0, feePercentage), 9.9999);
    const maxAmount = 999999999.999999;
    const finalConvertedAmount = Math.min(validConvertedAmount, maxAmount);
    
    console.log(`  Real rate: ${realRate}`);
    console.log(`  Converted amount: ${convertedAmount}`);
    console.log(`  Fee amount: ${feeAmount}`);
    console.log(`  Fee percentage: ${feePercentage}`);
    console.log(`  Final converted: ${finalConvertedAmount}`);
    console.log(`  Final fee %: ${validFeePercentage}`);
    
    // Check for constraint violations
    const constraints = {
      'Amount > DECIMAL(15,6)': originalAmount > 999999999.999999,
      'Converted > DECIMAL(15,6)': finalConvertedAmount > 999999999.999999,
      'Exchange rate > DECIMAL(15,8)': exchangeRate > 9999999.99999999,
      'Fee % > DECIMAL(5,4)': validFeePercentage > 9.9999,
      'NaN in fee %': isNaN(feePercentage),
      'Infinity in fee %': !isFinite(feePercentage),
      'Negative fee %': feePercentage < 0
    };
    
    const violations = Object.entries(constraints).filter(([, violated]) => violated);
    
    if (violations.length > 0) {
      console.log(`  ⚠️  CONSTRAINT VIOLATIONS:`);
      violations.forEach(([constraint]) => console.log(`    - ${constraint}`));
    } else {
      console.log(`  ✅ All constraints satisfied`);
    }
    
    // Test the exact values that would be sent to the database
    const dbPayload = {
      amount: finalConvertedAmount,
      original_amount: originalAmount,
      converted_amount: finalConvertedAmount,
      exchange_rate: exchangeRate,
      exchange_fees: validFeePercentage
    };
    
    console.log(`  DB Payload:`, JSON.stringify(dbPayload, null, 2));
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
}

function testStringScenario({ originalAmount, exchangeRate, description }) {
  console.log(`--- ${description} ---`);
  console.log(`String inputs: "${originalAmount}" at rate "${exchangeRate}"`);
  
  // Convert strings to numbers like the form does
  const numOriginal = parseFloat(originalAmount);
  const numRate = parseFloat(exchangeRate);
  
  console.log(`  Parsed to: ${numOriginal} at rate ${numRate}`);
  console.log(`  isNaN checks: original=${isNaN(numOriginal)}, rate=${isNaN(numRate)}`);
  
  if (!isNaN(numOriginal) && !isNaN(numRate)) {
    testScenario({
      originalAmount: numOriginal,
      exchangeRate: numRate,
      description: `${description} (parsed)`
    });
  } else {
    console.log(`  ❌ Failed to parse strings to valid numbers`);
  }
}

// Test for potential database precision issues
function testDatabasePrecision() {
  console.log('=== DATABASE PRECISION TESTS ===');
  
  const testValues = [
    { value: 999999999.999999, type: 'DECIMAL(15,6) max' },
    { value: 999999999.9999999, type: 'DECIMAL(15,6) + 1 precision' },
    { value: 1000000000, type: 'DECIMAL(15,6) overflow' },
    { value: 9999999.99999999, type: 'DECIMAL(15,8) max' },
    { value: 9999999.999999999, type: 'DECIMAL(15,8) + 1 precision' },
    { value: 9.9999, type: 'DECIMAL(5,4) max' },
    { value: 9.99999, type: 'DECIMAL(5,4) + 1 precision' },
    { value: 10.0, type: 'DECIMAL(5,4) overflow' }
  ];
  
  testValues.forEach(({ value, type }) => {
    console.log(`${type}: ${value}`);
    console.log(`  String representation: "${value.toString()}"`);
    console.log(`  JSON serialized: ${JSON.stringify(value)}`);
    console.log(`  Precision: ${value.toString().replace('.', '').length} total digits`);
    console.log(`  Decimal places: ${(value.toString().split('.')[1] || '').length}`);
    console.log('');
  });
}

// Run all tests
runComprehensiveTests();
testDatabasePrecision();

console.log('=== RECOMMENDATIONS ===');
console.log('1. Check browser console for actual error messages');
console.log('2. Check network tab for failed requests');
console.log('3. Verify database schema matches expected DECIMAL constraints');
console.log('4. Test with mock service to isolate database vs validation issues');
