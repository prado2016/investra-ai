// Test to identify the exact scenario causing numeric field overflow
console.log('=== IDENTIFYING NUMERIC FIELD OVERFLOW ===');

// Based on the database schema analysis, let's test specific edge cases
// that might be causing the overflow

function testPotentialOverflowScenarios() {
  console.log('Testing potential overflow scenarios...\n');
  
  const scenarios = [
    {
      name: 'Normal conversion',
      data: {
        amount: 9234.51,
        original_amount: 13000.00,
        converted_amount: 9234.51,
        exchange_rate: 0.710347,
        exchange_fees: 0.7175
      }
    },
    {
      name: 'High precision exchange rate',
      data: {
        amount: 5000.123456,
        original_amount: 7000.123456,
        converted_amount: 5000.123456,
        exchange_rate: 0.714449734,
        exchange_fees: 1.0101
      }
    },
    {
      name: 'Maximum DECIMAL(15,6) values',
      data: {
        amount: 999999999.999999,
        original_amount: 999999999.999999,
        converted_amount: 999999999.999999,
        exchange_rate: 9999999.99999999,
        exchange_fees: 9.9999
      }
    },
    {
      name: 'Values exceeding DECIMAL(15,6)',
      data: {
        amount: 1000000000.0,
        original_amount: 1000000000.0,
        converted_amount: 1000000000.0,
        exchange_rate: 0.5,
        exchange_fees: 1.0
      }
    },
    {
      name: 'Exchange rate exceeding DECIMAL(15,8)',
      data: {
        amount: 5000.0,
        original_amount: 10000.0,
        converted_amount: 5000.0,
        exchange_rate: 10000000.0, // Exceeds DECIMAL(15,8)
        exchange_fees: 1.0
      }
    },
    {
      name: 'Exchange fees exceeding DECIMAL(5,4)',
      data: {
        amount: 5000.0,
        original_amount: 10000.0,
        converted_amount: 5000.0,
        exchange_rate: 0.5,
        exchange_fees: 10.0 // Exceeds DECIMAL(5,4)
      }
    },
    {
      name: 'Negative values (should be caught)',
      data: {
        amount: -1000.0,
        original_amount: 1000.0,
        converted_amount: -500.0,
        exchange_rate: 0.5,
        exchange_fees: -1.0
      }
    },
    {
      name: 'Zero values',
      data: {
        amount: 0.0,
        original_amount: 0.0,
        converted_amount: 0.0,
        exchange_rate: 0.0,
        exchange_fees: 0.0
      }
    },
    {
      name: 'Very small values',
      data: {
        amount: 0.000001,
        original_amount: 0.000001,
        converted_amount: 0.000001,
        exchange_rate: 0.00000001,
        exchange_fees: 0.0001
      }
    },
    {
      name: 'High precision with rounding',
      data: {
        amount: 9234.5123456789,
        original_amount: 13000.9876543210,
        converted_amount: 9234.5123456789,
        exchange_rate: 0.7103471234567890,
        exchange_fees: 1.01234
      }
    }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`--- ${scenario.name} ---`);
    console.log('Data:', JSON.stringify(scenario.data, null, 2));
    
    const violations = validateDatabaseConstraints(scenario.data);
    
    if (violations.length > 0) {
      console.log('❌ CONSTRAINT VIOLATIONS:');
      violations.forEach(violation => console.log(`  - ${violation}`));
    } else {
      console.log('✅ All constraints satisfied');
    }
    
    // Test string representation and JSON serialization
    console.log('String representations:');
    Object.entries(scenario.data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        console.log(`  ${key}: ${value} -> "${value.toString()}" -> ${JSON.stringify(value)}`);
      }
    });
    
    console.log('');
  });
}

