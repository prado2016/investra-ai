/**
 * Check if forwarded emails from eduprado@gmail.com are being filtered out
 */

import { createClient } from '@supabase/supabase-js';

async function checkForwardedEmails() {
  try {
    console.log('🔍 Checking for Forwarded Emails');
    console.log('==================================\n');

    const supabaseUrl = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';
    
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Check for emails from eduprado@gmail.com (forwarded emails)
    console.log('1️⃣ Looking for emails from eduprado@gmail.com...');
    
    const { data: forwardedEmails } = await serviceClient
      .from('imap_inbox')
      .select('*')
      .eq('from_email', 'eduprado@gmail.com')
      .order('received_at', { ascending: false });

    const { data: processedForwarded } = await serviceClient
      .from('imap_processed')
      .select('*')
      .eq('from_email', 'eduprado@gmail.com')
      .order('processed_at', { ascending: false });

    console.log(`   📧 Inbox: ${forwardedEmails?.length || 0} emails from eduprado@gmail.com`);
    console.log(`   ✅ Processed: ${processedForwarded?.length || 0} emails from eduprado@gmail.com`);

    // Check for Wealthsimple-related content in forwarded emails
    console.log('\n2️⃣ Checking for Wealthsimple content in forwarded emails...');
    
    const allForwarded = [...(forwardedEmails || []), ...(processedForwarded || [])];
    const wealthsimpleForwarded = allForwarded.filter(email => 
      (email.subject && email.subject.toLowerCase().includes('wealthsimple')) ||
      (email.text_content && email.text_content.toLowerCase().includes('wealthsimple')) ||
      (email.html_content && email.html_content.toLowerCase().includes('wealthsimple'))
    );

    console.log(`   🏦 ${wealthsimpleForwarded.length} forwarded emails contain "wealthsimple"`);

    if (wealthsimpleForwarded.length > 0) {
      console.log('\n   Sample Wealthsimple forwarded emails:');
      wealthsimpleForwarded.slice(0, 3).forEach((email, i) => {
        console.log(`   ${i+1}. ${email.subject} | ${email.received_at?.substring(0, 10)}`);
      });
    }

    // Check for emails directly from Wealthsimple
    console.log('\n3️⃣ Checking for direct Wealthsimple emails...');
    
    const { data: directWealthsimple } = await serviceClient
      .from('imap_processed')
      .select('*')
      .ilike('from_email', '%wealthsimple%')
      .order('processed_at', { ascending: false });

    console.log(`   🏦 ${directWealthsimple?.length || 0} emails directly from Wealthsimple domains`);

    // Check emails around June 18th specifically
    console.log('\n4️⃣ Checking emails around June 18th, 2024...');
    
    const { data: june18Emails } = await serviceClient
      .from('imap_processed')
      .select('*')
      .gte('received_at', '2024-06-15')
      .lte('received_at', '2024-06-21')
      .order('received_at', { ascending: false });

    console.log(`   📅 ${june18Emails?.length || 0} emails processed between June 15-21, 2024`);

    if (june18Emails && june18Emails.length > 0) {
      console.log('\n   Sample emails from that period:');
      june18Emails.slice(0, 5).forEach((email, i) => {
        console.log(`   ${i+1}. From: ${email.from_email} | Subject: ${email.subject?.substring(0, 50)}... | ${email.received_at?.substring(0, 10)}`);
      });
    }

    console.log('\n📊 FORWARDED EMAIL ANALYSIS:');
    console.log('============================');
    console.log(`Total forwarded emails (eduprado@gmail.com): ${allForwarded.length}`);
    console.log(`Wealthsimple content in forwarded: ${wealthsimpleForwarded.length}`);
    console.log(`Direct Wealthsimple emails: ${directWealthsimple?.length || 0}`);
    console.log('');
    console.log('DIAGNOSIS:');
    if (wealthsimpleForwarded.length > 0 && (directWealthsimple?.length || 0) === 0) {
      console.log('❌ Problem: Wealthsimple emails are forwarded, not direct');
      console.log('   Email-puller might be filtering them out by sender domain');
    } else if ((directWealthsimple?.length || 0) > 0) {
      console.log('✅ Found direct Wealthsimple emails - forwarding may not be the issue');
    } else {
      console.log('❓ No Wealthsimple emails found in either category');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkForwardedEmails();