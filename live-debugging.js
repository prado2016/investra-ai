// Live debugging script - monitors actual form submission values
// This script will run alongside the app to capture the exact data being sent

console.log('🎯 Starting live debugging - monitoring fund movement submissions...\n');

// Patch the FundMovementService to intercept real calls
let originalCreateFundMovement;

// Function to monkey-patch the service for debugging
function startDebugging() {
    // This would be injected into the browser console
    console.log('🔍 To debug in the browser, paste this into the console after opening the app:');
    console.log(`
// Debugging injection script for browser console
const debugFundMovement = (function() {
    if (!window.FundMovementService) {
        console.log('❌ FundMovementService not found - service might not be exposed globally');
        return;
    }

    // Store original method
    const originalCreate = window.FundMovementService.createFundMovement;
    
    // Replace with debugging version
    window.FundMovementService.createFundMovement = async function(...args) {
        console.log('🎯 INTERCEPTED FUND MOVEMENT CREATION:');
        console.log('Arguments:', args);
        
        const [portfolioId, type, amount, currency, status, date, options] = args;
        
        console.log('=== PARAMETER ANALYSIS ===');
        console.log('portfolioId:', portfolioId, 'type:', typeof portfolioId);
        console.log('type:', type, 'type:', typeof type);
        console.log('amount:', amount, 'type:', typeof amount, 'isNaN:', isNaN(amount));
        console.log('currency:', currency, 'type:', typeof currency);
        console.log('status:', status, 'type:', typeof status);
        console.log('date:', date, 'type:', typeof date);
        console.log('options:', options);
        
        if (options) {
            console.log('=== OPTIONS ANALYSIS ===');
            Object.entries(options).forEach(([key, value]) => {
                console.log(\`\${key}: \${value}, type: \${typeof value}, isNaN: \${typeof value === 'number' ? isNaN(value) : 'N/A'}\`);
            });
        }
        
        // Check for potential overflow values
        const potentialOverflows = [];
        
        // DECIMAL(15,6) fields
        const decimal15_6_limit = 999999999.999999;
        ['amount', 'fees', 'originalAmount', 'convertedAmount'].forEach(field => {
            const value = field === 'amount' ? amount : options?.[field];
            if (typeof value === 'number' && value > decimal15_6_limit) {
                potentialOverflows.push(\`\${field}: \${value} > \${decimal15_6_limit}\`);
            }
        });
        
        // DECIMAL(15,8) fields  
        const decimal15_8_limit = 9999999.99999999;
        if (options?.exchangeRate && options.exchangeRate > decimal15_8_limit) {
            potentialOverflows.push(\`exchangeRate: \${options.exchangeRate} > \${decimal15_8_limit}\`);
        }
        
        // DECIMAL(5,4) fields
        const decimal5_4_limit = 9.9999;
        if (options?.exchangeFees && options.exchangeFees > decimal5_4_limit) {
            potentialOverflows.push(\`exchangeFees: \${options.exchangeFees} > \${decimal5_4_limit}\`);
        }
        
        if (potentialOverflows.length > 0) {
            console.log('🚨 POTENTIAL OVERFLOW DETECTED:');
            potentialOverflows.forEach(overflow => console.log('  -', overflow));
        } else {
            console.log('✅ All values appear to be within database limits');
        }
        
        // Call original method and monitor result
        try {
            const result = await originalCreate.apply(this, args);
            console.log('🎉 Service call completed:', result);
            return result;
        } catch (error) {
            console.log('💥 Service call failed:', error);
            throw error;
        }
    };
    
    console.log('✅ Fund movement debugging enabled - now try creating a fund movement');
})();

debugFundMovement;
    `);
}

// Simulate the issue based on current form calculations
function simulateCurrentFormBehavior() {
    console.log('\n🧮 Simulating current form calculation behavior...\n');
    
    // Test case that might reproduce the issue
    const testScenario = {
        originalAmount: 13000,
        exchangeRate: 0.710347,
        calculationType: 'current form logic'
    };
    
    console.log('Input values:', testScenario);
    
    // Current form calculation (from FundMovementForm.tsx lines 192-216)
    const originalAmount = testScenario.originalAmount;
    const exchangeRate = testScenario.exchangeRate;
    
    // Calculate real rate (user rate ÷ 0.99)
    const realRate = exchangeRate / 0.99;
    console.log('Real rate (exchangeRate / 0.99):', realRate);
    
    // Calculate converted amount using user-provided rate
    const convertedAmount = originalAmount * exchangeRate;
    console.log('Converted amount (originalAmount * exchangeRate):', convertedAmount);
    
    // Calculate fee: (originalAmount × realRate) - convertedAmount
    const feeAmount = (originalAmount * realRate) - convertedAmount;
    console.log('Fee amount ((originalAmount * realRate) - convertedAmount):', feeAmount);
    
    // Calculate fee percentage: (feeAmount / originalAmount) * 100
    const feePercentage = originalAmount > 0 ? (feeAmount / originalAmount) * 100 : 0;
    console.log('Fee percentage ((feeAmount / originalAmount) * 100):', feePercentage);
    
    // Apply constraints as in current form
    const validConvertedAmount = Math.max(0, convertedAmount);
    const validFeePercentage = Math.min(Math.max(0, feePercentage), 9.9999);
    const maxAmount = 999999999.999999;
    const finalConvertedAmount = Math.min(validConvertedAmount, maxAmount);
    
    console.log('\n=== FINAL CALCULATED VALUES ===');
    console.log('Final converted amount:', finalConvertedAmount);
    console.log('Final fee percentage:', validFeePercentage);
    console.log('Amount (set to converted amount):', finalConvertedAmount);
    
    // Check for constraint violations
    const violations = [];
    
    if (finalConvertedAmount > 999999999.999999) {
        violations.push(\`amount/convertedAmount (\${finalConvertedAmount}) > 999999999.999999\`);
    }
    
    if (realRate > 9999999.99999999) {
        violations.push(\`realRate (\${realRate}) > 9999999.99999999\`);
    }
    
    if (validFeePercentage > 9.9999) {
        violations.push(\`exchangeFees (\${validFeePercentage}) > 9.9999\`);
    }
    
    if (violations.length > 0) {
        console.log('\n❌ CONSTRAINT VIOLATIONS:');
        violations.forEach(v => console.log('  -', v));
    } else {
        console.log('\n✅ All constraints satisfied with current form logic');
    }
    
    return {
        originalAmount,
        exchangeRate,
        convertedAmount: finalConvertedAmount,
        exchangeFees: validFeePercentage,
        amount: finalConvertedAmount
    };
}

// Test edge cases that might trigger overflow
function testEdgeCases() {
    console.log('\n🔬 Testing edge cases that might trigger overflow...\n');
    
    const edgeCases = [
        {
            name: 'Large conversion amount',
            originalAmount: 500000,
            exchangeRate: 0.710347
        },
        {
            name: 'Very high precision exchange rate',
            originalAmount: 10000,
            exchangeRate: 0.12345678901234567890
        },
        {
            name: 'Near-maximum amount',
            originalAmount: 999999999,
            exchangeRate: 0.710347
        },
        {
            name: 'Maximum precision case',
            originalAmount: 999999.999999,
            exchangeRate: 0.99999999
        }
    ];
    
    edgeCases.forEach(testCase => {
        console.log(\`\\n--- Testing: \${testCase.name} ---\`);
        console.log('Input:', testCase);
        
        const originalAmount = testCase.originalAmount;
        const exchangeRate = testCase.exchangeRate;
        
        // Same calculation as form
        const realRate = exchangeRate / 0.99;
        const convertedAmount = originalAmount * exchangeRate;
        const feeAmount = (originalAmount * realRate) - convertedAmount;
        const feePercentage = (feeAmount / originalAmount) * 100;
        
        console.log('Calculated values:');
        console.log('  realRate:', realRate);
        console.log('  convertedAmount:', convertedAmount);
        console.log('  feeAmount:', feeAmount);
        console.log('  feePercentage:', feePercentage);
        
        // Check for issues
        const issues = [];
        
        if (convertedAmount > 999999999.999999) issues.push('convertedAmount overflow');
        if (realRate > 9999999.99999999) issues.push('realRate overflow');
        if (feePercentage > 9.9999) issues.push('feePercentage overflow');
        if (isNaN(convertedAmount)) issues.push('convertedAmount is NaN');
        if (isNaN(feePercentage)) issues.push('feePercentage is NaN');
        if (!isFinite(convertedAmount)) issues.push('convertedAmount is not finite');
        if (!isFinite(feePercentage)) issues.push('feePercentage is not finite');
        
        if (issues.length > 0) {
            console.log('⚠️  Issues found:', issues.join(', '));
        } else {
            console.log('✅ No issues detected');
        }
    });
}

// Main execution
console.log('🚀 FUND MOVEMENT OVERFLOW DEBUGGING SCRIPT');
console.log('=========================================\\n');

startDebugging();
const simulationResult = simulateCurrentFormBehavior();
testEdgeCases();

console.log('\n📋 DEBUGGING SUMMARY:');
console.log('1. Copy the browser console script above and paste it in the application');
console.log('2. Try creating a fund movement to see the exact values being sent');
console.log('3. Look for overflow warnings in the console');
console.log('4. The current form logic appears to be working correctly with constraints');
console.log('5. The issue might be elsewhere - possibly in data serialization or RLS policies');

export { simulateCurrentFormBehavior, testEdgeCases };
