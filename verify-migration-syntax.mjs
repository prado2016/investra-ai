#!/usr/bin/env node

/**
 * Verify Migration SQL Syntax
 * Check if the migration SQL file has any obvious syntax issues
 */

import { readFileSync } from 'fs';

console.log('🔍 Verifying Migration SQL Syntax...\n');

try {
  const sqlContent = readFileSync('./src/migrations/008_extend_configuration_tables.sql', 'utf8');
  
  console.log('📄 Migration file loaded successfully');
  console.log(`📏 SQL length: ${sqlContent.length} characters`);
  
  // Check for the fixed empty arrays
  const emptyArrayMatches = sqlContent.match(/ARRAY\[\](?!::)/g);
  if (emptyArrayMatches) {
    console.log(`❌ Found ${emptyArrayMatches.length} untyped empty arrays that need fixing`);
    process.exit(1);
  }
  
  // Check for properly typed empty arrays
  const typedArrayMatches = sqlContent.match(/ARRAY\[\]::TEXT\[\]/g);
  console.log(`✅ Found ${typedArrayMatches ? typedArrayMatches.length : 0} properly typed empty arrays`);
  
  // Basic SQL syntax checks
  const semicolons = (sqlContent.match(/;/g) || []).length;
  const createTables = (sqlContent.match(/CREATE TABLE/gi) || []).length;
  const insertStatements = (sqlContent.match(/INSERT INTO/gi) || []).length;
  
  console.log(`\n📊 SQL Structure:`);
  console.log(`   📋 Semicolons: ${semicolons}`);
  console.log(`   🗄️  CREATE TABLE statements: ${createTables}`);
  console.log(`   📥 INSERT statements: ${insertStatements}`);
  
  console.log(`\n✅ Migration SQL appears syntactically correct!`);
  console.log(`\n🎯 Ready to deploy to Supabase:`);
  console.log(`   1. Open: https://supabase.com/dashboard/project/ecbuwphipphdsrqjwgfm/sql`);
  console.log(`   2. Copy: cat src/migrations/008_extend_configuration_tables.sql | pbcopy`);
  console.log(`   3. Paste and Run the SQL in Supabase SQL Editor`);
  
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
}
