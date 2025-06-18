#!/usr/bin/env node

/**
 * Quick Email Tables Status Check
 * This script checks what's already deployed and what needs to be fixed
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNycWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmailTablesStatus() {
  console.log('🔍 Checking email configuration tables status...\n')
  
  const tablesToCheck = [
    'email_configurations',
    'email_processing_logs', 
    'email_import_rules'
  ]
  
  let deployedTables = 0
  let accessibleTables = 0
  
  for (const tableName of tablesToCheck) {
    try {
      console.log(`📋 Checking table: ${tableName}`)
      
      // Try to query the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ Table does not exist`)
        } else if (error.message.includes('JWT') || error.message.includes('policy')) {
          console.log(`   ⚠️ Table exists but access denied (RLS/Auth issue)`)
          console.log(`   📝 Error: ${error.message}`)
          deployedTables++
        } else {
          console.log(`   ⚠️ Table error: ${error.message}`)
          deployedTables++
        }
      } else {
        console.log(`   ✅ Table exists and accessible`)
        console.log(`   📊 Sample records: ${data?.length || 0}`)
        deployedTables++
        accessibleTables++
      }
    } catch (error) {
      console.log(`   ❌ Query failed: ${error.message}`)
    }
    
    console.log('')
  }
  
  console.log('📊 SUMMARY:')
  console.log(`Tables deployed: ${deployedTables}/3`)
  console.log(`Tables accessible: ${accessibleTables}/3`)
  console.log('')
  
  if (deployedTables === 3) {
    console.log('🎉 All email configuration tables are deployed!')
    
    if (accessibleTables === 3) {
      console.log('✅ All tables are accessible - email configuration should work!')
    } else {
      console.log('⚠️ Some tables have access issues:')
      console.log('   1. Make sure you are signed in to the application')
      console.log('   2. Check that you have a profile record')
      console.log('   3. Verify RLS policies are working correctly')
    }
  } else {
    console.log('❌ Email configuration tables are not fully deployed')
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('1. Copy the SQL from deploy-email-tables-safe.sql')
    console.log('2. Open Supabase SQL Editor: https://supabase.com/dashboard/project/ecbuwphipphdsrqjwgfm/sql')
    console.log('3. Paste and execute the SQL')
    console.log('4. Run this script again to verify')
  }
  
  console.log('')
  console.log('🔗 HELPFUL LINKS:')
  console.log('• Supabase SQL Editor: https://supabase.com/dashboard/project/ecbuwphipphdsrqjwgfm/sql')
  console.log('• Application: http://localhost:5173')
  console.log('• Email Management: http://localhost:5173/email-management')
}

checkEmailTablesStatus().catch(console.error)
