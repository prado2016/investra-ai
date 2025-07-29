/**
 * Script to run the email archiving columns migration
 * Run this in the browser console after importing it
 */

import { runAllMigrations } from '../lib/database/migration-runner'

export async function runEmailArchivingMigration() {
  console.log('🚀 Starting email archiving migration...')
  
  try {
    const result = await runAllMigrations()
    
    if (result.success) {
      console.log('✅ Email archiving migration completed successfully!')
      console.log(`📊 Processed ${result.results.length} migrations in ${result.totalExecutionTime}ms`)
      
      // Log successful migrations
      result.results
        .filter(r => r.success)
        .forEach(r => console.log(`  ✅ ${r.migration} (${r.executionTime}ms)`))
        
      return { success: true, message: 'Migration completed successfully' }
    } else {
      console.error('❌ Email archiving migration failed!')
      
      // Log failed migrations
      result.results
        .filter(r => !r.success)
        .forEach(r => console.error(`  ❌ ${r.migration}: ${r.error}`))
        
      return { 
        success: false, 
        message: 'Migration failed', 
        errors: result.results.filter(r => !r.success).map(r => r.error)
      }
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Make it available in the global scope for console access
if (typeof window !== 'undefined') {
  (window as any).runEmailArchivingMigration = runEmailArchivingMigration
}