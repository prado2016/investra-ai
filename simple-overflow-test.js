const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTableAccess() {
    console.log('🔍 Testing fund_movements table access...\n');
    
    try {
        // Test basic table access
        const { data, error } = await supabase
            .from('fund_movements')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('❌ Table access error:', error.message);
            
            // Check if it's an authentication issue
            if (error.message.includes('JWT') || error.message.includes('auth') || error.message.includes('policy')) {
                console.log('🔐 This appears to be an authentication/RLS issue');
                console.log('💡 Try signing in to the application first');
                return;
            }
            
            // Check if table doesn't exist
            if (error.message.includes('does not exist')) {
                console.log('🚫 fund_movements table does not exist');
                console.log('💡 You may need to create the table first');
                return;
            }
        } else {
            console.log('✅ Table accessible');
            console.log('📊 Current records:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('📄 Sample record fields:', Object.keys(data[0]).join(', '));
            }
        }
        
        // Test a simple overflow scenario without authentication
        console.log('\n🧪 Testing overflow scenarios (may fail due to RLS)...');
        
        const testData = {
            portfolio_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            type: 'conversion',
            status: 'completed',
            movement_date: '2025-01-15',
            amount: 1000000000, // Over DECIMAL(15,6) limit of 999,999,999.999999
            currency: 'EUR',
            fees: 0,
            exchange_fees: 10, // Over DECIMAL(5,4) limit of 9.9999
            notes: 'Overflow test'
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('fund_movements')
            .insert(testData)
            .select();
        
        if (insertError) {
            console.log('📝 Insert error (expected):', insertError.message);
            
            if (insertError.message.includes('numeric field overflow') || 
                insertError.message.includes('value out of range') ||
                insertError.message.includes('overflow')) {
                console.log('🎯 CONFIRMED: This produces the numeric field overflow error!');
                console.log('🔍 The issue is with values exceeding DECIMAL constraints');
            }
        } else {
            console.log('⚠️ Unexpectedly succeeded:', insertData);
        }
        
    } catch (error) {
        console.error('💥 Exception:', error.message);
    }
}

// Test constraint validation functions
function testConstraintValidation() {
    console.log('\n🧮 Testing constraint validation logic...\n');
    
    const scenarios = [
        {
            name: 'Valid values',
            values: {
                amount: 999999.999999,
                exchange_rate: 1.85012345,
                exchange_fees: 2.5000
            }
        },
        {
            name: 'Just at limit',
            values: {
                amount: 999999999.999999, // Max DECIMAL(15,6)
                exchange_rate: 9999999.99999999, // Max DECIMAL(15,8)
                exchange_fees: 9.9999 // Max DECIMAL(5,4)
            }
        },
        {
            name: 'Over limit',
            values: {
                amount: 1000000000, // Over DECIMAL(15,6)
                exchange_rate: 10000000, // Over DECIMAL(15,8)
                exchange_fees: 10 // Over DECIMAL(5,4)
            }
        }
    ];
    
    const maxDecimal15_6 = 999999999.999999;
    const maxDecimal15_8 = 9999999.99999999;
    const maxDecimal5_4 = 9.9999;
    
    scenarios.forEach(scenario => {
        console.log(`--- ${scenario.name} ---`);
        console.log('Values:', scenario.values);
        
        const violations = [];
        
        if (scenario.values.amount > maxDecimal15_6) {
            violations.push(`amount (${scenario.values.amount}) > ${maxDecimal15_6}`);
        }
        
        if (scenario.values.exchange_rate > maxDecimal15_8) {
            violations.push(`exchange_rate (${scenario.values.exchange_rate}) > ${maxDecimal15_8}`);
        }
        
        if (scenario.values.exchange_fees > maxDecimal5_4) {
            violations.push(`exchange_fees (${scenario.values.exchange_fees}) > ${maxDecimal5_4}`);
        }
        
        if (violations.length > 0) {
            console.log('❌ Constraint violations:');
            violations.forEach(v => console.log(`   - ${v}`));
        } else {
            console.log('✅ All constraints satisfied');
        }
        console.log('');
    });
}

async function main() {
    console.log('🚀 Fund Movement Overflow Investigation\n');
    
    await testTableAccess();
    testConstraintValidation();
    
    console.log('\n📋 Summary:');
    console.log('- Check if the application form is sending values that exceed DECIMAL limits');
    console.log('- DECIMAL(15,6) max: 999,999,999.999999');
    console.log('- DECIMAL(15,8) max: 9,999,999.99999999');
    console.log('- DECIMAL(5,4) max: 9.9999');
    console.log('\n🏁 Investigation complete!');
}

main().catch(console.error);
