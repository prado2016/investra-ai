// Direct database inspection and fund movement testing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFundMovementsTable() {
    console.log('🔍 Inspecting fund_movements table structure...\n');
    
    try {
        // Get table structure from information_schema
        const { data: columns, error: columnsError } = await supabase
            .rpc('get_table_columns', { table_name: 'fund_movements' })
            .catch(async () => {
                // Fallback: try direct query to get column info
                return await supabase
                    .from('information_schema.columns')
                    .select('column_name, data_type, numeric_precision, numeric_scale')
                    .eq('table_name', 'fund_movements')
                    .eq('table_schema', 'public');
            });

        if (columnsError) {
            console.log('Could not get column info, trying alternative approach...');
            
            // Try to get a sample record to see field structure
            const { data: sample, error: sampleError } = await supabase
                .from('fund_movements')
                .select('*')
                .limit(1);
                
            if (sampleError) {
                console.error('❌ Table access error:', sampleError.message);
                return false;
            }
            
            console.log('✅ Fund movements table exists and is accessible');
            if (sample && sample.length > 0) {
                console.log('📄 Sample record structure:', Object.keys(sample[0]));
            } else {
                console.log('📄 Table is empty, no sample data available');
            }
        } else {
            console.log('✅ Column information retrieved:');
            console.table(columns);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error inspecting table:', error);
        return false;
    }
}

async function testFundMovementCreation() {
    console.log('\n🧪 Testing fund movement creation scenarios...\n');
    
    // First, get a valid portfolio_id
    console.log('📋 Getting available portfolios...');
    const { data: portfolios, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id, name')
        .limit(5);
    
    if (portfolioError) {
        console.error('❌ Could not fetch portfolios:', portfolioError.message);
        return;
    }
    
    if (!portfolios || portfolios.length === 0) {
        console.log('⚠️ No portfolios found. Creating a test portfolio...');
        
        const { data: newPortfolio, error: createError } = await supabase
            .from('portfolios')
            .insert({
                name: 'Test Portfolio for Fund Movements',
                description: 'Test portfolio for debugging overflow error',
                currency: 'USD'
            })
            .select()
            .single();
            
        if (createError) {
            console.error('❌ Could not create test portfolio:', createError.message);
            return;
        }
        
        portfolios.push(newPortfolio);
        console.log('✅ Created test portfolio:', newPortfolio.id);
    }
    
    const testPortfolioId = portfolios[0].id;
    console.log(`📋 Using portfolio: ${testPortfolioId} (${portfolios[0].name})`);
    
    // Test scenarios that might cause overflow
    const testScenarios = [
        {
            name: 'Normal Currency Conversion',
            data: {
                portfolio_id: testPortfolioId,
                type: 'conversion',
                status: 'completed',
                movement_date: '2025-01-15',
                amount: 1000.50,
                currency: 'EUR',
                fees: 25.75,
                original_amount: 1000.50,
                original_currency: 'USD',
                converted_amount: 850.43,
                converted_currency: 'EUR',
                exchange_rate: 0.8504,
                exchange_fees: 2.5750,
                notes: 'Test conversion - normal values'
            }
        },
        {
            name: 'Large Amount Conversion',
            data: {
                portfolio_id: testPortfolioId,
                type: 'conversion',
                status: 'completed',
                movement_date: '2025-01-15',
                amount: 500000.00,
                currency: 'EUR',
                fees: 1250.00,
                original_amount: 500000.00,
                original_currency: 'USD',
                converted_amount: 425200.00,
                converted_currency: 'EUR',
                exchange_rate: 0.8504,
                exchange_fees: 0.2500, // As percentage
                notes: 'Test conversion - large amount'
            }
        },
        {
            name: 'High Precision Values',
            data: {
                portfolio_id: testPortfolioId,
                type: 'conversion',
                status: 'completed',
                movement_date: '2025-01-15',
                amount: 12345.678901,
                currency: 'EUR',
                fees: 123.456789,
                original_amount: 12345.678901,
                original_currency: 'USD',
                converted_amount: 10500.123456,
                converted_currency: 'EUR',
                exchange_rate: 0.85041234,
                exchange_fees: 1.0000, // As percentage
                notes: 'Test conversion - high precision'
            }
        },
        {
            name: 'Maximum DECIMAL(15,6) Values',
            data: {
                portfolio_id: testPortfolioId,
                type: 'conversion',
                status: 'completed',
                movement_date: '2025-01-15',
                amount: 999999999.999999,
                currency: 'EUR',
                fees: 999999999.999999,
                original_amount: 999999999.999999,
                original_currency: 'USD',
                converted_amount: 999999999.999999,
                converted_currency: 'EUR',
                exchange_rate: 1.00000000, // DECIMAL(15,8) max
                exchange_fees: 9.9999, // DECIMAL(5,4) max
                notes: 'Test conversion - maximum values'
            }
        },
        {
            name: 'Just Over Limit (Should Fail)',
            data: {
                portfolio_id: testPortfolioId,
                type: 'conversion',
                status: 'completed',
                movement_date: '2025-01-15',
                amount: 1000000000, // Over DECIMAL(15,6) limit
                currency: 'EUR',
                fees: 1000000000, // Over DECIMAL(15,6) limit
                original_amount: 1000000000,
                original_currency: 'USD',
                converted_amount: 1000000000,
                converted_currency: 'EUR',
                exchange_rate: 10000000, // Over DECIMAL(15,8) limit
                exchange_fees: 10, // Over DECIMAL(5,4) limit
                notes: 'Test conversion - should cause overflow'
            }
        }
    ];
    
    for (const scenario of testScenarios) {
        console.log(`\n--- Testing: ${scenario.name} ---`);
        console.log('Data:', JSON.stringify(scenario.data, null, 2));
        
        try {
            const { data, error } = await supabase
                .from('fund_movements')
                .insert(scenario.data)
                .select()
                .single();
            
            if (error) {
                console.error(`❌ ${scenario.name} - Error:`, error.message);
                console.error('Error details:', error);
                
                // Check if this is a numeric overflow error
                if (error.message.includes('numeric field overflow') || 
                    error.message.includes('value out of range') ||
                    error.message.includes('overflow')) {
                    console.log('🎯 FOUND THE OVERFLOW ERROR!');
                    console.log('This scenario reproduces the issue');
                }
            } else {
                console.log(`✅ ${scenario.name} - Success:`, data.id);
                
                // Clean up: delete the test record
                await supabase
                    .from('fund_movements')
                    .delete()
                    .eq('id', data.id);
            }
        } catch (error) {
            console.error(`❌ ${scenario.name} - Exception:`, error);
        }
    }
}

async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
        console.error('❌ Auth error:', error.message);
        return null;
    }
    
    if (!user) {
        console.log('⚠️ No authenticated user found');
        return null;
    }
    
    console.log('✅ Authenticated user:', user.email);
    return user;
}

async function main() {
    console.log('🚀 Starting fund movement overflow investigation...\n');
    
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
        console.log('⚠️ Skipping database tests - no authenticated user');
        console.log('💡 Open the application in browser and sign in, then run this again');
        return;
    }
    
    // Inspect table structure
    const tableExists = await inspectFundMovementsTable();
    
    if (tableExists) {
        // Test fund movement creation
        await testFundMovementCreation();
    }
    
    console.log('\n🏁 Investigation complete!');
}

// Run the investigation
main().catch(error => {
    console.error('💥 Script failed:', error);
});

export { inspectFundMovementsTable, testFundMovementCreation };
