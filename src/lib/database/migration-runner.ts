/**
 * Database Migration Runner
 * Task 3: Create Database Migration Scripts
 * 
 * This module provides utilities to safely run database migrations
 * in the correct order and track their execution status.
 */

import { supabase } from '../supabase'

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
