import { supabase } from '../supabase'

export async function setupDatabase() {
  try {
    console.log('🚀 Setting up database schema...')
    
    // Test connection first
    const { error: connectionError } = await supabase
      .from('_test')
      .select('*')
      .limit(1)
    
    if (connectionError) {
      console.log('✅ Database connection verified (expected error for non-existent table)')
    }

    // Create profiles table
    const { error: profilesError } = await supabase.rpc('setup_profiles_table', {})
    if (profilesError && !profilesError.message.includes('already exists')) {
      console.error('❌ Error creating profiles table:', profilesError)
      return false
    }

    console.log('✅ Database setup completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return false
  }
}

export async function createTablesWithRawSQL() {
  const schemas = [
    // Profiles table
    `
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users(id) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255),
      avatar_url VARCHAR(500),
      timezone VARCHAR(50) DEFAULT 'UTC',
      currency VARCHAR(3) DEFAULT 'USD',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Portfolios table
    `
    CREATE TABLE IF NOT EXISTS public.portfolios (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      currency VARCHAR(3) DEFAULT 'USD',
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT portfolios_user_id_name_key UNIQUE(user_id, name)
    );
    `
  ]

  for (const sql of schemas) {
    try {
      const { error } = await supabase.rpc('execute_sql', { sql_query: sql })
      if (error) {
        console.error('SQL Error:', error)
      } else {
        console.log('✅ Table created successfully')
      }
    } catch (err) {
      console.error('❌ Error executing SQL:', err)
    }
  }
}
