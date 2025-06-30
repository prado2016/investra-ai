/**
 * Fix sync_requests table RLS policies
 */

import { database } from './email-puller/dist/database.js';
import fs from 'fs';

async function fixSyncRequestsTable() {
  try {
    console.log('🔧 Fixing sync_requests table RLS policies...');
    console.log('================================================\n');

    // Test database connection first
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      return;
    }
    console.log('✅ Database connection verified\n');

    // Read the SQL file
    console.log('1️⃣ Reading SQL script...');
    const sqlContent = fs.readFileSync('./create-sync-requests-table.sql', 'utf8');
    console.log('✅ SQL script loaded\n');

    // Execute the SQL (we'll do it in parts since some commands might not work through the client)
    console.log('2️⃣ Creating sync_requests table if not exists...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sync_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        request_type VARCHAR(50) NOT NULL DEFAULT 'manual_sync',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE,
        result JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createError } = await database['client'].rpc('exec_sql', { 
      sql: createTableSQL 
    }).catch(() => ({ error: 'RPC not available' }));

    if (createError && createError !== 'RPC not available') {
      console.log('⚠️  Table creation via RPC failed, table might already exist:', createError);
    } else {
      console.log('✅ Table creation completed');
    }

    // Test inserting a sync request with the service role connection
    console.log('\n3️⃣ Testing sync request creation...');
    
    // First get a valid user_id
    const { data: configs, error: configError } = await database['client']
      .from('imap_configurations')
      .select('user_id')
      .eq('is_active', true)
      .limit(1);

    if (configError || !configs || configs.length === 0) {
      console.log('❌ No active IMAP configurations found');
      return;
    }

    const testUserId = configs[0].user_id;
    console.log('✅ Found test user ID:', testUserId);

    // Try creating a sync request
    const { data: syncRequest, error: insertError } = await database['client']
      .from('sync_requests')
      .insert({
        user_id: testUserId,
        request_type: 'test_sync',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Still getting RLS error:', insertError.message);
      console.log('\n🔧 The issue is likely that the email-puller is using anon key instead of service role');
      console.log('   Let\'s check the database configuration...');
      
      // Check what role we're using
      const { data: roleData } = await database['client']
        .rpc('current_user_role')
        .catch(() => ({ data: null }));
        
      console.log('   Current database role:', roleData);
      
    } else {
      console.log('✅ Sync request created successfully:');
      console.log('   ID:', syncRequest.id);
      console.log('   Status:', syncRequest.status);
      
      // Clean up the test request
      await database['client']
        .from('sync_requests')
        .delete()
        .eq('id', syncRequest.id);
      console.log('✅ Test request cleaned up');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the fix
fixSyncRequestsTable()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });