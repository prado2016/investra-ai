/**
 * Check database using service role key like email-puller does
 */

import { createClient } from '@supabase/supabase-js';

async function checkWithServiceRole() {
  try {
    console.log('🔑 Checking Database with Service Role Key');
    console.log('==========================================\n');

    // Create client with service role key (like email-puller)
    const supabaseUrl = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';
    
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    
    console.log('1️⃣ Service role connection established');

    // Check portfolios with service role (should bypass RLS)
    console.log('\n2️⃣ Checking portfolios with service role...');
    const { data: portfolios, error: portfolioError } = await serviceClient
      .from('portfolios')
      .select('*');

    if (portfolioError) {
      console.log(`   ❌ Portfolio error: ${portfolioError.message}`);
    } else {
      console.log(`   ✅ Found ${portfolios?.length || 0} portfolios total`);
      portfolios?.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.name} (${p.id}) - User: ${p.user_id} - ${p.currency}`);
      });
    }

    // Check email tables with service role
    console.log('\n3️⃣ Checking email tables with service role...');
    
    const { count: inboxCount, error: inboxError } = await serviceClient
      .from('imap_inbox')
      .select('*', { count: 'exact', head: true });

    const { count: processedCount, error: processedError } = await serviceClient
      .from('imap_processed')
      .select('*', { count: 'exact', head: true });

    console.log(`   📧 imap_inbox: ${inboxCount || 0} emails`);
    console.log(`   ✅ imap_processed: ${processedCount || 0} emails`);
    console.log(`   🔢 Total: ${(inboxCount || 0) + (processedCount || 0)} emails`);

    // Check transactions with service role
    console.log('\n4️⃣ Checking transactions with service role...');
    const { data: transactions, error: transError } = await serviceClient
      .from('transactions')
      .select('*')
      .limit(5);

    if (transError) {
      console.log(`   ❌ Transaction error: ${transError.message}`);
    } else {
      console.log(`   ✅ Found ${transactions?.length || 0} transactions`);
      transactions?.forEach((t, i) => {
        console.log(`   ${i+1}. ${t.transaction_type} ${t.quantity} ${t.asset_id} on ${t.transaction_date}`);
      });
    }

    // Check if specific user has data
    console.log('\n5️⃣ Checking specific user data...');
    const userId = '1845c30a-4f89-49bb-aeb9-bc292752e07a';
    
    const { data: userPortfolios, error: userError } = await serviceClient
      .from('portfolios')
      .select('*')
      .eq('user_id', userId);

    if (userError) {
      console.log(`   ❌ User portfolio error: ${userError.message}`);
    } else {
      console.log(`   ✅ User has ${userPortfolios?.length || 0} portfolios`);
      userPortfolios?.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.name} (${p.id})`);
      });
    }

    console.log('\n📊 SERVICE ROLE SUMMARY:');
    console.log('========================');
    console.log('This should show the real data that exists in the database');
    console.log('If this still shows 0 emails but your app shows 47,');
    console.log('then the app is using cached data or a different database');

  } catch (error) {
    console.error('❌ Service role check failed:', error);
  }
}

checkWithServiceRole();