/**
 * Test Gemini AI Import
 * Quick test to verify what's available in the package
 */

import React from 'react';

const TestGeminiImport: React.FC = () => {
  React.useEffect(() => {
    // Test if we can import the basic functionality
    import('@google/generative-ai').then((module) => {
      console.log('Available exports:', Object.keys(module));
      console.log('GoogleGenerativeAI:', typeof module.GoogleGenerativeAI);
    }).catch((error) => {
      console.error('Import error:', error);
    });
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h3>Gemini AI Import Test</h3>
      <p>Check the console for available exports from @google/generative-ai</p>
    </div>
  );
};

export default TestGeminiImport;