function validateDatabaseConstraints(data) {
  const violations = [];
  
  // DECIMAL(15,6) constraints - max value 999,999,999.999999
  const maxDecimal15_6 = 999999999.999999;
  const decimal15_6_fields = ['amount', 'original_amount', 'converted_amount'];
  
  decimal15_6_fields.forEach(field => {
    const value = data[field];
    if (value !== undefined && value !== null) {
      if (value > maxDecimal15_6) {
        violations.push(`${field} (${value}) exceeds DECIMAL(15,6) max (${maxDecimal15_6})`);
      }
      if (value < 0 && field === 'amount') {
        violations.push(`${field} (${value}) is negative but has CHECK constraint > 0`);
      }
      // Check precision
      const str = value.toString();
      const totalDigits = str.replace(/[.-]/, '').length;
      const decimalPlaces = (str.split('.')[1] || '').length;
      if (totalDigits > 15) {
        violations.push(`${field} has ${totalDigits} total digits, exceeds DECIMAL(15,6) limit`);
      }
      if (decimalPlaces > 6) {
        violations.push(`${field} has ${decimalPlaces} decimal places, exceeds DECIMAL(15,6) limit`);
      }
    }
  });
  
  // DECIMAL(15,8) constraint - max value 9,999,999.99999999  
  const maxDecimal15_8 = 9999999.99999999;
  if (data.exchange_rate !== undefined && data.exchange_rate !== null) {
    if (data.exchange_rate > maxDecimal15_8) {
      violations.push(`exchange_rate (${data.exchange_rate}) exceeds DECIMAL(15,8) max (${maxDecimal15_8})`);
    }
    // Check precision
    const str = data.exchange_rate.toString();
    const totalDigits = str.replace(/[.-]/, '').length;
    const decimalPlaces = (str.split('.')[1] || '').length;
    if (totalDigits > 15) {
      violations.push(`exchange_rate has ${totalDigits} total digits, exceeds DECIMAL(15,8) limit`);
    }
    if (decimalPlaces > 8) {
      violations.push(`exchange_rate has ${decimalPlaces} decimal places, exceeds DECIMAL(15,8) limit`);
    }
  }
  
  // DECIMAL(5,4) constraint - max value 9.9999
  const maxDecimal5_4 = 9.9999;
  if (data.exchange_fees !== undefined && data.exchange_fees !== null) {
    if (data.exchange_fees > maxDecimal5_4) {
      violations.push(`exchange_fees (${data.exchange_fees}) exceeds DECIMAL(5,4) max (${maxDecimal5_4})`);
    }
    // Check precision
    const str = data.exchange_fees.toString();
    const totalDigits = str.replace(/[.-]/, '').length;
    const decimalPlaces = (str.split('.')[1] || '').length;
    if (totalDigits > 5) {
      violations.push(`exchange_fees has ${totalDigits} total digits, exceeds DECIMAL(5,4) limit`);
    }
    if (decimalPlaces > 4) {
      violations.push(`exchange_fees has ${decimalPlaces} decimal places, exceeds DECIMAL(5,4) limit`);
    }
  }
  
  return violations;
}

// Test specific calculation that might be problematic
function testProblematicCalculation() {
  console.log('=== TESTING POTENTIALLY PROBLEMATIC CALCULATION ===');
  
  // Test the exact scenario from the form with potential precision issues
  const originalAmount = 13000.00;
  const exchangeRate = 0.710347;
  
  console.log(`Testing with originalAmount: ${originalAmount}, exchangeRate: ${exchangeRate}`);
  
  // Follow the exact calculation steps from the form
  const realRate = exchangeRate / 0.99;
  const convertedAmount = originalAmount * exchangeRate;
  const feeAmount = (originalAmount * realRate) - convertedAmount;
  const feePercentage = (feeAmount / originalAmount) * 100;
  
  console.log('Intermediate calculations:');
  console.log(`  realRate: ${realRate} (${realRate.toString()})`);
  console.log(`  convertedAmount: ${convertedAmount} (${convertedAmount.toString()})`);
  console.log(`  feeAmount: ${feeAmount} (${feeAmount.toString()})`);
  console.log(`  feePercentage: ${feePercentage} (${feePercentage.toString()})`);
  
  // Apply the same constraints as the form
  const validConvertedAmount = Math.max(0, convertedAmount);
  const validFeePercentage = Math.min(Math.max(0, feePercentage), 9.9999);
  const maxAmount = 999999999.999999;
  const finalConvertedAmount = Math.min(validConvertedAmount, maxAmount);
  
  console.log('After constraints:');
  console.log(`  validConvertedAmount: ${validConvertedAmount}`);
  console.log(`  validFeePercentage: ${validFeePercentage}`);
  console.log(`  finalConvertedAmount: ${finalConvertedAmount}`);
  
  // Format as the form would
  const formattedValues = {
    convertedAmount: finalConvertedAmount.toFixed(2),
    amount: finalConvertedAmount.toFixed(2),
    exchangeFees: validFeePercentage.toFixed(4)
  };
  
  console.log('Formatted for form:');
  console.log(`  convertedAmount: "${formattedValues.convertedAmount}"`);
  console.log(`  amount: "${formattedValues.amount}"`);
  console.log(`  exchangeFees: "${formattedValues.exchangeFees}"`);
  
  // Parse back to numbers as the submission would
  const parsedValues = {
    amount: parseFloat(formattedValues.amount),
    originalAmount: originalAmount,
    convertedAmount: parseFloat(formattedValues.convertedAmount),
    exchangeRate: exchangeRate,
    exchangeFees: parseFloat(formattedValues.exchangeFees)
  };
  
  console.log('Parsed for database:');
  console.log(JSON.stringify(parsedValues, null, 2));
  
  const violations = validateDatabaseConstraints(parsedValues);
  if (violations.length > 0) {
    console.log('❌ VIOLATIONS FOUND:');
    violations.forEach(v => console.log(`  - ${v}`));
  } else {
    console.log('✅ No violations - this should work');
  }
}

// Run all tests
testPotentialOverflowScenarios();
testProblematicCalculation();
