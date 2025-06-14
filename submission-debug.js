// Test fund movement submission to identify exact error
// This script simulates the exact flow from form submission to database

console.log('=== FUND MOVEMENT SUBMISSION DEBUG ===');

// Simulate the exact form data that might be causing issues
const mockFormData = {
  portfolioId: 'test-portfolio-id',
  type: 'conversion',
  status: 'completed',
  date: '2025-06-14',
  amount: '9234.51',
  currency: 'USD',
  fees: '',
  notes: '',
  originalAmount: '13000.00',
  originalCurrency: 'CAD',
  convertedAmount: '9234.51',
  convertedCurrency: 'USD', 
  exchangeRate: '0.710347',
  exchangeFees: '0.7175',
  account: 'TFSA'
};

console.log('Mock form data:');
console.log(JSON.stringify(mockFormData, null, 2));

// Simulate the form's onSubmit processing
function simulateFormSubmission() {
  console.log('\n=== SIMULATING FORM SUBMISSION ===');
  
  // Parse values as the form does
  const fundMovement = {
    portfolioId: mockFormData.portfolioId,
    type: mockFormData.type,
    status: mockFormData.status,
    date: (() => {
      const [year, month, day] = mockFormData.date.split('-').map(Number);
      return new Date(year, month - 1, day);
    })(),
    amount: parseFloat(mockFormData.amount),
    currency: mockFormData.currency,
    fees: mockFormData.fees ? parseFloat(mockFormData.fees) : undefined,
    notes: mockFormData.notes.trim() || undefined,
    
    // Conversion fields
    originalAmount: parseFloat(mockFormData.originalAmount),
    originalCurrency: mockFormData.originalCurrency,
    convertedAmount: parseFloat(mockFormData.convertedAmount),
    convertedCurrency: mockFormData.convertedCurrency,
    exchangeRate: parseFloat(mockFormData.exchangeRate),
    exchangeFees: mockFormData.exchangeFees ? parseFloat(mockFormData.exchangeFees) : undefined,
    account: mockFormData.account
  };
  
  console.log('Parsed fund movement object:');
  console.log(JSON.stringify(fundMovement, null, 2));
  
  return fundMovement;
}

// Simulate the service layer processing
function simulateServiceProcessing(fundMovementData) {
  console.log('\n=== SIMULATING SERVICE PROCESSING ===');
  
  // Extract parameters as the service does
  const portfolioId = fundMovementData.portfolioId;
  const type = fundMovementData.type;
  const amount = fundMovementData.amount;
  const currency = fundMovementData.currency;
  const status = fundMovementData.status;
  const date = (() => {
    const dateObj = fundMovementData.date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  
  const options = {
    fees: fundMovementData.fees,
    notes: fundMovementData.notes,
    originalAmount: fundMovementData.originalAmount,
    originalCurrency: fundMovementData.originalCurrency,
    convertedAmount: fundMovementData.convertedAmount,
    convertedCurrency: fundMovementData.convertedCurrency,
    exchangeRate: fundMovementData.exchangeRate,
    exchangeFees: fundMovementData.exchangeFees,
    account: fundMovementData.account
  };
  
  console.log('Service parameters:');
  console.log('portfolioId:', portfolioId);
  console.log('type:', type);
  console.log('amount:', amount);
  console.log('currency:', currency);
  console.log('status:', status);
  console.log('date:', date);
  console.log('options:', JSON.stringify(options, null, 2));
  
  // Simulate validation constraints as in the service
  const maxDecimal15_6 = 999999999.999999;
  const maxDecimal15_8 = 9999999.99999999;
  const maxDecimal5_4 = 9.9999;
  
  console.log('\n=== CONSTRAINT VALIDATION ===');
  
  const validationErrors = [];
  
  if (amount > maxDecimal15_6) {
    validationErrors.push(`Amount (${amount}) exceeds maximum allowed value (${maxDecimal15_6})`);
  }
  
  if (options.originalAmount && options.originalAmount > maxDecimal15_6) {
    validationErrors.push(`Original amount (${options.originalAmount}) exceeds maximum allowed value (${maxDecimal15_6})`);
  }
  
  if (options.convertedAmount && options.convertedAmount > maxDecimal15_6) {
    validationErrors.push(`Converted amount (${options.convertedAmount}) exceeds maximum allowed value (${maxDecimal15_6})`);
  }
  
  if (options.exchangeRate && options.exchangeRate > maxDecimal15_8) {
    validationErrors.push(`Exchange rate (${options.exchangeRate}) exceeds maximum allowed value (${maxDecimal15_8})`);
  }
  
  if (options.exchangeFees && options.exchangeFees > maxDecimal5_4) {
    validationErrors.push(`Exchange fees percentage (${options.exchangeFees}) exceeds maximum allowed value (${maxDecimal5_4}%)`);
  }
  
  if (validationErrors.length > 0) {
    console.log('❌ VALIDATION ERRORS:');
    validationErrors.forEach(error => console.log(`  - ${error}`));
    return { success: false, errors: validationErrors };
  } else {
    console.log('✅ All validations passed');
  }
  
  // Simulate database payload construction
  const dbPayload = {
    portfolio_id: portfolioId,
    type,
    amount: Math.min(amount, maxDecimal15_6),
    currency,
    status,
    movement_date: date,
    fees: options.fees ? Math.min(options.fees, maxDecimal15_6) : 0,
    notes: options.notes,
    original_amount: options.originalAmount ? Math.min(options.originalAmount, maxDecimal15_6) : null,
    original_currency: options.originalCurrency,
    converted_amount: options.convertedAmount ? Math.min(options.convertedAmount, maxDecimal15_6) : null,
    converted_currency: options.convertedCurrency,
    exchange_rate: options.exchangeRate ? Math.min(options.exchangeRate, maxDecimal15_8) : null,
    exchange_fees: options.exchangeFees ? Math.min(options.exchangeFees, maxDecimal5_4) : 0,
    account: options.account
  };
  
  console.log('\n=== DATABASE PAYLOAD ===');
  console.log(JSON.stringify(dbPayload, null, 2));
  
  // Check for any potential database constraint issues
  console.log('\n=== FINAL CONSTRAINT CHECK ===');
  const finalErrors = [];
  
  Object.entries(dbPayload).forEach(([key, value]) => {
    if (typeof value === 'number') {
      if (isNaN(value)) {
        finalErrors.push(`${key} is NaN`);
      }
      if (!isFinite(value)) {
        finalErrors.push(`${key} is not finite`);
      }
      if (value < 0 && ['amount', 'fees', 'original_amount', 'converted_amount'].includes(key)) {
        finalErrors.push(`${key} is negative but should be positive`);
      }
    }
  });
  
  if (finalErrors.length > 0) {
    console.log('❌ FINAL ERRORS:');
    finalErrors.forEach(error => console.log(`  - ${error}`));
    return { success: false, errors: finalErrors };
  } else {
    console.log('✅ Ready for database insertion');
    return { success: true, payload: dbPayload };
  }
}

// Run the simulation
const fundMovement = simulateFormSubmission();
const result = simulateServiceProcessing(fundMovement);

console.log('\n=== FINAL RESULT ===');
if (result.success) {
  console.log('✅ Fund movement should be submitted successfully');
  console.log('This suggests the issue might be elsewhere (database connection, RLS policies, etc.)');
} else {
  console.log('❌ Found issues that would prevent submission:');
  result.errors.forEach(error => console.log(`  - ${error}`));
}
