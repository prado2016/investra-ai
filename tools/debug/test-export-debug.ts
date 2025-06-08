// Test file to debug export issues
console.log('Testing exports...');

try {
  console.log('Testing useSymbolLookup imports...');
  
  // Test the main hook import
  import('./hooks/useSymbolLookup').then((module) => {
    console.log('useSymbolLookup module:', Object.keys(module));
    
    if (module.useSymbolValidation) {
      console.log('✅ useSymbolValidation found in exports');
    } else {
      console.log('❌ useSymbolValidation NOT found in exports');
      console.log('Available exports:', Object.keys(module));
    }
  }).catch((error) => {
    console.error('❌ Failed to import useSymbolLookup module:', error);
  });

  // Test the service imports
  import('./services/ai/enhancedSymbolParser').then((module) => {
    console.log('enhancedSymbolParser module:', Object.keys(module));
    
    if (module.EnhancedAISymbolParser) {
      console.log('✅ EnhancedAISymbolParser found');
    } else {
      console.log('❌ EnhancedAISymbolParser NOT found');
    }
  }).catch((error) => {
    console.error('❌ Failed to import enhancedSymbolParser:', error);
  });

  import('./services/yahooFinanceValidator').then((module) => {
    console.log('yahooFinanceValidator module:', Object.keys(module));
    
    if (module.YahooFinanceValidator) {
      console.log('✅ YahooFinanceValidator found');
    } else {
      console.log('❌ YahooFinanceValidator NOT found');
    }
  }).catch((error) => {
    console.error('❌ Failed to import yahooFinanceValidator:', error);
  });

} catch (error) {
  console.error('❌ Error during testing:', error);
}
