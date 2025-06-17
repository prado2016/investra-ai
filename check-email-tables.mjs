#!/usr/bin/env node

/**
 * Simple Email Table Deployment Script
 * Uses direct SQL execution approach
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmailTables() {
  console.log('🔍 Checking email configuration tables...\n')
  
  const tables = [
    'email_configurations',
    'email_processing_logs', 
    'email_import_rules'
  ]
  
  let existingCount = 0
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1)
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table.padEnd(25)} - Table does not exist`)
        } else if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log(`✅ ${table.padEnd(25)} - Table exists (RLS enabled)`)
          existingCount++
        } else {
          console.log(`⚠️  ${table.padEnd(25)} - ${error.message.substring(0, 50)}...`)
        }
      } else {
        console.log(`✅ ${table.padEnd(25)} - Table exists and accessible`)
        existingCount++
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(25)} - Connection error: ${err.message}`)
    }
  }
  
  console.log(`\n📊 Found ${existingCount}/${tables.length} email configuration tables`)
  
  if (existingCount === tables.length) {
    console.log('🎉 All email configuration tables are already deployed!')
    console.log('\n📋 Manual verification steps:')
    console.log('1. Go to Supabase Dashboard → Database → Tables')
    console.log('2. Verify these tables exist:')
    console.log('   - email_configurations')
    console.log('   - email_processing_logs')
    console.log('   - email_import_rules')
    console.log('3. Check that RLS policies are enabled for each table')
    return true
  } else {
    console.log('❌ Email configuration tables need to be created')
    console.log('\n📋 Manual deployment required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy the contents of src/migrations/007_create_email_configuration_tables.sql')
    console.log('3. Paste into SQL Editor and click "Run"')
    console.log('4. Verify all tables are created successfully')
    return false
  }
}

async function displayMigrationSQL() {
  try {
    const migrationSQL = readFileSync('./src/migrations/007_create_email_configuration_tables.sql', 'utf8')
    console.log('\n📄 Email Configuration Migration SQL:')
    console.log('=' .repeat(80))
    console.log(migrationSQL.substring(0, 1000) + '...')
    console.log('=' .repeat(80))
    console.log(`📏 Full SQL length: ${migrationSQL.length} characters`)
    console.log('📂 Full content in: src/migrations/007_create_email_configuration_tables.sql')
  } catch (error) {
    console.error('❌ Could not read migration file:', error.message)
  }
}

async function checkUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.log('⚠️ Not authenticated - this is expected for table checking')
    return null
  }
  
  if (user) {
    console.log(`✅ Authenticated as: ${user.email}`)
  }
  
  return user
}

async function main() {
  console.log('🚀 Email Configuration Table Deployment Check\n')
  
  await checkUser()
  const tablesExist = await checkEmailTables()
  
  if (!tablesExist) {
    await displayMigrationSQL()
  }
  
  console.log('\n🏁 Email table check complete!')
}

main().catch(console.error)
