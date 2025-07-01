/**
 * Find all tables that might contain emails
 */

import { database } from './email-puller/dist/database.js';

async function findEmailTables() {
  try {
    console.log('🔍 Searching for tables with email data');
    console.log('=====================================\n');

    // List of possible email-related table names
    const possibleTables = [
      'emails',
      'email_inbox', 
      'email_processed',
      'imap_emails',
      'imap_inbox',
      'imap_processed',
      'inbox',
      'processed_emails',
      'messages',
      'mail',
      'email_data',
      'user_emails'
    ];

    for (const tableName of possibleTables) {
      try {
        console.log(`📋 Checking table: ${tableName}`);
        
        const { count, error } = await database['client']
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ❌ Table ${tableName} doesn't exist or error: ${error.message}`);
        } else {
          console.log(`   ✅ Table ${tableName} exists with ${count || 0} records`);
          
          // If table has records, get sample data
          if (count && count > 0) {
            const { data: sample } = await database['client']
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample.length > 0) {
              console.log(`   📄 Sample columns:`, Object.keys(sample[0]).join(', '));
            }
          }
        }
      } catch (tableError) {
        console.log(`   ❌ Error checking ${tableName}:`, tableError.message);
      }
    }

    // Try to get schema information if possible
    console.log('\n🏗️  Trying to get table schema...');
    try {
      const { data: tables } = await database['client']
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%email%');
      
      if (!schemaError && tables) {
        console.log('Found email-related tables in schema:');
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      }
    } catch (schemaError) {
      console.log('   Could not access schema information');
    }

  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

findEmailTables();