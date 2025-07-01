/**
 * Check the specific sync request that was just created in the UI
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function checkSpecificSyncRequest() {
  console.log('🔍 Checking the specific sync request from UI: d84df2b9-5c14-4b98-a734-8bc21ba44de0');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    const { data, error } = await supabase
      .from('sync_requests')
      .select('*')
      .eq('id', 'd84df2b9-5c14-4b98-a734-8bc21ba44de0')
      .single();

    if (error) {
      console.error('❌ Failed to find sync request:', error);
      return;
    }

    console.log('📋 Sync request details:');
    console.log(`  ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Requested: ${data.requested_at}`);
    console.log(`  Processed: ${data.processed_at || 'NOT PROCESSED'}`);
    console.log(`  Result: ${data.result ? JSON.stringify(data.result) : 'NO RESULT'}`);
    
    const minutesAgo = Math.round((Date.now() - new Date(data.requested_at).getTime()) / 60000);
    console.log(`  Time since request: ${minutesAgo} minutes ago`);
    
    if (data.status === 'pending' && minutesAgo > 5) {
      console.log('🚨 ISSUE: Request has been pending for over 5 minutes');
      console.log('🔧 This indicates the email-puller service is not processing requests');
    }

    // Check all recent pending requests
    console.log('\n🔍 Checking all recent pending requests...');
    
    const { data: allPending, error: pendingError } = await supabase
      .from('sync_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(10);

    if (pendingError) {
      console.error('❌ Failed to get pending requests:', pendingError);
    } else {
      console.log(`📊 Found ${allPending.length} pending requests:`);
      allPending.forEach((req, index) => {
        const mins = Math.round((Date.now() - new Date(req.requested_at).getTime()) / 60000);
        console.log(`  ${index + 1}. ${req.request_type} - ${mins} minutes ago`);
      });
      
      if (allPending.length > 0) {
        const oldestPending = allPending[allPending.length - 1];
        const oldestMins = Math.round((Date.now() - new Date(oldestPending.requested_at).getTime()) / 60000);
        console.log(`\n🚨 Oldest pending request: ${oldestMins} minutes ago`);
        
        if (oldestMins > 10) {
          console.log('💥 EMAIL-PULLER SERVICE IS DEFINITELY NOT WORKING');
          console.log('🔧 Service needs to be restarted or has configuration issues');
        }
      }
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkSpecificSyncRequest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });