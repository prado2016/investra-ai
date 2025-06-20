#!/usr/bin/env node

/**
 * Verify Configuration Tables Deployment
 * Check if all configuration tables were created successfully
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ecbuwphipphdsrqjwgfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'
);

async function checkConfigurationTables() {
  console.log('🔍 Verifying Configuration Tables Deployment...\n');
  
  const tables = [
    'system_configurations',
    'configuration_templates', 
    'configuration_history',
    'configuration_cache'
  ];
  
  let allWorking = true;
  let workingCount = 0;
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allWorking = false;
      } else {
        console.log(`✅ ${table}: Working (${count || 0} records)`);
        workingCount++;
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      allWorking = false;
    }
  }
  
  console.log(`\n📊 Configuration Tables Status: ${workingCount}/${tables.length} working`);
  
  if (allWorking) {
    console.log('🎉 All configuration tables deployed successfully!');
    console.log('\n🎯 Next Step: Test the production server endpoint');
    console.log('   curl -X GET "http://lab@10.0.0.89:3001/api/manual-review/stats"');
  } else {
    console.log('❌ Some configuration tables failed to deploy');
  }
  
  return allWorking;
}

checkConfigurationTables().catch(console.error);
