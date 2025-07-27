#!/usr/bin/env node
/* eslint-env node */

/**
 * Direct Supabase query to check system_config table
 * This will show us exactly what's in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E';

async function checkSystemConfig() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking system_config table...\n');
  
  // Test 1: Check if we can access the table at all
  console.log('1. Testing table access...');
  try {
    const { data, error, count } = await supabase
      .from('system_config')
      .select('*', { count: 'exact' });
      
    if (error) {
      console.log('❌ Table access failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   This explains the 406 errors!\n');
      return;
    }
    
    console.log('✅ Table accessible');
    console.log('📊 Total rows:', count);
    console.log('📋 Current entries:');
    
    if (data && data.length > 0) {
      data.forEach(row => {
        const displayValue = row.is_encrypted ? '[ENCRYPTED]' : row.config_value;
        console.log(`   - ${row.config_key}: ${displayValue}`);
      });
    } else {
      console.log('   ⚠️ Table is empty');
    }
    console.log('');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
    return;
  }
  
  // Test 2: Try the specific query that's failing
  console.log('2. Testing openrouter_api_key query...');
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openrouter_api_key')
      .single();
      
    if (error) {
      console.log('❌ OpenRouter key query failed:', error.message);
      console.log('   Error code:', error.code);
      
      if (error.code === 'PGRST116') {
        console.log('   🔍 This means openrouter_api_key does not exist in the table');
        console.log('   💡 Solution: Add the API key to the table via Settings page');
      }
    } else {
      console.log('✅ OpenRouter key found:', data.config_value ? '[EXISTS]' : '[EMPTY]');
    }
    console.log('');
    
  } catch (err) {
    console.log('❌ Query error:', err.message);
  }
  
  // Test 3: Check what keys are expected vs what exists
  console.log('3. Expected vs Actual keys:');
  const expectedKeys = [
    'openrouter_api_key',
    'openrouter_model', 
    'gemini_api_key',
    'gemini_model',
    'email_encryption_key'
  ];
  
  for (const key of expectedKeys) {
    try {
      const { data: _data, error } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', key)
        .single();
        
      if (error && error.code === 'PGRST116') {
        console.log(`   ❌ ${key}: NOT FOUND`);
      } else if (error) {
        console.log(`   ⚠️ ${key}: ERROR - ${error.message}`);
      } else {
        console.log(`   ✅ ${key}: EXISTS`);
      }
    } catch (_err) {
      console.log(`   ❌ ${key}: QUERY FAILED`);
    }
  }
}

checkSystemConfig().catch(console.error);