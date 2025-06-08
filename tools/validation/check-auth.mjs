#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAuth() {
  console.log('🔍 Checking authentication status...')
  
  const { data: session } = await supabase.auth.getSession()
  console.log('Session:', session?.session ? '✅ Active' : '❌ None')
  
  const { data: user } = await supabase.auth.getUser()
  console.log('User:', user?.user ? `✅ ${user.user.email}` : '❌ None')
  
  if (!user?.user) {
    console.log('')
    console.log('📝 TO FIX:')
    console.log('1. Open http://localhost:5186 in your browser')
    console.log('2. Sign in completely')
    console.log('3. Keep the browser open')
    console.log('4. Run the mock data script again')
  }
}

checkAuth()
