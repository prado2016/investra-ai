// Quick test to verify options parsing and validation
const { EnhancedAISymbolParser } = require('./src/services/ai/enhancedSymbolParser');
const { YahooFinanceValidator } = require('./src/services/yahooFinanceValidator');

async function testOptionsFlow() {
  console.log('🧪 Testing Options Parsing and Validation');
  console.log('=' .repeat(50));
  
  const testQuery = "SOXL Jun 6 $17 Cal";
  
  try {
    // Step 1: Parse the query
    console.log(`\n1. Parsing query: "${testQuery}"`);
    const parseResult = await EnhancedAISymbolParser.parseQuery(testQuery);
    console.log('Parse Result:', JSON.stringify(parseResult, null, 2));
    
    // Step 2: Validate the parsed symbol
    console.log(`\n2. Validating symbol: "${parseResult.parsedSymbol}"`);
    const validationResult = await YahooFinanceValidator.validateSymbolFormat(parseResult.parsedSymbol);
    console.log('Validation Result:', JSON.stringify(validationResult, null, 2));
    
    // Step 3: Summary
    console.log('\n🎯 Test Summary:');
    console.log(`✅ Query parsed as ${parseResult.type}: ${parseResult.parsedSymbol}`);
    console.log(`${validationResult.isValid ? '✅' : '❌'} Validation: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
    
    if (validationResult.error) {
      console.log(`❌ Error: ${validationResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOptionsFlow();
