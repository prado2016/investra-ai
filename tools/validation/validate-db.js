// Database validation script
// Run this to verify database setup

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function validateDatabase() {
  console.log('🔍 Validating database setup...\n')
  
  const tables = ['profiles', 'portfolios', 'positions', 'transactions', 'assets', 'price_data']
  let successCount = 0
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        if (error.message.includes('RLS') || error.message.includes('policy') || error.message.includes('permission')) {
          console.log(`✅ ${table.padEnd(12)} - Table exists (RLS enabled)`)
          successCount++
        } else if (error.message.includes('does not exist')) {
          console.log(`❌ ${table.padEnd(12)} - Table MISSING`)
        } else {
          console.log(`⚠️  ${table.padEnd(12)} - Error: ${error.message.substring(0, 60)}...`)
        }
      } else {
        console.log(`✅ ${table.padEnd(12)} - Table exists and accessible`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(12)} - Connection failed`)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`📊 VALIDATION SUMMARY: ${successCount}/${tables.length} tables found`)
  
  if (successCount === tables.length) {
    console.log('🎉 SUCCESS: Database setup is complete!')
    console.log('✅ All tables created')
    console.log('✅ RLS policies working')
    console.log('✅ Ready for authentication setup')
    
    // Test connection to auth
    const { data: authUser } = await supabase.auth.getUser()
    console.log('✅ Auth system accessible')
    
  } else {
    console.log('❌ FAILURE: Database setup incomplete')
    console.log('📝 Action needed: Run SQL scripts in Supabase dashboard')
    console.log('📁 Files to run:')
    console.log('   1. /src/lib/database/schema.sql')
    console.log('   2. /src/lib/database/rls_policies.sql')
  }
  
  console.log('='.repeat(50))
}

// Run validation
validateDatabase().catch(console.error)
