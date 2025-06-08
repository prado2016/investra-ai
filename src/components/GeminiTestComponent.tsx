/**
 * Fixed Gemini AI Service Implementation
 * Temporary fix for import issues
 */

import React, { useState, useEffect } from 'react';

const GeminiTestComponent: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('Testing...');

  useEffect(() => {
    const testGeminiImport = async () => {
      try {
        // Dynamic import to test what's available
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        
        if (GoogleGenerativeAI) {
          setTestResult('✅ GoogleGenerativeAI imported successfully');
          
          // Test with a dummy API key to see if we can create the instance
          try {
            const genAI = new GoogleGenerativeAI('test-key');
            setTestResult('✅ GoogleGenerativeAI instance created successfully');
          } catch (error) {
            setTestResult(`⚠️ Instance creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          setTestResult('❌ GoogleGenerativeAI not found in import');
        }
      } catch (error) {
        setTestResult(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testGeminiImport();
  }, []);

  return (
    <div style={{ 
      padding: '1rem', 
      background: '#f0f9ff', 
      borderRadius: '8px',
      margin: '1rem 0'
    }}>
      <h3>Gemini AI Service Test</h3>
      <p>Status: {testResult}</p>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
        This test checks if the @google/generative-ai package is working correctly.
      </div>
    </div>
  );
};

export default GeminiTestComponent;
