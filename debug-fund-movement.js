// Debug fund movement numeric overflow issue
console.log('=== DEBUGGING FUND MOVEMENT OVERFLOW ===');

// Test the exact calculation from the form
function testFundMovementCalculation() {
  const originalAmount = 13000.00;
  const exchangeRate = 0.710347;
  
  console.log('Input values:');
  console.log('  originalAmount:', originalAmount);
  console.log('  exchangeRate:', exchangeRate);
  
  // Calculate real rate (user rate ÷ 0.99)
  const realRate = exchangeRate / 0.99;
  
  // Calculate converted amount using user-provided rate
  const convertedAmount = originalAmount * exchangeRate;
  
  // Calculate fee: (originalAmount × realRate) - convertedAmount
  const feeAmount = (originalAmount * realRate) - convertedAmount;
  
  // Calculate fee percentage: (feeAmount / originalAmount) * 100
  const feePercentage = (feeAmount / originalAmount) * 100;
  
  console.log('\nCalculated values:');
  console.log('  realRate:', realRate);
  console.log('  convertedAmount:', convertedAmount);
  console.log('  feeAmount:', feeAmount);
  console.log('  feePercentage:', feePercentage);
  
  // Apply constraints
  const validConvertedAmount = Math.max(0, convertedAmount);
  const validFeePercentage = Math.min(Math.max(0, feePercentage), 9.9999);
  
  // Validate amounts don't exceed DECIMAL(15,6) constraint
  const maxAmount = 999999999.999999;
  const finalConvertedAmount = Math.min(validConvertedAmount, maxAmount);
  
  console.log('\nConstraint validation:');
  console.log('  validConvertedAmount:', validConvertedAmount);
  console.log('  validFeePercentage:', validFeePercentage);
  console.log('  finalConvertedAmount:', finalConvertedAmount);
  
  // Final formatted values
  console.log('\nFinal form values:');
  console.log('  convertedAmount.toFixed(2):', finalConvertedAmount.toFixed(2));
  console.log('  amount.toFixed(2):', finalConvertedAmount.toFixed(2));
  console.log('  exchangeFees.toFixed(4):', validFeePercentage.toFixed(4));
  
  // Check database constraints
  const maxDecimal15_6 = 999999999.999999;
  const maxDecimal15_8 = 9999999.99999999;
  const maxDecimal5_4 = 9.9999;
  
  console.log('\nDatabase constraint checks:');
  console.log('  originalAmount > maxDecimal15_6:', originalAmount > maxDecimal15_6);
  console.log('  finalConvertedAmount > maxDecimal15_6:', finalConvertedAmount > maxDecimal15_6);
  console.log('  exchangeRate > maxDecimal15_8:', exchangeRate > maxDecimal15_8);
  console.log('  validFeePercentage > maxDecimal5_4:', validFeePercentage > maxDecimal5_4);
  
  // Test potential overflow scenarios
  console.log('\n=== TESTING OVERFLOW SCENARIOS ===');
  
  // Scenario 1: Very large original amount
  testScenario(1000000000, 0.5, 'Large amount');
  
  // Scenario 2: Very small exchange rate
  testScenario(10000, 0.001, 'Small exchange rate');
  
  // Scenario 3: Exchange rate > 1 (which would make fee percentage negative)
  testScenario(10000, 1.5, 'Exchange rate > 1');
}

function testScenario(originalAmount, exchangeRate, description) {
  console.log(`\n--- ${description} ---`);
  console.log(`Original: ${originalAmount}, Rate: ${exchangeRate}`);
  
  try {
    const realRate = exchangeRate / 0.99;
    const convertedAmount = originalAmount * exchangeRate;
    const feeAmount = (originalAmount * realRate) - convertedAmount;
    const feePercentage = (feeAmount / originalAmount) * 100;
    
    console.log(`Fee percentage: ${feePercentage}`);
    console.log(`Exceeds DECIMAL(5,4): ${feePercentage > 9.9999}`);
    console.log(`Converted amount: ${convertedAmount}`);
    console.log(`Exceeds DECIMAL(15,6): ${convertedAmount > 999999999.999999}`);
    
    // Check for potential database issues
    if (feePercentage > 9.9999) {
      console.log('⚠️  WARNING: Fee percentage exceeds DECIMAL(5,4) limit!');
    }
    if (convertedAmount > 999999999.999999) {
      console.log('⚠️  WARNING: Converted amount exceeds DECIMAL(15,6) limit!');
    }
    if (isNaN(feePercentage) || !isFinite(feePercentage)) {
      console.log('⚠️  WARNING: Fee percentage is NaN or Infinity!');
    }
    
  } catch (error) {
    console.log('❌ Error in calculation:', error.message);
  }
}

// Run the test
testFundMovementCalculation();
