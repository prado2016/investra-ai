/**
 * Investigate why email data is missing when user has processed emails before
 */

import { database } from './email-puller/dist/database.js';

async function investigateMissingData() {
  try {
    console.log('🔍 Investigating Missing Email Data');
    console.log('==================================\n');

    // Check for any data in transaction-related tables that might reference emails
    console.log('1️⃣ Checking transactions table for email references...');
    try {
      const { data: transactions, error: transError } = await database['client']
        .from('transactions')
        .select('*')
        .limit(5);

      if (transError) {
        console.log(`   ❌ Error accessing transactions: ${transError.message}`);
      } else {
        console.log(`   ✅ Found ${transactions?.length || 0} transactions`);
        if (transactions && transactions.length > 0) {
          console.log(`   📄 Sample transaction columns:`, Object.keys(transactions[0]));
          transactions.forEach((t, i) => {
            console.log(`   ${i+1}. ID: ${t.id}, Date: ${t.transaction_date}, Type: ${t.transaction_type}`);
          });
        }
      }
    } catch (e) {
      console.log(`   ❌ Transactions table error: ${e.message}`);
    }

    // Check for any audit/log tables
    console.log('\n2️⃣ Checking for audit/log tables...');
    const auditTables = ['audit_logs', 'email_logs', 'processing_logs', 'sync_logs', 'activity_logs'];
    
    for (const tableName of auditTables) {
      try {
        const { count, error } = await database['client']
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ❌ ${tableName}: doesn't exist`);
        } else {
          console.log(`   ✅ ${tableName}: ${count || 0} records`);
          if (count && count > 0) {
            const { data: sample } = await database['client']
              .from(tableName)
              .select('*')
              .limit(2);
            console.log(`      Sample: ${JSON.stringify(sample?.[0], null, 2)}`);
          }
        }
      } catch (e) {
        console.log(`   ❌ ${tableName}: error ${e.message}`);
      }
    }

    // Check database metadata for recent changes
    console.log('\n3️⃣ Checking table creation dates and recent activity...');
    try {
      const { data: tableInfo, error: infoError } = await database['client']
        .rpc('pg_stat_user_tables')
        .select('*');

      if (!infoError && tableInfo) {
        console.log('   Recent table activity:');
        tableInfo.forEach(table => {
          if (table.relname.includes('email') || table.relname.includes('imap')) {
            console.log(`   - ${table.relname}: ${table.n_tup_ins} inserts, ${table.n_tup_del} deletes`);
          }
        });
      }
    } catch (e) {
      console.log('   Could not access table statistics');
    }

    // Check for any backup or archived email tables
    console.log('\n4️⃣ Checking for backup/archived email tables...');
    const backupTables = [
      'emails_backup', 'imap_inbox_backup', 'imap_processed_backup',
      'emails_archive', 'old_emails', 'email_history',
      'emails_2024', 'emails_2025', 'imap_data_old'
    ];
    
    for (const tableName of backupTables) {
      try {
        const { count, error } = await database['client']
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`   ✅ Found backup table ${tableName} with ${count || 0} records`);
          if (count && count > 0) {
            const { data: sample } = await database['client']
              .from(tableName)
              .select('*')
              .limit(1);
            if (sample?.[0]) {
              console.log(`      Contains data with columns: ${Object.keys(sample[0]).join(', ')}`);
            }
          }
        }
      } catch {
        // Table doesn't exist - this is expected for most
      }
    }

    // Check if there are any foreign key references that might indicate deleted email data
    console.log('\n5️⃣ Looking for orphaned references to email data...');
    try {
      // Check if processed table has references to non-existent inbox emails
      const { data: orphanedRefs, error: orphanError } = await database['client']
        .from('imap_processed')
        .select('original_inbox_id')
        .not('original_inbox_id', 'is', null)
        .limit(10);

      if (!orphanError && orphanedRefs && orphanedRefs.length > 0) {
        console.log(`   ✅ Found ${orphanedRefs.length} processed emails with inbox references`);
        console.log(`      This suggests emails were moved from inbox to processed previously`);
      } else {
        console.log(`   📭 No orphaned references found in processed table`);
      }
    } catch (e) {
      console.log(`   ❌ Error checking orphaned references: ${e.message}`);
    }

    // Final summary
    console.log('\n📊 INVESTIGATION SUMMARY:');
    console.log('========================');
    console.log('If you previously processed emails, the data should be in:');
    console.log('1. imap_processed table (for completed emails)');
    console.log('2. transactions table (for trading emails that created transactions)');
    console.log('3. Some backup/archive table');
    console.log('');
    console.log('Possible explanations for missing data:');
    console.log('- Data was truncated/deleted during a migration');
    console.log('- Using a different database environment');
    console.log('- Data was archived to different tables');
    console.log('- Database was reset/cleaned');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateMissingData();