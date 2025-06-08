#!/usr/bin/env node

/**
 * Quick Mock Data Insertion Script
 * Uses the user ID found in your debug logs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

// Your user ID from the debug logs
const USER_ID = '1845c30a-4f89-49bb-aeb9-bc292752e07a'

async function insertQuickMockData() {
  console.log('🚀 Starting quick mock data insertion...')
  console.log(`👤 Using user ID: ${USER_ID}`)
  
  try {
    // 1. Clear existing mock data
    console.log('🧹 Clearing existing data...')
    await supabase.from('transactions').delete().eq('portfolio_id', 'mock-portfolio-id')
    await supabase.from('positions').delete().eq('portfolio_id', 'mock-portfolio-id')
    await supabase.from('portfolios').delete().eq('id', 'mock-portfolio-id')
    await supabase.from('assets').delete().in('symbol', ['AAPL', 'GOOGL'])
    
    // 2. Insert assets
    console.log('📈 Inserting assets...')
    const { data: assets } = await supabase
      .from('assets')
      .insert([
        { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', exchange: 'NASDAQ', currency: 'USD' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', asset_type: 'stock', exchange: 'NASDAQ', currency: 'USD' }
      ])
      .select()
    
    // 3. Insert portfolio
    console.log('📁 Inserting portfolio...')
    const { data: portfolio } = await supabase
      .from('portfolios')
      .insert({
        id: 'mock-portfolio-id',
        user_id: USER_ID,
        name: 'Mock Portfolio',
        currency: 'USD',
        is_default: true,
        is_active: true
      })
      .select()
      .single()
    
    // 4. Insert transactions
    console.log('💰 Inserting transactions...')
    const { data: transactions } = await supabase
      .from('transactions')
      .insert([
        {
          portfolio_id: portfolio.id,
          asset_id: assets[0].id,
          transaction_type: 'buy',
          quantity: 10,
          price: 150.00,
          total_amount: 1500.00,
          fees: 9.99,
          transaction_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'USD'
        },
        {
          portfolio_id: portfolio.id,
          asset_id: assets[1].id,
          transaction_type: 'buy',
          quantity: 5,
          price: 120.00,
          total_amount: 600.00,
          fees: 9.99,
          transaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'USD'
        },
        {
          portfolio_id: portfolio.id,
          asset_id: assets[0].id,
          transaction_type: 'dividend',
          quantity: 0,
          price: 0.25,
          total_amount: 2.50,
          fees: 0,
          transaction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'USD'
        }
      ])
      .select()
    
    console.log('✅ Mock data inserted successfully!')
    console.log(`📊 Inserted ${assets.length} assets, 1 portfolio, ${transactions.length} transactions`)
    console.log('')
    console.log('🔧 Next steps:')
    console.log('1. Refresh your browser')
    console.log('2. Set VITE_USE_MOCK_DASHBOARD=false in .env')
    console.log('3. Restart dev server')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

insertQuickMockData()
