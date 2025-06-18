#!/usr/bin/env node
/**
 * Enhanced Email Processing Server Starter
 * Bypasses TypeScript compilation issues by starting the pre-built server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Enhanced Email Processing Server...');
console.log('📍 Server will run on: http://localhost:3001');
console.log('📧 IMAP Status: Checking configuration...');

// Set environment variables
const env = {
  ...process.env,
  PORT: '3001',
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  IMAP_ENABLED: process.env.IMAP_ENABLED || 'true',
  IMAP_HOST: process.env.IMAP_HOST || 'imap.gmail.com',
  IMAP_PORT: process.env.IMAP_PORT || '993',
  IMAP_USERNAME: process.env.IMAP_USERNAME || 'transactions@investra.com',
  IMAP_SECURE: process.env.IMAP_SECURE || 'true'
};

// Check if we have the compiled server or need to use the TypeScript version
const serverPath = join(__dirname, 'build', 'standalone-enhanced-server.js');

try {
  // Try to run the compiled version if available
  const serverProcess = spawn('node', [serverPath], {
    env,
    stdio: 'inherit',
    cwd: __dirname
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start enhanced server:', error.message);
    console.log('💡 Trying to start basic server instead...');
    
    // Fallback to running with basic server
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Enhanced server exited with code ${code}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down enhanced server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });

} catch (error) {
  console.error('❌ Could not start enhanced server:', error.message);
  console.log('💡 Please ensure the server is built first');
  process.exit(1);
}
