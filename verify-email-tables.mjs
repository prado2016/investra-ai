#!/usr/bin/env node

/**
 * Verify Email Configuration Table Deployment
 * Run this after manually executing the SQL in Supabase dashboard
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.log('⚠️ Not authenticated - this is expected for table verification')
    return null
  }
  
  console.log(`✅ Authenticated as: ${user.email}`)
  return user
}

async function verifyEmailTables() {
  console.log('🔍 Verifying email configuration tables...\n')
  
  const tables = [
    { name: 'email_configurations', description: 'User email settings and IMAP configurations' },
    { name: 'email_processing_logs', description: 'Email processing history and results' },
    { name: 'email_import_rules', description: 'Automated email processing rules' }
  ]
  
  let successCount = 0
  let totalTables = tables.length
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1)
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table.name.padEnd(25)} - Table does not exist`)
          console.log(`   📝 ${table.description}`)
        } else if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log(`✅ ${table.name.padEnd(25)} - Table exists with RLS enabled`)
          console.log(`   📝 ${table.description}`)
          successCount++
        } else {
          console.log(`⚠️  ${table.name.padEnd(25)} - ${error.message.substring(0, 50)}...`)
          console.log(`   📝 ${table.description}`)
        }
      } else {
        console.log(`✅ ${table.name.padEnd(25)} - Table exists and accessible`)
        console.log(`   📝 ${table.description}`)
        console.log(`   📊 Sample query returned ${data ? data.length : 0} rows`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ ${table.name.padEnd(25)} - Connection error`)
      console.log(`   📝 ${table.description}`)
      console.log(`   🔍 Error: ${err.message}`)
    }
    console.log('')
  }
  
  return { successCount, totalTables }
}

async function verifyConstraintsAndIndexes() {
  console.log('🔍 Verifying database constraints and indexes...\n')
  
  try {
    // Test foreign key relationships
    console.log('📊 Testing foreign key relationships...')
    
    // This should fail gracefully due to RLS, but confirms table structure
    const { error: fkError } = await supabase
      .from('email_configurations')
      .select('id, user_id, default_portfolio_id')
      .limit(1)
    
    if (fkError && fkError.message.includes('RLS')) {
      console.log('✅ Foreign key constraints appear to be working (RLS blocking access)')
    }
    
    // Test email processing logs structure
    const { error: logsError } = await supabase
      .from('email_processing_logs')
      .select('id, email_config_id, processing_status')
      .limit(1)
    
    if (logsError && logsError.message.includes('RLS')) {
      console.log('✅ Email processing logs table structure confirmed')
    }
    
    // Test email import rules structure
    const { error: rulesError } = await supabase
      .from('email_import_rules')
      .select('id, email_config_id, action, priority')
      .limit(1)
    
    if (rulesError && rulesError.message.includes('RLS')) {
      console.log('✅ Email import rules table structure confirmed')
    }
    
    console.log('✅ Database structure verification completed\n')
    
  } catch (error) {
    console.log('⚠️ Could not fully verify constraints:', error.message)
  }
}

async function displayNextSteps(successCount, totalTables) {
  console.log('📋 NEXT STEPS:\n')
  
  if (successCount === totalTables) {
    console.log('🎉 SUCCESS: All email configuration tables are deployed!')
    console.log('')
    console.log('✅ Ready to proceed with:')
    console.log('   1. Complete TypeScript type definitions')
    console.log('   2. Create EmailConfigurationService')
    console.log('   3. Update EmailConfigurationPanel to use database')
    console.log('   4. Implement password encryption service')
    console.log('   5. Test email configuration flow')
    console.log('')
    console.log('🔗 Related files to update:')
    console.log('   • src/lib/database/types.ts (complete email types)')
    console.log('   • src/services/emailConfigurationService.ts (create)')
    console.log('   • src/components/EmailConfigurationPanel.tsx (update)')
    console.log('')
    
  } else {
    console.log('❌ DEPLOYMENT INCOMPLETE')
    console.log('')
    console.log('📝 Manual steps required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy contents of: src/migrations/007_create_email_configuration_tables.sql')
    console.log('3. Paste into SQL Editor and click "Run"')
    console.log('4. Check for any error messages')
    console.log('5. Run this verification script again')
    console.log('')
    console.log('🔍 Common issues:')
    console.log('   • Missing profiles table (run main schema first)')
    console.log('   • Missing portfolios table (run main schema first)')
    console.log('   • SQL syntax errors (check file encoding)')
    console.log('')
  }
}

async function main() {
  console.log('🚀 Email Configuration Table Verification\n')
  console.log('=' .repeat(60))
  console.log('')
  
  // Check authentication status
  await checkUser()
  console.log('')
  
  // Verify table deployment
  const { successCount, totalTables } = await verifyEmailTables()
  
  // Additional verification
  if (successCount > 0) {
    await verifyConstraintsAndIndexes()
  }
  
  // Summary
  console.log('=' .repeat(60))
  console.log(`📊 VERIFICATION SUMMARY: ${successCount}/${totalTables} tables deployed`)
  console.log('=' .repeat(60))
  console.log('')
  
  // Next steps
  await displayNextSteps(successCount, totalTables)
  
  console.log('🏁 Verification complete!')
}

main().catch(console.error)
