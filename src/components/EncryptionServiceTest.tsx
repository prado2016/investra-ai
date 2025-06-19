/**
 * Encryption Service Test Component
 * React component to test encryption service in the browser
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { EncryptionService } from '../services/security/encryptionService';
import { testEncryptionService } from '../services/security/encryptionService.browser-test';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const TestContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const TestSection = styled.div`
  margin-bottom: 2rem;
`;

const TestResult = styled.div<{ $success?: boolean }>`
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  background-color: ${props => props.$success ? '#dcfce7' : '#fef2f2'};
  border: 1px solid ${props => props.$success ? '#16a34a' : '#dc2626'};
  color: ${props => props.$success ? '#15803d' : '#dc2626'};
  font-family: monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-all;

  [data-theme="dark"] & {
    background-color: ${props => props.$success ? '#14532d' : '#7f1d1d'};
    color: ${props => props.$success ? '#22c55e' : '#ef4444'};
  }
`;

const InputGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  [data-theme="dark"] & {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 1rem 0;
`;

const LogOutput = styled.div`
  background-color: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.875rem;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  margin-top: 1rem;
`;

interface TestState {
  userId: string;
  plainText: string;
  encryptedData: string;
  decryptedData: string;
  isLoading: boolean;
  error: string | null;
  logs: string[];
}

const EncryptionServiceTest: React.FC = () => {
  const [state, setState] = useState<TestState>({
    userId: 'test-user-123',
    plainText: 'Hello, this is sensitive data!',
    encryptedData: '',
    decryptedData: '',
    isLoading: false,
    error: null,
    logs: []
  });

  const addLog = (message: string) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${message}`]
    }));
  };

  const clearLogs = () => {
    setState(prev => ({ ...prev, logs: [] }));
  };

  const handleEncrypt = async () => {
    if (!state.plainText || !state.userId) {
      setState(prev => ({ ...prev, error: 'Please provide both user ID and plain text' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting encryption...');

    try {
      const result = await EncryptionService.encryptValue(state.plainText, state.userId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          encryptedData: result.encryptedData,
          isLoading: false
        }));
        addLog('✅ Encryption successful');
        addLog(`Encrypted data length: ${result.encryptedData.length} characters`);
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Encryption failed',
          isLoading: false
        }));
        addLog(`❌ Encryption failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      addLog(`❌ Encryption error: ${errorMessage}`);
    }
  };

  const handleDecrypt = async () => {
    if (!state.encryptedData || !state.userId) {
      setState(prev => ({ ...prev, error: 'Please provide both user ID and encrypted data' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting decryption...');

    try {
      const result = await EncryptionService.decryptValue(state.encryptedData, state.userId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          decryptedData: result.decryptedData,
          isLoading: false
        }));
        addLog('✅ Decryption successful');
        addLog(`Decrypted data matches original: ${result.decryptedData === state.plainText}`);
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Decryption failed',
          isLoading: false
        }));
        addLog(`❌ Decryption failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      addLog(`❌ Decryption error: ${errorMessage}`);
    }
  };

  const handleRunAllTests = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Running comprehensive encryption service tests...');

    try {
      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        addLog(args.join(' '));
        originalLog(...args);
      };
      
      console.error = (...args) => {
        addLog(`ERROR: ${args.join(' ')}`);
        originalError(...args);
      };

      await testEncryptionService();

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      setState(prev => ({ ...prev, isLoading: false }));
      addLog('✅ All tests completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      addLog(`❌ Test suite error: ${errorMessage}`);
    }
  };

  const handleClear = () => {
    setState(prev => ({
      ...prev,
      encryptedData: '',
      decryptedData: '',
      error: null
    }));
    addLog('🧹 Cleared all data');
  };

  useEffect(() => {
    addLog('🔧 Encryption Service Test Component loaded');
    addLog(`Web Crypto API available: ${!!window.crypto?.subtle}`);
  }, []);

  return (
    <TestContainer>
      <h1>🔐 Encryption Service Browser Test</h1>
      <p>Test the encryption service directly in the React frontend environment.</p>

      <Card>
        <TestSection>
          <h2>Manual Testing</h2>
          
          <InputGroup>
            <Label htmlFor="userId">User ID:</Label>
            <Input
              id="userId"
              type="text"
              value={state.userId}
              onChange={(e) => setState(prev => ({ ...prev, userId: e.target.value }))}
              placeholder="Enter user ID for key derivation"
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="plainText">Plain Text to Encrypt:</Label>
            <Input
              id="plainText"
              type="text"
              value={state.plainText}
              onChange={(e) => setState(prev => ({ ...prev, plainText: e.target.value }))}
              placeholder="Enter text to encrypt"
            />
          </InputGroup>

          <ButtonGroup>
            <Button 
              onClick={handleEncrypt} 
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Encrypting...' : 'Encrypt'}
            </Button>
            
            <Button 
              onClick={handleDecrypt} 
              disabled={state.isLoading || !state.encryptedData}
            >
              {state.isLoading ? 'Decrypting...' : 'Decrypt'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClear}
            >
              Clear
            </Button>
          </ButtonGroup>

          {state.error && (
            <TestResult $success={false}>
              Error: {state.error}
            </TestResult>
          )}

          {state.encryptedData && (
            <div>
              <Label>Encrypted Data:</Label>
              <TestResult $success={true}>
                {state.encryptedData}
              </TestResult>
            </div>
          )}

          {state.decryptedData && (
            <div>
              <Label>Decrypted Data:</Label>
              <TestResult $success={state.decryptedData === state.plainText}>
                {state.decryptedData}
                {state.decryptedData === state.plainText && ' ✅ Matches original!'}
              </TestResult>
            </div>
          )}
        </TestSection>

        <TestSection>
          <h2>Automated Testing</h2>
          <p>Run the complete test suite to validate all encryption service functionality.</p>
          
          <ButtonGroup>
            <Button 
              onClick={handleRunAllTests} 
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearLogs}
            >
              Clear Logs
            </Button>
          </ButtonGroup>

          {state.logs.length > 0 && (
            <LogOutput>
              {state.logs.join('\n')}
            </LogOutput>
          )}
        </TestSection>
      </Card>
    </TestContainer>
  );
};

export default EncryptionServiceTest;
