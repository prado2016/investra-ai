/**
 * Check if UI can now see emails after sync completion
 */

import { createClient } from '@supabase/supabase-js';

async function checkUIEmails() {
  try {
    console.log('🔍 Checking UI Email Visibility After Sync');
    console.log('==========================================\n');

    const supabaseUrl = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';
    
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const userId = '1845c30a-4f89-49bb-aeb9-bc292752e07a';

    // Check current email counts
    console.log('1️⃣ Current email counts...');
    
    const { count: inboxCount } = await serviceClient
      .from('imap_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: processedCount } = await serviceClient
      .from('imap_processed')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log(`   📧 Inbox: ${inboxCount || 0} emails`);
    console.log(`   ✅ Processed: ${processedCount || 0} emails`);
    console.log(`   🔢 Total: ${(inboxCount || 0) + (processedCount || 0)} emails`);

    // Check recent emails in inbox (what UI should see)
    console.log('\n2️⃣ Recent emails in inbox (what UI queries)...');
    
    const { data: inboxEmails, error: inboxError } = await serviceClient
      .from('imap_inbox')
      .select('*')
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(10);

    if (inboxError) {
      console.log(`   ❌ Error: ${inboxError.message}`);
    } else {
      console.log(`   📧 Found ${inboxEmails?.length || 0} emails in inbox`);
      inboxEmails?.forEach((email, i) => {
        console.log(`   ${i+1}. From: ${email.from_email} | Subject: ${email.subject?.substring(0, 40)}...`);
      });
    }

    // Check if we have any forwarded emails
    console.log('\n3️⃣ Checking for forwarded emails from eduprado@gmail.com...');
    
    const { data: forwardedEmails } = await serviceClient
      .from('imap_inbox')
      .select('*')
      .eq('user_id', userId)
      .eq('from_email', 'eduprado@gmail.com')
      .order('received_at', { ascending: false });

    const { data: forwardedProcessed } = await serviceClient
      .from('imap_processed')
      .select('*')
      .eq('user_id', userId)
      .eq('from_email', 'eduprado@gmail.com')
      .order('processed_at', { ascending: false });

    const totalForwarded = (forwardedEmails?.length || 0) + (forwardedProcessed?.length || 0);
    console.log(`   📧 Total forwarded emails: ${totalForwarded}`);
    
    if (totalForwarded > 0) {
      console.log('   ✅ Forwarded emails found!');
      [...(forwardedEmails || []), ...(forwardedProcessed || [])].forEach((email, i) => {
        console.log(`   ${i+1}. Subject: ${email.subject?.substring(0, 50)}...`);
        console.log(`      Date: ${email.received_at || email.processed_at}`);
      });
    } else {
      console.log('   ❌ No forwarded emails found yet');
    }

    // Check recent processed emails (June timeframe)
    console.log('\n4️⃣ Checking for June emails...');
    
    const { data: juneEmails } = await serviceClient
      .from('imap_processed')
      .select('*')
      .eq('user_id', userId)
      .gte('received_at', '2024-06-15')
      .lte('received_at', '2024-06-25')
      .order('received_at', { ascending: false });

    console.log(`   📅 June 2024 emails: ${juneEmails?.length || 0}`);
    
    if (juneEmails && juneEmails.length > 0) {
      juneEmails.forEach((email, i) => {
        console.log(`   ${i+1}. From: ${email.from_email} | ${email.received_at?.substring(0, 10)}`);
      });
    }

    // Simulate UI query
    console.log('\n5️⃣ Simulating UI query (what user should see)...');
    
    // UI queries both inbox and processed
    const uiEmails = [...(inboxEmails || [])];
    
    const { data: recentProcessed } = await serviceClient
      .from('imap_processed')
      .select('*')
      .eq('user_id', userId)
      .order('processed_at', { ascending: false })
      .limit(100);

    if (recentProcessed) {
      uiEmails.push(...recentProcessed.map(email => ({
        ...email,
        source: 'processed',
        received_at: email.processed_at || email.received_at
      })));
    }

    uiEmails.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

    console.log(`   🎯 UI would show: ${uiEmails.length} total emails`);
    console.log('   📧 Recent emails for UI:');
    uiEmails.slice(0, 5).forEach((email, i) => {
      console.log(`   ${i+1}. From: ${email.from_email} | ${email.received_at?.substring(0, 16)}`);
    });

    console.log('\n📊 UI EMAIL VISIBILITY SUMMARY:');
    console.log('===============================');
    console.log(`Total emails in database: ${(inboxCount || 0) + (processedCount || 0)}`);
    console.log(`Emails UI should show: ${uiEmails.length}`);
    console.log(`Forwarded emails found: ${totalForwarded}`);
    
    if (uiEmails.length > 0) {
      console.log('✅ UI should now show emails after refresh!');
    } else {
      console.log('❌ UI will still show 0 emails - need to debug further');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkUIEmails();