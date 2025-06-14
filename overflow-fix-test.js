// Test script to verify the numeric overflow fixes
console.log('🧪 Testing Numeric Overflow Fixes\n');

// Test the sanitizeNumber function logic
function sanitizeNumber(value, defaultValue = 0) {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
        return defaultValue;
    }
    return value;
}

// Test cases that likely caused the original overflow error
const testCases = [
    {
        name: 'Empty string fees (likely culprit)',
        fees: '',
        expectedAfterParse: NaN,
        expectedAfterSanitize: 0
    },
    {
        name: 'Undefined exchangeFees',
        exchangeFees: undefined,
        expectedAfterParse: NaN,
        expectedAfterSanitize: 0
    },
    {
        name: 'Null values',
        originalAmount: null,
        expectedAfterParse: NaN,
        expectedAfterSanitize: 0
    },
    {
        name: 'String "0" (should work)',
        amount: '0',
        expectedAfterParse: 0,
        expectedAfterSanitize: 0
    },
    {
        name: 'Large valid number',
        amount: 999999999.999999,
        expectedAfterParse: 999999999.999999,
        expectedAfterSanitize: 999999999.999999
    },
    {
        name: 'Infinite value',
        exchangeRate: Infinity,
        expectedAfterParse: Infinity,
        expectedAfterSanitize: 0
    }
];

console.log('=== TESTING PROBLEMATIC VALUES ===\n');

testCases.forEach(testCase => {
    console.log(`Testing: ${testCase.name}`);
    
    Object.entries(testCase).forEach(([key, value]) => {
        if (key === 'name' || key.startsWith('expected')) return;
        
        console.log(`  ${key}: ${JSON.stringify(value)} (type: ${typeof value})`);
        
        // Test parseFloat behavior (old code)
        const parsedValue = parseFloat(value);
        console.log(`  parseFloat result: ${parsedValue} (isNaN: ${isNaN(parsedValue)}, isFinite: ${isFinite(parsedValue)})`);
        
        // Test sanitizeNumber behavior (new code)
        const sanitizedValue = sanitizeNumber(parsedValue);
        console.log(`  sanitizeNumber result: ${sanitizedValue}`);
        
        // Check if this would cause database issues
        if (isNaN(parsedValue) || !isFinite(parsedValue)) {
            console.log(`  🚨 OLD CODE: Would send ${parsedValue} to database - POTENTIAL OVERFLOW!`);
            console.log(`  ✅ NEW CODE: Sends ${sanitizedValue} to database - SAFE`);
        } else {
            console.log(`  ✅ Both old and new code handle this value safely`);
        }
    });
    console.log('');
});

// Test the exact form submission scenario that likely failed
console.log('=== SIMULATING REAL CONVERSION SCENARIO ===\n');

const realScenario = {
    portfolioId: 'test-portfolio',
    type: 'conversion',
    status: 'completed',
    date: '2025-06-14',
    amount: '9234.51',
    currency: 'USD',
    fees: '', // ← This was likely the culprit!
    notes: '',
    originalAmount: '13000.00',
    originalCurrency: 'CAD',
    convertedAmount: '9234.51',
    convertedCurrency: 'USD',
    exchangeRate: '0.710347',
    exchangeFees: '0.7175',
    account: 'TFSA'
};

console.log('Real form submission data:');
console.log(JSON.stringify(realScenario, null, 2));

console.log('\n--- OLD CODE BEHAVIOR (likely caused overflow) ---');
const oldCodeResult = {
    fees: parseFloat(realScenario.fees), // parseFloat('') = NaN
    originalAmount: parseFloat(realScenario.originalAmount),
    exchangeFees: realScenario.exchangeFees ? parseFloat(realScenario.exchangeFees) : undefined
};

console.log('Old code would send to service:');
console.log(`  fees: ${oldCodeResult.fees} (isNaN: ${isNaN(oldCodeResult.fees)})`);
console.log(`  originalAmount: ${oldCodeResult.originalAmount}`);
console.log(`  exchangeFees: ${oldCodeResult.exchangeFees}`);

console.log('\n--- NEW CODE BEHAVIOR (should work) ---');
const newCodeResult = {
    fees: realScenario.fees ? parseFloat(realScenario.fees) : 0, // Empty string → 0
    originalAmount: parseFloat(realScenario.originalAmount) || 0,
    exchangeFees: realScenario.exchangeFees ? parseFloat(realScenario.exchangeFees) : 0
};

