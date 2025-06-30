/**
 * Script to update email-puller .env file with database-stored environment variables
 * This script runs during GitHub Actions deployment
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcoded Supabase credentials for initial connection
const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMzY4OTAsImV4cCI6MjA0MzcxMjg5MH0.4iQNsNUNcUIj7xPUEBEMECrNYSu64Ncd86ByUQiYeD4';

async function updateEmailPullerEnv() {
  console.log('🔄 Starting email-puller .env update process...');
  
  try {
    // Connect to Supabase
    console.log('📡 Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Load environment variables from database
    console.log('🗄️ Loading environment variables from database...');
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NODE_ENV']);

    if (error) {
      console.error('❌ Error loading environment variables:', error);
      throw error;
    }

    console.log('📊 Found environment variables:', data?.map(item => ({ 
      key: item.config_key, 
      hasValue: item.config_value ? '[SET]' : '[EMPTY]' 
    })));

    // Create .env content
    const envVars = {};
    data?.forEach(item => {
      envVars[item.config_key] = item.config_value;
    });

    // Use database values or fallback to hardcoded values
    const envContent = `# Email-puller environment variables (updated by GitHub Actions)
# Generated on: ${new Date().toISOString()}

# Essential Supabase configuration (required for database connection)
SUPABASE_URL=${envVars.SUPABASE_URL || SUPABASE_URL}
SUPABASE_ANON_KEY=${envVars.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY}

# Runtime environment
NODE_ENV=${envVars.NODE_ENV || 'production'}

# Note: All other configuration is loaded from the database via the UI
# IMAP settings, sync intervals, etc. are managed through the Settings page
`;

    // Define the .env file path (will be used during deployment)
    const envPath = process.env.EMAIL_PULLER_DEPLOY_DIR ? 
      path.join(process.env.EMAIL_PULLER_DEPLOY_DIR, '.env') : 
      '/opt/investra/email-puller/.env';

    console.log('📝 Writing .env file to:', envPath);
    console.log('📄 .env content:');
    console.log(envContent.replace(/SUPABASE_ANON_KEY=.*/g, 'SUPABASE_ANON_KEY=[HIDDEN]'));

    // Write the .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Email-puller .env file updated successfully!');
    console.log('🔄 The email-puller service should now be able to connect to the database');
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to update email-puller .env file:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  updateEmailPullerEnv()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateEmailPullerEnv };