/**
 * Check why the UI shows 0 emails when database has emails
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

async function checkUIEmailQuery() {
  console.log('🔍 Checking why UI shows 0 emails when database has emails...');
  
  const serviceSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);
  
  const userId = '1845c30a-4f89-49bb-aeb9-bc292752e07a';
  
  try {
    // Check with service role (should see all emails)
    console.log('📊 Checking emails with SERVICE ROLE key...');
    
    const { data: serviceEmails, error: serviceError } = await serviceSupabase
      .from('imap_inbox')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (serviceError) {
      console.error('❌ Service role query failed:', serviceError);
    } else {
      console.log(`✅ Service role found ${serviceEmails?.length || 0} emails`);
      if (serviceEmails && serviceEmails.length > 0) {
        console.log('📋 Recent emails (service role):');
        serviceEmails.slice(0, 3).forEach((email, index) => {
          console.log(`  ${index + 1}. ${email.subject?.substring(0, 50)} (${email.received_at})`);
        });
      }
    }

    // Check with anon key (what the UI uses)
    console.log('\n📊 Checking emails with ANON key (what UI uses)...');
    
    const { data: anonEmails, error: anonError } = await anonSupabase
      .from('imap_inbox')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (anonError) {
      console.error('❌ Anon key query failed:', anonError);
      console.log('🚨 THIS IS THE PROBLEM! UI can\'t access emails due to RLS policy');
    } else {
      console.log(`✅ Anon key found ${anonEmails?.length || 0} emails`);
      if (anonEmails && anonEmails.length > 0) {
        console.log('📋 Recent emails (anon key):');
        anonEmails.slice(0, 3).forEach((email, index) => {
          console.log(`  ${index + 1}. ${email.subject?.substring(0, 50)} (${email.received_at})`);
        });
      } else {
        console.log('🚨 ANON KEY RETURNS 0 EMAILS - RLS POLICY ISSUE!');
      }
    }

    // Check RLS policies on imap_inbox
    console.log('\n🔒 Checking if user can access their own emails...');
    
    // Try to authenticate with anon key and set user context
    const { data: authData, error: authError } = await anonSupabase.auth.getUser();
    console.log('🔐 Auth status with anon key:', authError ? 'Not authenticated' : `Authenticated as ${authData.user?.email}`);

    // Check total email count with both keys
    console.log('\n📊 Checking total email counts...');
    
    const { count: serviceCount, error: serviceCountError } = await serviceSupabase
      .from('imap_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: anonCount, error: anonCountError } = await anonSupabase
      .from('imap_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log(`Service role count: ${serviceCountError ? 'Error' : serviceCount}`);
    console.log(`Anon key count: ${anonCountError ? 'Error' : anonCount}`);

    if (serviceCount && serviceCount > 0 && (!anonCount || anonCount === 0)) {
      console.log('\n🚨 CONFIRMED: RLS policy prevents UI from seeing emails');
      console.log('💡 Solution: Update RLS policy on imap_inbox table or use different authentication');
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkUIEmailQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });