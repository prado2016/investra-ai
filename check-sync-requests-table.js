/**
 * Check if sync_requests table exists and its structure
 */

import { database } from './email-puller/dist/database.js';

async function checkSyncRequestsTable() {
  try {
    console.log('🔍 Checking sync_requests table...');
    console.log('========================================\n');

    // Test database connection first
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      return;
    }
    console.log('✅ Database connection verified\n');

    // Try to query the sync_requests table
    console.log('1️⃣ Checking if sync_requests table exists...');
    
    try {
      const { data, error } = await database['client']
        .from('sync_requests')
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log('❌ sync_requests table does NOT exist');
          console.log('   Error:', error.message);
          console.log('\n💡 The table needs to be created for manual sync to work!');
        } else {
          console.log('❌ Error querying sync_requests:', error.message);
        }
      } else {
        console.log('✅ sync_requests table exists');
        console.log('   Sample data:', data);
        
        // Check table structure
        console.log('\n2️⃣ Checking table structure...');
        const { error: infoError } = await database['client']
          .from('sync_requests')
          .select('*')
          .limit(0); // Get structure without data
          
        if (!infoError) {
          console.log('✅ Table structure accessible');
        }
        
        // Count total sync requests
        console.log('\n3️⃣ Counting sync requests...');
        const { count, error: countError } = await database['client']
          .from('sync_requests')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.log('❌ Error counting sync requests:', countError.message);
        } else {
          console.log(`✅ Total sync requests in database: ${count || 0}`);
        }
      }
    } catch (tableError) {
      console.log('❌ Exception checking sync_requests table:', tableError.message);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the check
checkSyncRequestsTable()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });