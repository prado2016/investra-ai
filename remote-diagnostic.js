/**
 * Remote diagnostic script to check email-puller service on production server
 * Connects via SSH to lab@10.0.0.89 and runs comprehensive diagnostics
 * 
 * Usage: node remote-diagnostic.js
 */

import { execSync } from 'child_process';

async function runRemoteDiagnostic() {
  console.log('🔍 Remote Email-Puller Service Diagnostic');
  console.log('=========================================');
  console.log('📡 Connecting to lab@10.0.0.89...\n');

  const sshBase = 'ssh lab@10.0.0.89';
  
  try {
    // 1. Check if email-puller service is running
    console.log('1️⃣ Checking PM2 service status...');
    try {
      const pm2Status = execSync(`${sshBase} "pm2 list"`, { encoding: 'utf8', timeout: 10000 });
      console.log(pm2Status);
      
      // Look for email-puller specifically
      const emailPullerStatus = execSync(`${sshBase} "pm2 info investra-email-puller"`, { encoding: 'utf8', timeout: 10000 });
      console.log('📊 Email-puller specific status:');
      console.log(emailPullerStatus);
    } catch (error) {
      console.error('❌ PM2 status check failed:', error.message);
    }

    // 2. Check email-puller logs
    console.log('\n2️⃣ Checking email-puller logs (last 30 lines)...');
    try {
      const logs = execSync(`${sshBase} "pm2 logs investra-email-puller --lines 30 --nostream"`, { encoding: 'utf8', timeout: 15000 });
      console.log(logs);
    } catch (error) {
      console.error('❌ Log check failed:', error.message);
    }

    // 3. Check email-puller directory and files
    console.log('\n3️⃣ Checking email-puller deployment directory...');
    try {
      const dirCheck = execSync(`${sshBase} "ls -la /opt/investra/email-puller/"`, { encoding: 'utf8', timeout: 5000 });
      console.log('📁 Email-puller directory contents:');
      console.log(dirCheck);
      
      // Check if .env file exists and when it was created
      const envCheck = execSync(`${sshBase} "ls -la /opt/investra/email-puller/.env && echo '--- .env content (first 10 lines) ---' && head -10 /opt/investra/email-puller/.env"`, { encoding: 'utf8', timeout: 5000 });
      console.log('📄 .env file status and content:');
      console.log(envCheck);
    } catch (error) {
      console.error('❌ Directory check failed:', error.message);
    }

    // 4. Check system resources and performance
    console.log('\n4️⃣ Checking system resources...');
    try {
      const sysInfo = execSync(`${sshBase} "echo '=== CPU and Memory ===' && top -bn1 | head -15 && echo && echo '=== Disk Usage ===' && df -h && echo && echo '=== Network Connections ===' && netstat -tuln | grep :993"`, { encoding: 'utf8', timeout: 10000 });
      console.log(sysInfo);
    } catch (error) {
      console.error('❌ System info check failed:', error.message);
    }

    // 5. Check if email-puller can connect to database
    console.log('\n5️⃣ Testing database connectivity from server...');
    try {
      const dbTest = execSync(`${sshBase} "cd /opt/investra/email-puller && node -e \\"
        const { createClient } = require('@supabase/supabase-js');
        const fs = require('fs');
        
        try {
          // Read .env file
          const envContent = fs.readFileSync('.env', 'utf8');
          const envLines = envContent.split('\\\\n');
          const env = {};
          envLines.forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) env[key.trim()] = value.trim();
          });
          
          console.log('📡 Testing Supabase connection...');
          console.log('SUPABASE_URL:', env.SUPABASE_URL ? 'SET' : 'MISSING');
          console.log('SUPABASE_ANON_KEY:', env.SUPABASE_ANON_KEY ? 'SET (length: ' + env.SUPABASE_ANON_KEY.length + ')' : 'MISSING');
          
          if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
            const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
            client.from('system_config').select('config_key').limit(1)
              .then(result => {
                if (result.error) {
                  console.log('❌ Database connection failed:', result.error.message);
                } else {
                  console.log('✅ Database connection successful');
                }
              })
              .catch(err => console.log('❌ Database test error:', err.message));
          }
        } catch (fileError) {
          console.log('❌ Failed to read .env file:', fileError.message);
        }
        \\""`, { encoding: 'utf8', timeout: 15000 });
      console.log(dbTest);
    } catch (error) {
      console.error('❌ Database connectivity test failed:', error.message);
    }

    // 6. Check recent email-puller process activity
    console.log('\n6️⃣ Checking recent email-puller process activity...');
    try {
      const processCheck = execSync(`${sshBase} "ps aux | grep -E '(imap|email)' | grep -v grep && echo && echo '=== Email-puller process details ===' && ps -ef | grep investra-email-puller | grep -v grep"`, { encoding: 'utf8', timeout: 5000 });
      console.log(processCheck);
    } catch (error) {
      console.error('❌ Process check failed:', error.message);
    }

    // 7. Check system journals for email-puller errors
    console.log('\n7️⃣ Checking system journals for recent errors...');
    try {
      const journalCheck = execSync(`${sshBase} "journalctl --since '4 hours ago' | grep -i -E '(email|imap|supabase|error|fail)' | tail -15"`, { encoding: 'utf8', timeout: 10000 });
      console.log('📋 Recent system journal entries:');
      console.log(journalCheck || 'No relevant journal entries found');
    } catch (error) {
      console.error('❌ Journal check failed:', error.message);
    }

    // 8. Check service restart history
    console.log('\n8️⃣ Checking service restart patterns...');
    try {
      const restartHistory = execSync(`${sshBase} "pm2 describe investra-email-puller | grep -E '(restart|uptime|status)'"`, { encoding: 'utf8', timeout: 5000 });
      console.log('📊 Service restart info:');
      console.log(restartHistory);
    } catch (error) {
      console.error('❌ Restart history check failed:', error.message);
    }

    // 9. Quick health summary
    console.log('\n9️⃣ Quick health summary...');
    try {
      const healthCheck = execSync(`${sshBase} "echo 'Service Status:' && pm2 list | grep investra-email-puller && echo && echo 'Disk Space:' && df -h | grep -E '(Filesystem|/opt|/$)' && echo && echo 'Memory Usage:' && free -h"`, { encoding: 'utf8', timeout: 8000 });
      console.log(healthCheck);
    } catch (error) {
      console.error('❌ Health summary failed:', error.message);
    }

    console.log('\n✅ Remote diagnostic completed');
    console.log('\n📋 SUMMARY RECOMMENDATIONS:');
    console.log('1. Check PM2 status - service should be "online"');
    console.log('2. Review logs for any errors or timeouts');
    console.log('3. Verify .env file has correct database credentials');
    console.log('4. Monitor system resources for bottlenecks');
    console.log('5. Test database connectivity from server');
    console.log('6. Check for any network connectivity issues');
    console.log('7. Monitor restart count - high restarts indicate instability');

  } catch (error) {
    console.error('💥 Remote diagnostic failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Ensure SSH access to lab@10.0.0.89 is working');
    console.log('2. Check if SSH key is properly configured');
    console.log('3. Verify the server is accessible on the network');
    console.log('4. Make sure you have the correct user permissions');
  }
}

// Run the diagnostic
runRemoteDiagnostic()
  .then(() => {
    console.log('\n🎉 Diagnostic script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Diagnostic script failed:', error);
    process.exit(1);
  });