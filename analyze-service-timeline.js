/**
 * Analyze what happened to the email-puller service this morning
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function analyzeServiceTimeline() {
  console.log('🕐 Analyzing email-puller service timeline...');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // Get all sync requests from the last 24 hours
    console.log('📊 Checking sync requests from last 24 hours...');
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: syncRequests, error: syncError } = await supabase
      .from('sync_requests')
      .select('*')
      .eq('user_id', '1845c30a-4f89-49bb-aeb9-bc292752e07a')
      .gte('requested_at', yesterday)
      .order('requested_at', { ascending: true });

    if (syncError) {
      console.error('❌ Failed to get sync requests:', syncError);
      return;
    }

    console.log(`📋 Found ${syncRequests?.length || 0} sync requests in last 24 hours:`);
    
    let lastSuccessTime = null;
    let firstFailureTime = null;
    let recoveryTime = null;
    
    syncRequests?.forEach((req, index) => {
      const requestTime = new Date(req.requested_at);
      const processTime = req.processed_at ? new Date(req.processed_at) : null;
      const timeSinceRequest = processTime ? 
        Math.round((processTime.getTime() - requestTime.getTime()) / 1000) : 'N/A';
      
      console.log(`\n  ${index + 1}. ${requestTime.toLocaleString()}`);
      console.log(`     Type: ${req.request_type}`);
      console.log(`     Status: ${req.status}`);
      console.log(`     Processing time: ${timeSinceRequest} seconds`);
      
      if (req.result) {
        const emailsProcessed = req.result.emailsProcessed || 0;
        console.log(`     Emails processed: ${emailsProcessed}`);
      }
      
      if (req.status === 'completed' && processTime) {
        lastSuccessTime = processTime;
        if (firstFailureTime && !recoveryTime) {
          recoveryTime = processTime;
        }
      } else if (req.status === 'pending' && !firstFailureTime) {
        firstFailureTime = requestTime;
      }
    });

    // Check IMAP configuration sync history
    console.log('\n📊 Checking IMAP configuration sync history...');
    
    const { data: imapConfigs, error: imapError } = await supabase
      .from('imap_configurations')
      .select('*')
      .eq('user_id', '1845c30a-4f89-49bb-aeb9-bc292752e07a')
      .eq('is_active', true);

    if (!imapError && imapConfigs) {
      imapConfigs.forEach((config, index) => {
        console.log(`\n  ${index + 1}. ${config.name} (${config.gmail_email})`);
        console.log(`     Last sync: ${config.last_sync_at || 'Never'}`);
        console.log(`     Status: ${config.sync_status}`);
        console.log(`     Total emails synced: ${config.emails_synced}`);
        console.log(`     Last error: ${config.last_error || 'None'}`);
        
        if (config.last_sync_at) {
          const lastSync = new Date(config.last_sync_at);
          const hoursAgo = Math.round((Date.now() - lastSync.getTime()) / (1000 * 60 * 60));
          console.log(`     Time since last sync: ${hoursAgo} hours ago`);
        }
      });
    }

    // Analyze the pattern
    console.log('\n🔍 TIMELINE ANALYSIS:');
    
    if (lastSuccessTime) {
      const hoursAgo = Math.round((Date.now() - lastSuccessTime.getTime()) / (1000 * 60 * 60));
      console.log(`✅ Last successful sync: ${lastSuccessTime.toLocaleString()} (${hoursAgo} hours ago)`);
    }
    
    if (firstFailureTime && recoveryTime) {
      const downtime = Math.round((recoveryTime.getTime() - firstFailureTime.getTime()) / (1000 * 60));
      console.log(`❌ Service issues started: ${firstFailureTime.toLocaleString()}`);
      console.log(`✅ Service recovered: ${recoveryTime.toLocaleString()}`);
      console.log(`⏱️  Total downtime: ${downtime} minutes`);
      
      if (downtime > 60) {
        console.log('🚨 SIGNIFICANT DOWNTIME DETECTED');
        console.log('💡 Possible causes:');
        console.log('   - Service crashed and auto-restarted');
        console.log('   - Gmail API rate limiting');
        console.log('   - Network connectivity issues');
        console.log('   - Database connection problems');
      }
    }

    // Check if there's a pattern of recent issues
    const recentRequests = syncRequests?.filter(req => {
      const requestTime = new Date(req.requested_at);
      const hoursAgo = (Date.now() - requestTime.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 12; // Last 12 hours
    });

    const pendingCount = recentRequests?.filter(req => req.status === 'pending').length || 0;
    const completedCount = recentRequests?.filter(req => req.status === 'completed').length || 0;
    
    console.log(`\n📊 Last 12 hours summary:`);
    console.log(`   Completed: ${completedCount}`);
    console.log(`   Pending: ${pendingCount}`);
    
    if (pendingCount > 0) {
      console.log('⚠️  Still have pending requests - service may still be unstable');
    } else if (completedCount > 0) {
      console.log('✅ All recent requests completed - service appears stable now');
    }

  } catch (error) {
    console.error('💥 Analysis failed:', error);
  }
}

analyzeServiceTimeline()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });