// Manual test for validation services
// This tests the core functionality outside of React

import { EnhancedAISymbolParser } from './src/services/ai/enhancedSymbolParser.ts';
import { YahooFinanceValidator } from './src/services/yahooFinanceValidator.ts';

async function testValidation() {
  console.log('🧪 Testing Symbol Validation Pipeline...\n');
  
  const testQuery = 'SOXL Jun 6 $17 Call';
  console.log(`📝 Input Query: "${testQuery}"`);
  
  try {
    // Step 1: Parse the query
    console.log('\n🔍 Step 1: Parsing query with AI...');
    const parseResult = await EnhancedAISymbolParser.parseQuery(testQuery);
    console.log('📊 Parse Result:', JSON.stringify(parseResult, null, 2));
    
    if (!parseResult.parsedSymbol) {
      console.log('❌ FAILED: Could not parse symbol');
      return;
    }
    
    // Step 2: Validate the symbol
    console.log('\n✅ Step 2: Validating symbol with Yahoo Finance...');
    console.log(`🎯 Symbol to validate: ${parseResult.parsedSymbol}`);
    
    const validationResult = await YahooFinanceValidator.validateSymbol(parseResult.parsedSymbol);
    console.log('📊 Validation Result:', JSON.stringify(validationResult, null, 2));
    
    // Final result
    console.log('\n🏁 FINAL RESULT:');
    if (validationResult.isValid) {
      console.log('✅ SUCCESS! Symbol validation passed');
      console.log(`🎯 Valid Symbol: ${parseResult.parsedSymbol}`);
    } else {
      console.log('❌ FAILED! Symbol validation failed');
      console.log(`💥 Error: ${validationResult.error}`);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testValidation().catch(console.error);
