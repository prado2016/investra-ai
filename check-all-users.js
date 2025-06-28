/**
 * Check what users exist in the database and their associated data
 */

import { database } from './email-puller/dist/database.js';

async function checkAllUsers() {
  try {
    console.log('👥 Checking All Users in Database');
    console.log('=================================\n');

    // Check auth.users table for all registered users
    console.log('1️⃣ Checking auth.users table...');
    
    try {
      const { data: authUsers, error: authError } = await database['client']
        .from('auth.users')
        .select('id, email, created_at, last_sign_in_at')
        .limit(10);

      if (authError) {
        console.log(`   ❌ Cannot access auth.users: ${authError.message}`);
      } else {
        console.log(`   ✅ Found ${authUsers?.length || 0} users in auth.users`);
        authUsers?.forEach((user, i) => {
          console.log(`   ${i+1}. ${user.id} | ${user.email} | Created: ${user.created_at?.substring(0, 10)}`);
        });
      }
    } catch (e) {
      console.log(`   ❌ Error accessing auth.users: ${e.message}`);
    }

    // Check for any data in tables that might have different user_ids
    console.log('\n2️⃣ Checking portfolios table...');
    
    const { data: portfolios, error: portfolioError } = await database['client']
      .from('portfolios')
      .select('user_id, name, created_at')
      .limit(10);

    if (portfolioError) {
      console.log(`   ❌ Error accessing portfolios: ${portfolioError.message}`);
    } else {
      console.log(`   ✅ Found ${portfolios?.length || 0} portfolios`);
      portfolios?.forEach((portfolio, i) => {
        console.log(`   ${i+1}. User: ${portfolio.user_id} | Portfolio: ${portfolio.name} | Created: ${portfolio.created_at?.substring(0, 10)}`);
      });
    }

    // Check for any data in imap_configurations
    console.log('\n3️⃣ Checking imap_configurations table...');
    
    const { data: configs, error: configError } = await database['client']
      .from('imap_configurations')
      .select('user_id, gmail_email, is_active, created_at')
      .limit(10);

    if (configError) {
      console.log(`   ❌ Error accessing imap_configurations: ${configError.message}`);
    } else {
      console.log(`   ✅ Found ${configs?.length || 0} IMAP configurations`);
      configs?.forEach((config, i) => {
        console.log(`   ${i+1}. User: ${config.user_id} | Email: ${config.gmail_email} | Active: ${config.is_active} | Created: ${config.created_at?.substring(0, 10)}`);
      });
    }

    // Check transactions table for any user activity
    console.log('\n4️⃣ Checking transactions table for any data...');
    
    const { data: transactions, error: transError } = await database['client']
      .from('transactions')
      .select('user_id, portfolio_id, asset_id, transaction_type, created_at')
      .limit(10);

    if (transError) {
      console.log(`   ❌ Error accessing transactions: ${transError.message}`);
    } else {
      console.log(`   ✅ Found ${transactions?.length || 0} transactions`);
      transactions?.forEach((trans, i) => {
        console.log(`   ${i+1}. User: ${trans.user_id} | Portfolio: ${trans.portfolio_id} | Type: ${trans.transaction_type} | Created: ${trans.created_at?.substring(0, 10)}`);
      });
    }

    // Check for any activity logs or recent data
    console.log('\n5️⃣ Checking any recent activity across all tables...');
    
    const tables = ['assets', 'holdings', 'price_history', 'daily_portfolio_snapshots'];
    
    for (const tableName of tables) {
      try {
        const { count, error } = await database['client']
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`   ✅ ${tableName}: ${count || 0} records`);
          
          if (count && count > 0) {
            // Get sample to see user_id if it exists
            const { data: sample } = await database['client']
              .from(tableName)
              .select('*')
              .limit(1);
              
            if (sample?.[0]) {
              const columns = Object.keys(sample[0]);
              if (columns.includes('user_id')) {
                console.log(`      Sample user_id: ${sample[0].user_id}`);
              }
              console.log(`      Columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
            }
          }
        }
      } catch (e) {
        console.log(`   ❌ ${tableName}: error ${e.message}`);
      }
    }

    console.log('\n📊 USER ANALYSIS SUMMARY:');
    console.log('=========================');
    console.log('Current test user ID: 1845c30a-4f89-49bb-aeb9-bc292752e07a');
    console.log('');
    console.log('Possible explanations for empty email tables:');
    console.log('1. Different user ID was used when processing emails');
    console.log('2. Data was deleted/truncated after processing');
    console.log('3. Email-puller never successfully ran');
    console.log('4. Different environment/database was used');
    console.log('5. Browser is caching old data showing 47 emails');

  } catch (error) {
    console.error('❌ User check failed:', error);
  }
}

checkAllUsers();