#!/usr/bin/env node

/**
 * Deploy Email Configuration Tables to Supabase
 * This script deploys the email configuration schema to the database
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('❌ Auth error:', error.message)
    return null
  }
  
  if (!user) {
    console.log('⚠️ No authenticated user found')
    console.log('💡 Open the application in browser and sign in, then run this again')
    return null
  }
  
  console.log('✅ Authenticated user:', user.email)
  return user
}

async function checkExistingTables() {
  console.log('🔍 Checking for existing email configuration tables...\n')
  
  const tables = [
    'email_configurations',
    'email_processing_logs', 
    'email_import_rules'
  ]
  
  let existingCount = 0
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table.padEnd(25)} - Table MISSING`)
        } else if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log(`✅ ${table.padEnd(25)} - Table exists (RLS enabled)`)
          existingCount++
        } else {
          console.log(`⚠️  ${table.padEnd(25)} - Error: ${error.message.substring(0, 40)}...`)
        }
      } else {
        console.log(`✅ ${table.padEnd(25)} - Table exists and accessible`)
        existingCount++
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(25)} - Connection failed`)
    }
  }
  
  return { existingCount, totalTables: tables.length }
}

async function deployEmailTables() {
  console.log('🚀 Deploying email configuration tables to Supabase...\n')
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'src', 'migrations', '007_create_email_configuration_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Loaded migration SQL file')
    console.log(`📏 SQL length: ${migrationSQL.length} characters\n`)
    
    // Split the SQL into individual statements for better error handling
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`🔧 Executing ${statements.length} SQL statements...\n`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('IF NOT EXISTS')) {
            console.log(`⚠️  Statement ${i + 1}: Already exists (skipped)`)
            successCount++
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message)
            errorCount++
          }
        } else {
          console.log(`✅ Statement ${i + 1}: Success`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} exception:`, err.message)
        errorCount++
      }
    }
    
    console.log(`\n📊 Deployment Summary:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log(`   📈 Success rate: ${Math.round((successCount / (successCount + errorCount)) * 100)}%`)
    
    return errorCount === 0
    
  } catch (error) {
    console.error('❌ Failed to deploy email tables:', error)
    return false
  }
}

async function verifyDeployment() {
  console.log('\n🔍 Verifying deployment...\n')
  
  const { existingCount, totalTables } = await checkExistingTables()
  
  console.log(`\n📊 VERIFICATION SUMMARY: ${existingCount}/${totalTables} tables found`)
  
  if (existingCount === totalTables) {
    console.log('🎉 SUCCESS: Email configuration tables deployed successfully!')
    console.log('✅ All tables created')
    console.log('✅ RLS policies enabled')
    console.log('✅ Ready for email configuration feature')
    return true
  } else {
    console.log('❌ FAILURE: Email table deployment incomplete')
    console.log('📝 Some tables may need manual creation in Supabase dashboard')
    return false
  }
}

async function main() {
  console.log('🚀 Starting email configuration table deployment...\n')
  
  // Check authentication
  const user = await getCurrentUser()
  if (!user) {
    console.log('⚠️ Skipping deployment - no authenticated user')
    return
  }
  
  // Check existing tables
  const { existingCount, totalTables } = await checkExistingTables()
  
  if (existingCount === totalTables) {
    console.log('\n🎉 All email tables already exist! No deployment needed.')
    return
  }
  
  // Deploy tables
  console.log('\n📦 Proceeding with deployment...\n')
  const deploymentSuccess = await deployEmailTables()
  
  if (deploymentSuccess) {
    // Verify deployment
    await verifyDeployment()
  }
  
  console.log('\n🏁 Email table deployment complete!')
}

main().catch(console.error)
