/**
 * Database Migration Runner
 * Task 3: Create Database Migration Scripts
 * 
 * This module provides utilities to safely run database migrations
 * in the correct order and track their execution status.
 */

import { supabase } from '../supabase'
import { loadMigrationSQL } from './migration-runner-utils'

export interface Migration {
  name: string
  file: string
  sql: string
  version: string
}

export interface MigrationResult {
  success: boolean
  migration: string
  executionTime: number
  error?: string
}

/**
 * List of migrations in execution order
 */
export const MIGRATIONS: Omit<Migration, 'sql'>[] = [
  {
    name: 'migration_system',
    file: '000_migration_system.sql',
    version: '1.0.0'
  },
  {
    name: 'add_api_keys_table', 
    file: '001_add_api_keys_table.sql',
    version: '1.1.0'
  },
  {
    name: 'extend_symbol_field',
    file: '002_extend_symbol_field.sql', 
    version: '1.2.0'
  },
  {
    name: 'enhance_decimal_price_support',
    file: '003_enhance_decimal_price_support.sql',
    version: '1.3.0'
  },
  {
    name: 'api_key_functions',
    file: '004_api_key_functions.sql',
    version: '1.4.0'
  },
  {
    name: 'add_option_expired_transaction_type',
    file: '005_add_option_expired_transaction_type.sql',
    version: '1.5.0'
  },
  {
    name: 'fix_option_expired_quantity_constraint',
    file: '006_fix_option_expired_quantity_constraint.sql',
    version: '1.6.0'
  },
  {
    name: 'add_email_archiving_columns',
    file: '007_add_email_archiving_columns.sql',
    version: '1.7.0'
  }
]

/**
 * Check if a migration has already been executed
 */
export async function isMigrationExecuted(migrationName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('migration_name')
      .eq('migration_name', migrationName)
      .eq('success', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn(`Could not check migration status for ${migrationName}:`, error)
      return false
    }

    return !!data
  } catch (error) {
    console.warn(`Could not check migration status for ${migrationName}:`, error)
    return false
  }
}

/**
 * Execute a single migration
 */
export async function executeMigration(migration: Migration): Promise<MigrationResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Executing migration: ${migration.name}`)
    
    // Execute the migration SQL
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql_query: migration.sql
    })

    if (migrationError) {
      throw migrationError
    }

    const executionTime = Date.now() - startTime

    // Record successful migration
    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert({
        migration_name: migration.name,
        migration_file: migration.file,
        execution_time_ms: executionTime,
        success: true,
        schema_version: migration.version
      })

    if (recordError) {
      console.warn(`Could not record migration ${migration.name}:`, recordError)
    }

    // Update schema version
    await supabase
      .from('schema_version')
      .update({ 
        version: migration.version,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)

    return {
      success: true,
      migration: migration.name,
      executionTime
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Record failed migration
    try {
      await supabase
        .from('schema_migrations')
        .insert({
          migration_name: migration.name,
          migration_file: migration.file,
          execution_time_ms: executionTime,
          success: false,
          error_message: errorMessage,
          schema_version: migration.version
        })
    } catch (recordError) {
      console.warn(`Could not record failed migration ${migration.name}:`, recordError)
    }

    return {
      success: false,
      migration: migration.name,
      executionTime,
      error: errorMessage
    }
  }
}

/**
 * Run all pending migrations
 */
export async function runAllMigrations(): Promise<{
  success: boolean
  results: MigrationResult[]
  totalExecutionTime: number
}> {
  const results: MigrationResult[] = []
  const startTime = Date.now()
  
  console.log('Starting database migration process...')
  
  for (const migrationConfig of MIGRATIONS) {
    try {
      // Check if migration already executed
      const alreadyExecuted = await isMigrationExecuted(migrationConfig.name)
      
      if (alreadyExecuted) {
        console.log(`Migration ${migrationConfig.name} already executed, skipping`)
        continue
      }
      
      // Load migration SQL
      const sql = await loadMigrationSQL(migrationConfig.file)
      
      if (!sql) {
        console.error(`No SQL content found for migration ${migrationConfig.name}`)
        results.push({
          success: false,
          migration: migrationConfig.name,
          executionTime: 0,
          error: 'No SQL content found'
        })
        continue
      }
      
      // Create full migration object
      const migration: Migration = {
        ...migrationConfig,
        sql
      }
      
      // Execute migration
      const result = await executeMigration(migration)
      results.push(result)
      
      if (!result.success) {
        console.error(`Migration ${migrationConfig.name} failed: ${result.error}`)
        // Stop on first failure to prevent cascade errors
        break
      }
      
      console.log(`Migration ${migrationConfig.name} completed successfully`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error executing migration ${migrationConfig.name}:`, error)
      
      results.push({
        success: false,
        migration: migrationConfig.name,
        executionTime: 0,
        error: errorMessage
      })
      
      // Stop on error
      break
    }
  }
  
  const totalExecutionTime = Date.now() - startTime
  const allSuccessful = results.every(r => r.success)
  
  console.log(`Migration process completed. ${results.length} migrations processed in ${totalExecutionTime}ms`)
  
  return {
    success: allSuccessful,
    results,
    totalExecutionTime
  }
}
