#!/usr/bin/env node

/**
 * Browser Log Viewer Diagnostic Script
 * Helps debug why the log viewer isn't capturing logs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Browser Log Viewer Diagnostic');
console.log('=================================');

// Check if browser log viewer exists and has cross-window communication
const logViewerPath = path.join(__dirname, 'public', 'browser-log-viewer.html');
console.log('\n1. Checking browser log viewer file...');

if (fs.existsSync(logViewerPath)) {
  const content = fs.readFileSync(logViewerPath, 'utf8');
  
  console.log('   ✅ browser-log-viewer.html exists');
  
  // Check for key features
  const hasBroadcastChannel = content.includes('BroadcastChannel');
  const hasLogEntry = content.includes('LOG_ENTRY');
  const hasReceiveExternalLog = content.includes('receiveExternalLog');
  const hasSetupCrossWindow = content.includes('setupCrossWindowCommunication');
  
  console.log(`   ${hasBroadcastChannel ? '✅' : '❌'} BroadcastChannel support: ${hasBroadcastChannel ? 'Found' : 'Missing'}`);
  console.log(`   ${hasLogEntry ? '✅' : '❌'} LOG_ENTRY handler: ${hasLogEntry ? 'Found' : 'Missing'}`);
  console.log(`   ${hasReceiveExternalLog ? '✅' : '❌'} receiveExternalLog method: ${hasReceiveExternalLog ? 'Found' : 'Missing'}`);
  console.log(`   ${hasSetupCrossWindow ? '✅' : '❌'} Cross-window setup: ${hasSetupCrossWindow ? 'Found' : 'Missing'}`);
  
} else {
  console.log('   ❌ browser-log-viewer.html not found');
}

// Check browser log integration
const integrationPath = path.join(__dirname, 'src', 'utils', 'browserLogIntegration.ts');
console.log('\n2. Checking browser log integration...');

if (fs.existsSync(integrationPath)) {
  const content = fs.readFileSync(integrationPath, 'utf8');
  
  console.log('   ✅ browserLogIntegration.ts exists');
  
  const hasBroadcastChannel = content.includes('BroadcastChannel');
  const hasIntegrateWithConsole = content.includes('integrateWithConsole');
  const hasPostToViewer = content.includes('postToViewer');
  const hasSendLogToViewer = content.includes('sendLogToViewer');
  
  console.log(`   ${hasBroadcastChannel ? '✅' : '❌'} BroadcastChannel support: ${hasBroadcastChannel ? 'Found' : 'Missing'}`);
  console.log(`   ${hasIntegrateWithConsole ? '✅' : '❌'} Console integration: ${hasIntegrateWithConsole ? 'Found' : 'Missing'}`);
  console.log(`   ${hasPostToViewer ? '✅' : '❌'} postToViewer method: ${hasPostToViewer ? 'Found' : 'Missing'}`);
  console.log(`   ${hasSendLogToViewer ? '✅' : '❌'} sendLogToViewer method: ${hasSendLogToViewer ? 'Found' : 'Missing'}`);
  
} else {
  console.log('   ❌ browserLogIntegration.ts not found');
}

// Check if integration is initialized in App.tsx
const appPath = path.join(__dirname, 'src', 'App.tsx');
console.log('\n3. Checking App.tsx integration...');

if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  
  const hasImport = content.includes('BrowserLogIntegration');
  const hasInitialization = content.includes('BrowserLogIntegration.getInstance()');
  
  console.log(`   ${hasImport ? '✅' : '❌'} BrowserLogIntegration import: ${hasImport ? 'Found' : 'Missing'}`);
  console.log(`   ${hasInitialization ? '✅' : '❌'} Initialization call: ${hasInitialization ? 'Found' : 'Missing'}`);
  
} else {
  console.log('   ❌ App.tsx not found');
}

console.log('\n📋 TROUBLESHOOTING STEPS:');
console.log('=========================');
console.log('');
console.log('1. 🌐 Open Main App:');
console.log('   - URL: http://localhost:5173/');
console.log('   - Open browser console (F12)');
console.log('   - Run: console.log("Test message from main app")');
console.log('');
console.log('2. 🔍 Open Browser Log Viewer:');
console.log('   - URL: http://localhost:5173/browser-log-viewer.html');
console.log('   - Check status indicator (should show "Connected")');
console.log('   - Look for test message from step 1');
console.log('');
console.log('3. 📡 Test Cross-Window Communication:');
console.log('   - In main app console, run:');
console.log('     const bc = new BroadcastChannel("investra-logs");');
console.log('     bc.postMessage({type: "LOG_ENTRY", data: {id: "test", timestamp: new Date(), level: "info", message: "Direct test", source: "Manual"}});');
console.log('');
console.log('4. 🔧 If Still Not Working:');
console.log('   - Check browser console for errors');
console.log('   - Verify BroadcastChannel is supported');
console.log('   - Try refreshing both windows');
console.log('   - Check if CORS/security is blocking communication');
console.log('');
console.log('🎯 Expected Result: Log viewer should capture and display logs from main app');
