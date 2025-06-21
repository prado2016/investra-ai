/**
 * Test script to verify imapflow types are working
 * This will help verify that the CI environment can find the type declarations
 */

/// <reference path="./src/types/imapflow.d.ts" />
import ImapFlow from 'imapflow';

// Simple test to verify the import works
const testImport = () => {
  console.log('ImapFlow import test successful');
  return typeof ImapFlow;
};

export { testImport };