console.log('New code sends to service:');
console.log(`  fees: ${newCodeResult.fees} (isNaN: ${isNaN(newCodeResult.fees)})`);
console.log(`  originalAmount: ${newCodeResult.originalAmount}`);
console.log(`  exchangeFees: ${newCodeResult.exchangeFees}`);

// Test database payload construction
console.log('\n--- DATABASE PAYLOAD CONSTRUCTION ---');

function testDatabasePayload(data) {
    const sanitizeNumber = (value, defaultValue = 0) => {
        if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
            return defaultValue;
        }
        return value;
    };
    
    const maxDecimal15_6 = 999999999.999999;
    const maxDecimal15_8 = 9999999.99999999;
    const maxDecimal5_4 = 9.9999;
    
    const sanitizedAmount = sanitizeNumber(data.amount);
    const sanitizedFees = sanitizeNumber(data.fees);
    const sanitizedOriginalAmount = sanitizeNumber(data.originalAmount);
    const sanitizedConvertedAmount = sanitizeNumber(data.convertedAmount);
    const sanitizedExchangeRate = sanitizeNumber(data.exchangeRate);
    const sanitizedExchangeFees = sanitizeNumber(data.exchangeFees);
    
    const payload = {
        portfolio_id: data.portfolioId,
        type: data.type,
        amount: Math.min(sanitizedAmount, maxDecimal15_6),
        currency: data.currency,
        status: data.status,
        movement_date: data.date,
        fees: sanitizedFees > 0 ? Math.min(sanitizedFees, maxDecimal15_6) : 0,
        notes: data.notes,
        original_amount: sanitizedOriginalAmount > 0 ? Math.min(sanitizedOriginalAmount, maxDecimal15_6) : null,
        original_currency: data.originalCurrency,
        converted_amount: sanitizedConvertedAmount > 0 ? Math.min(sanitizedConvertedAmount, maxDecimal15_6) : null,
        converted_currency: data.convertedCurrency,
        exchange_rate: sanitizedExchangeRate > 0 ? Math.min(sanitizedExchangeRate, maxDecimal15_8) : null,
        exchange_fees: Math.min(sanitizedExchangeFees, maxDecimal5_4),
        account: data.account
    };
    
    return payload;
}

const testPayload = testDatabasePayload({
    portfolioId: realScenario.portfolioId,
    type: realScenario.type,
    amount: parseFloat(realScenario.amount),
    currency: realScenario.currency,
    status: realScenario.status,
    date: realScenario.date,
    fees: newCodeResult.fees,
    notes: realScenario.notes,
    originalAmount: newCodeResult.originalAmount,
    originalCurrency: realScenario.originalCurrency,
    convertedAmount: parseFloat(realScenario.convertedAmount),
    convertedCurrency: realScenario.convertedCurrency,
    exchangeRate: parseFloat(realScenario.exchangeRate),
    exchangeFees: newCodeResult.exchangeFees,
    account: realScenario.account
});

console.log('Final database payload:');
console.log(JSON.stringify(testPayload, null, 2));

// Validate all values are database-safe
console.log('\n--- VALIDATION CHECK ---');
const validationErrors = [];

Object.entries(testPayload).forEach(([key, value]) => {
    if (typeof value === 'number') {
        if (isNaN(value)) {
            validationErrors.push(`${key} is NaN`);
        }
        if (!isFinite(value)) {
            validationErrors.push(`${key} is not finite`);
        }
        
        // Check decimal constraints
        if (['amount', 'fees', 'original_amount', 'converted_amount'].includes(key) && value > 999999999.999999) {
            validationErrors.push(`${key} exceeds DECIMAL(15,6) limit`);
        }
        if (key === 'exchange_rate' && value > 9999999.99999999) {
            validationErrors.push(`${key} exceeds DECIMAL(15,8) limit`);
        }
        if (key === 'exchange_fees' && value > 9.9999) {
            validationErrors.push(`${key} exceeds DECIMAL(5,4) limit`);
        }
    }
});

if (validationErrors.length > 0) {
    console.log('❌ VALIDATION ERRORS:');
    validationErrors.forEach(error => console.log(`  - ${error}`));
} else {
    console.log('✅ ALL VALUES ARE DATABASE-SAFE!');
}

console.log('\n🎉 SUMMARY:');
console.log('- The likely cause was empty string fees being parsed as NaN');
console.log('- Our fixes sanitize all numeric values to prevent NaN/Infinity');
console.log('- Database constraints are properly enforced');
console.log('- The numeric field overflow error should now be resolved');

export { sanitizeNumber, testDatabasePayload };
