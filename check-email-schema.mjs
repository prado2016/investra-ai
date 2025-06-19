#!/usr/bin/env node
/**
 * Check Email Configuration Table Schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
  console.log('🔍 Checking Email Configuration Table Schema...\n');
  
  try {
    // Try to get table info by selecting with a limit of 0
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Error accessing table:', error.message);
      return;
    }
    
    console.log('✅ Table accessible');
    
    // Try to insert with minimal data to see what fields are required
    const testInsert = {
      provider: 'test',
      host: 'test.com',
      port: 993,
      secure: true,
      username: 'test@test.com',
      password: 'test123'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('email_configurations')
      .insert([testInsert])
      .select();
      
    if (insertError) {
      console.log('📋 Schema analysis from insert error:');
      console.log('Error:', insertError.message);
      console.log('Code:', insertError.code);
      console.log('Details:', insertError.details);
      
      // Extract column information from error
      if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        console.log('\n💡 The error suggests column name mismatch');
      }
    } else {
      console.log('✅ Test insert successful');
      console.log('Data:', insertData);
      
      // Clean up
      if (insertData && insertData[0]?.id) {
        await supabase
          .from('email_configurations')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Test data cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkTableSchema();
