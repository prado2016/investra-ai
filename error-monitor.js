// Error monitoring script to capture fund movement submission data
// Run this alongside the application to monitor for overflow errors

const fs = require('fs');
const path = require('path');

// Function to log fund movement data
function logFundMovementData(data, error = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        data,
        error: error ? error.toString() : null,
        validation: validateFundMovementData(data)
    };
    
    const logFile = path.join(__dirname, 'fund-movement-error-log.json');
    let logs = [];
    
    try {
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
    } catch (e) {
        console.log('Could not read existing log file');
    }
    
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    console.log('Logged fund movement data:', logEntry);
}

// Validate fund movement data against database constraints
function validateFundMovementData(data) {
    const validation = {
        valid: true,
        issues: []
    };
    
    // DECIMAL(15,6) constraints (amount, converted_amount, original_amount)
    const maxDecimal15_6 = 999999999.999999;
    const decimal15_6Fields = ['amount', 'converted_amount', 'original_amount'];
    
    // DECIMAL(15,8) constraints (exchange_rate)
    const maxDecimal15_8 = 9999999.99999999;
    const decimal15_8Fields = ['exchange_rate'];
    
    // DECIMAL(5,4) constraints (exchange_fees)
    const maxDecimal5_4 = 9.9999;
    const decimal5_4Fields = ['exchange_fees'];
    
    // Check each field
    [...decimal15_6Fields, ...decimal15_8Fields, ...decimal5_4Fields].forEach(field => {
        if (data[field] !== undefined && data[field] !== null) {
            const value = parseFloat(data[field]);
            let maxValue;
            
            if (decimal15_6Fields.includes(field)) {
                maxValue = maxDecimal15_6;
            } else if (decimal15_8Fields.includes(field)) {
                maxValue = maxDecimal15_8;
            } else if (decimal5_4Fields.includes(field)) {
                maxValue = maxDecimal5_4;
            }
            
            if (value > maxValue) {
                validation.valid = false;
                validation.issues.push({
                    field,
                    value,
                    maxValue,
                    constraint: getConstraintType(field)
                });
            }
            
            // Check for negative values
            if (value < 0 && field !== 'amount') { // amount can be negative for withdrawals
                validation.valid = false;
                validation.issues.push({
                    field,
                    value,
                    issue: 'negative_value'
                });
            }
        }
    });
    
    return validation;
}

function getConstraintType(field) {
    const decimal15_6Fields = ['amount', 'converted_amount', 'original_amount'];
    const decimal15_8Fields = ['exchange_rate'];
    const decimal5_4Fields = ['exchange_fees'];
    
    if (decimal15_6Fields.includes(field)) return 'DECIMAL(15,6)';
    if (decimal15_8Fields.includes(field)) return 'DECIMAL(15,8)';
    if (decimal5_4Fields.includes(field)) return 'DECIMAL(5,4)';
    return 'unknown';
}

// Test scenarios that might cause overflow
function testOverflowScenarios() {
    console.log('Testing potential overflow scenarios...\n');
    
    const scenarios = [
        {
            name: 'Large USD to EUR conversion',
            data: {
                amount: 1000000,
                original_amount: 1000000,
                converted_amount: 850000,
                exchange_rate: 0.85,
                exchange_fees: 2.5,
                currency: 'EUR',
                original_currency: 'USD'
            }
        },
        {
            name: 'High precision exchange rate',
            data: {
                amount: 10000,
                original_amount: 10000,
                converted_amount: 8765.4321,
                exchange_rate: 0.87654321,
                exchange_fees: 1.2345,
                currency: 'EUR',
                original_currency: 'USD'
            }
        },
        {
            name: 'Maximum allowed values',
            data: {
                amount: 999999999.999999,
                original_amount: 999999999.999999,
                converted_amount: 999999999.999999,
                exchange_rate: 9999999.99999999,
                exchange_fees: 9.9999,
                currency: 'EUR',
                original_currency: 'USD'
            }
        },
        {
            name: 'Edge case - values just over limit',
            data: {
                amount: 1000000000, // Over DECIMAL(15,6) limit
                original_amount: 1000000000,
                converted_amount: 1000000000,
                exchange_rate: 10000000, // Over DECIMAL(15,8) limit
                exchange_fees: 10, // Over DECIMAL(5,4) limit
                currency: 'EUR',
                original_currency: 'USD'
            }
        }
    ];
    
    scenarios.forEach(scenario => {
        console.log(`\n--- ${scenario.name} ---`);
        const validation = validateFundMovementData(scenario.data);
        console.log('Data:', scenario.data);
        console.log('Validation:', validation);
        
        if (!validation.valid) {
            console.log('⚠️  This scenario would cause overflow!');
            validation.issues.forEach(issue => {
                console.log(`  - ${issue.field}: ${issue.value} exceeds ${issue.maxValue} (${issue.constraint})`);
            });
        } else {
            console.log('✅ This scenario is within constraints');
        }
    });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        logFundMovementData,
        validateFundMovementData,
        testOverflowScenarios
    };
}

// Run tests if called directly
if (require.main === module) {
    testOverflowScenarios();
}
