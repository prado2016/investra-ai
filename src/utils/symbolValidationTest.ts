import { EnhancedAISymbolParser } from '../services/ai/enhancedSymbolParser';
import { YahooFinanceValidator } from '../services/yahooFinanceValidator';

/**
 * Standalone symbol validation function for testing
 * This doesn't use React hooks and can be used to test the validation logic
 */
export async function validateSymbolStandalone(query: string): Promise<{
  isValid: boolean;
  parsedSymbol?: string;
  error?: string;
}> {
  if (!query.trim()) {
    return { isValid: false, error: 'Query cannot be empty' };
  }

  try {
    // First, try to parse the query using AI symbol parser
    console.log('Parsing query:', query);
    const parseResult = await EnhancedAISymbolParser.parseQuery(query.trim());
    console.log('Parse result:', parseResult);
    
    if (!parseResult.parsedSymbol) {
      return { 
        isValid: false, 
        error: 'Could not parse symbol from query' 
      };
    }

    // Then validate the parsed symbol with Yahoo Finance
    console.log('Validating symbol:', parseResult.parsedSymbol);
    const validationResult = await YahooFinanceValidator.validateSymbol(parseResult.parsedSymbol);
    console.log('Validation result:', validationResult);
    
    if (!validationResult.isValid) {
      return { 
        isValid: false, 
        parsedSymbol: parseResult.parsedSymbol,
        error: validationResult.error || 'Symbol validation failed' 
      };
    }

    return { 
      isValid: true, 
      parsedSymbol: parseResult.parsedSymbol 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
    console.error('Validation error:', err);
    return { 
      isValid: false, 
      error: errorMessage 
    };
  }
}

/**
 * Test the validation with our target query
 */
export async function testSOXLValidation(): Promise<void> {
  console.log('🧪 Testing SOXL Jun 6 $17 Call validation...');
  
  const result = await validateSymbolStandalone('SOXL Jun 6 $17 Call');
  
  console.log('📊 Test Result:', result);
  
  if (result.isValid) {
    console.log('✅ VALIDATION PASSED!');
    console.log(`🎯 Parsed Symbol: ${result.parsedSymbol}`);
  } else {
    console.log('❌ VALIDATION FAILED!');
    console.log(`💥 Error: ${result.error}`);
  }
}
