#!/usr/bin/env node

/**
 * Validation Script for Mock Data and Dashboard Metrics
 * 
 * Usage: node validate-mock-data.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function validateMockData() {
  console.log('🔍 Validating mock data insertion...\n')
  
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      console.log('❌ No authenticated user found. Please sign in first.')
      return
    }
    
    console.log(`👤 Checking data for user: ${userData.user.email}\n`)
    
    // Check portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('is_active', true)
    
    if (portfoliosError) {
      console.error('❌ Error fetching portfolios:', portfoliosError)
      return
    }
    
    console.log(`📁 Portfolios found: ${portfolios.length}`)
    portfolios.forEach(p => console.log(`   - ${p.name} (${p.currency})`))
    
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found. Run insert-mock-data.mjs first.')
      return
    }
    
    const mockPortfolio = portfolios.find(p => p.name === 'Mock Trading Portfolio') || portfolios[0]
    console.log(`✅ Using portfolio: ${mockPortfolio.name}\n`)
    
    // Check assets
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .in('symbol', ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'])
    
    console.log(`📈 Assets found: ${assets?.length || 0}`)
    assets?.forEach(a => console.log(`   - ${a.symbol}: ${a.name}`))
    console.log()    // Check transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('portfolio_id', mockPortfolio.id)
      .order('transaction_date', { ascending: false })
    
    console.log(`💰 Transactions found: ${transactions?.length || 0}`)
    if (transactions?.length > 0) {
      const buyCount = transactions.filter(t => t.transaction_type === 'buy').length
      const sellCount = transactions.filter(t => t.transaction_type === 'sell').length
      const dividendCount = transactions.filter(t => t.transaction_type === 'dividend').length
      
      console.log(`   - Buy transactions: ${buyCount}`)
      console.log(`   - Sell transactions: ${sellCount}`)
      console.log(`   - Dividend transactions: ${dividendCount}`)
    }
    console.log()
    
    // Check positions
    const { data: positions } = await supabase
      .from('positions')
      .select(`
        *,
        asset:assets(symbol, name)
      `)
      .eq('portfolio_id', mockPortfolio.id)
      .eq('is_active', true)
    
    console.log(`📊 Active positions found: ${positions?.length || 0}`)
    positions?.forEach(p => {
      console.log(`   - ${p.asset.symbol}: ${p.quantity} shares @ $${p.average_cost_basis.toFixed(2)}`)
    })
    console.log()
    
    // Calculate mock dashboard metrics
    if (transactions?.length > 0) {
      console.log('📊 Dashboard Metrics Preview:')
      
      // Today's transactions
      const today = new Date().toISOString().split('T')[0]
      const todayTransactions = transactions.filter(t => 
        t.transaction_date.startsWith(today)
      )
      
      const todayVolume = todayTransactions
        .filter(t => t.transaction_type === 'buy' || t.transaction_type === 'sell')
        .reduce((sum, t) => sum + t.total_amount, 0)
      
      // This month's data
      const thisMonth = new Date().toISOString().substring(0, 7)
      const monthTransactions = transactions.filter(t => 
        t.transaction_date.startsWith(thisMonth)
      )
      
      const monthlyDividends = monthTransactions
        .filter(t => t.transaction_type === 'dividend')
        .reduce((sum, t) => sum + t.total_amount, 0)
      
      const monthlyFees = monthTransactions
        .reduce((sum, t) => sum + (t.fees || 0), 0)
      
      console.log(`💵 Today's Trade Volume: $${todayVolume.toFixed(2)}`)
      console.log(`💰 Monthly Dividends: $${monthlyDividends.toFixed(2)}`)
      console.log(`💸 Monthly Fees: $${monthlyFees.toFixed(2)}`)
    }
    
    console.log('\n✅ Mock data validation complete!')
    console.log('🌐 You can now test the dashboard in the web application.')
    
  } catch (error) {
    console.error('❌ Validation error:', error)
  }
}

validateMockData()
