/**
 * Monitor sync requests in real-time to see what's happening
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function monitorSyncRequests() {
  console.log('👁️  Monitoring sync requests in real-time...');
  console.log('📱 Go trigger a manual sync in the UI now!');
  console.log('===============================================\n');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  let lastCount = 0;
  let monitoring = true;
  
  // Stop monitoring after 60 seconds
  setTimeout(() => {
    monitoring = false;
    console.log('\n⏰ Monitoring stopped after 60 seconds');
    process.exit(0);
  }, 60000);
  
  while (monitoring) {
    try {
      // Check recent sync requests
      const { data: requests, error } = await supabase
        .from('sync_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('❌ Error fetching requests:', error.message);
      } else {
        const currentCount = requests?.length || 0;
        
        if (currentCount !== lastCount || requests?.length > 0) {
          console.log(`📊 [${new Date().toLocaleTimeString()}] Found ${currentCount} recent requests:`);
          
          requests?.forEach((req, index) => {
            const timeAgo = Math.round((Date.now() - new Date(req.requested_at).getTime()) / 1000);
            console.log(`  ${index + 1}. ${req.request_type} - ${req.status} (${timeAgo}s ago)`);
            if (req.result) {
              console.log(`     Result: ${JSON.stringify(req.result).substring(0, 100)}...`);
            }
          });
          
          lastCount = currentCount;
          console.log('');
        }
      }
      
      // Check every 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('💥 Monitoring error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Run monitoring
monitorSyncRequests()
  .catch((error) => {
    console.error('💥 Monitor failed:', error);
    process.exit(1);
  });