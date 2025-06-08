#!/usr/bin/env node

/**
 * Mock Data Insertion Script for Stock Tracker
 * 
 * This script populates the database with realistic mock data to test
 * the summary dashboard functionality.
 * 
 * Usage: node insert-mock-data.mjs
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://ecbuwphipphdsrqjwgfm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'

const supabase = createClient(supabaseUrl, supabaseKey)

// Mock data generators
const generateMockAssets = () => [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    asset_type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    market_cap: 3000000000000,
    shares_outstanding: 15000000000
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    asset_type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Internet Content & Information',
    market_cap: 2000000000000,
    shares_outstanding: 13000000000
  },  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    asset_type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers',
    market_cap: 800000000000,
    shares_outstanding: 3000000000
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    asset_type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Software—Infrastructure',
    market_cap: 2800000000000,
    shares_outstanding: 7500000000
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    asset_type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail',
    market_cap: 1600000000000,
    shares_outstanding: 10500000000
  }
]

const generateDateInPast = (daysAgo) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

const generateMockTransactions = (portfolioId, assets) => {
  const transactions = []
  
  // Generate transactions over the last 30 days
  assets.forEach((asset, index) => {
    const basePrice = 100 + (index * 50) // Starting prices: 100, 150, 200, 250, 300
    
    // Buy transactions (15-25 days ago)
    transactions.push({
      portfolio_id: portfolioId,
      asset_id: asset.id,
      transaction_type: 'buy',
      quantity: 10 + (index * 5), // 10, 15, 20, 25, 30 shares
      price: basePrice,
      total_amount: (10 + (index * 5)) * basePrice,
      fees: 9.99,      transaction_date: generateDateInPast(20 - index),
      settlement_date: generateDateInPast(18 - index),
      exchange_rate: 1,
      currency: 'USD',
      notes: `Initial purchase of ${asset.symbol}`,
      broker_name: 'Mock Broker'
    })
    
    // Some additional buy transactions (10-15 days ago)
    if (index < 3) {
      transactions.push({
        portfolio_id: portfolioId,
        asset_id: asset.id,
        transaction_type: 'buy',
        quantity: 5,
        price: basePrice * 1.05, // 5% higher
        total_amount: 5 * basePrice * 1.05,
        fees: 9.99,
        transaction_date: generateDateInPast(12 - index),
        settlement_date: generateDateInPast(10 - index),
        exchange_rate: 1,
        currency: 'USD',
        notes: `Additional purchase of ${asset.symbol}`,
        broker_name: 'Mock Broker'
      })
    }
    
    // Some sell transactions (5-8 days ago)
    if (index % 2 === 0) {
      transactions.push({
        portfolio_id: portfolioId,
        asset_id: asset.id,
        transaction_type: 'sell',
        quantity: 3,
        price: basePrice * 1.15, // 15% profit
        total_amount: 3 * basePrice * 1.15,
        fees: 9.99,
        transaction_date: generateDateInPast(6 - (index / 2)),
        settlement_date: generateDateInPast(4 - (index / 2)),
        exchange_rate: 1,
        currency: 'USD',
        notes: `Partial sale of ${asset.symbol} for profit`,
        broker_name: 'Mock Broker'
      })
    }
    
    // Dividend transactions (2-5 days ago)
    if (index < 2) { // Only AAPL and GOOGL pay dividends in our mock
      transactions.push({
        portfolio_id: portfolioId,
        asset_id: asset.id,
        transaction_type: 'dividend',
        quantity: 0, // Dividends don't affect share count
        price: 0.88, // Dividend per share
        total_amount: (10 + (index * 5)) * 0.88, // Based on current holdings
        fees: 0,        transaction_date: generateDateInPast(3 - index),
        settlement_date: generateDateInPast(1 - index),
        exchange_rate: 1,
        currency: 'USD',
        notes: `Quarterly dividend payment for ${asset.symbol}`,
        broker_name: 'Mock Broker'
      })
    }
  })
  
  // Add some recent transactions for today's P/L
  transactions.push({
    portfolio_id: portfolioId,
    asset_id: assets[0].id, // AAPL
    transaction_type: 'buy',
    quantity: 2,
    price: 152.25,
    total_amount: 304.50,
    fees: 9.99,
    transaction_date: generateDateInPast(0), // Today
    settlement_date: generateDateInPast(0),
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Today\'s purchase of AAPL',
    broker_name: 'Mock Broker'
  })
  
  return transactions
}

const generateMockPositions = (portfolioId, assets, transactions) => {
  const positions = []
  
  // Calculate positions based on transactions
  assets.forEach((asset, index) => {
    const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
    
    let totalQuantity = 0
    let totalCostBasis = 0
    let realizedPL = 0
    
    assetTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'buy') {
        totalQuantity += transaction.quantity
        totalCostBasis += transaction.total_amount + transaction.fees
      } else if (transaction.transaction_type === 'sell') {
        const avgCostBasis = totalCostBasis / totalQuantity
        const costOfSoldShares = transaction.quantity * avgCostBasis
        const saleProceeds = transaction.total_amount - transaction.fees
        
        realizedPL += saleProceeds - costOfSoldShares
        
        totalQuantity -= transaction.quantity
        totalCostBasis -= costOfSoldShares
      }
    })
    
    if (totalQuantity > 0) {
      positions.push({
        portfolio_id: portfolioId,
        asset_id: asset.id,
        quantity: totalQuantity,
        average_cost_basis: totalCostBasis / totalQuantity,
        total_cost_basis: totalCostBasis,
        realized_pl: realizedPL,
        open_date: generateDateInPast(20 - index),
        cost_basis_method: 'FIFO',
        is_active: true
      })
    }
  })
  
  return positions
}

async function clearExistingData() {
  console.log('🧹 Clearing existing mock data...')
  
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      console.log('❌ No authenticated user found. Please sign in first.')
      return false
    }
    
    // Delete in order due to foreign key constraints
    await supabase.from('transactions').delete().eq('portfolio_id', 'mock-portfolio-id')
    await supabase.from('positions').delete().eq('portfolio_id', 'mock-portfolio-id')
    await supabase.from('portfolios').delete().eq('id', 'mock-portfolio-id')
    await supabase.from('assets').delete().in('symbol', ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'])
    
    console.log('✅ Existing mock data cleared')
    return true
  } catch (error) {
    console.log('⚠️  Warning: Could not clear existing data:', error.message)
    return true // Continue anyway
  }
}

async function insertMockData() {
  console.log('🚀 Starting mock data insertion...\n')
  
  try {
    // Clear existing data first
    const shouldContinue = await clearExistingData()
    if (!shouldContinue) return
    
    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      console.log('❌ No authenticated user found.')
      console.log('📝 Please sign in to the application first, then run this script.')
      return
    }
    
    console.log(`👤 Inserting data for user: ${userData.user.email}`)
    
    // 1. Insert mock assets
    console.log('📈 Inserting mock assets...')
    const mockAssets = generateMockAssets()
    
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .insert(mockAssets)
      .select()
    
    if (assetsError) {
      console.error('❌ Error inserting assets:', assetsError)
      return
    }    
    console.log(`✅ Inserted ${assets.length} assets`)
    
    // 2. Insert mock portfolio
    console.log('📁 Inserting mock portfolio...')
    const mockPortfolio = {
      id: 'mock-portfolio-id',
      user_id: userData.user.id,
      name: 'Mock Trading Portfolio',
      description: 'Sample portfolio for testing dashboard metrics',
      currency: 'USD',
      is_default: true,
      is_active: true
    }
    
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .insert(mockPortfolio)
      .select()
      .single()
    
    if (portfolioError) {
      console.error('❌ Error inserting portfolio:', portfolioError)
      return
    }
    
    console.log('✅ Inserted mock portfolio')
    
    // 3. Insert mock transactions
    console.log('💰 Inserting mock transactions...')
    const mockTransactions = generateMockTransactions(portfolio.id, assets)
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .insert(mockTransactions)
      .select()
    
    if (transactionsError) {
      console.error('❌ Error inserting transactions:', transactionsError)
      return
    }
    
    console.log(`✅ Inserted ${transactions.length} transactions`)
    
    // 4. Insert mock positions
    console.log('📊 Inserting mock positions...')
    const mockPositions = generateMockPositions(portfolio.id, assets, mockTransactions)
    
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .insert(mockPositions)
      .select()
    
    if (positionsError) {
      console.error('❌ Error inserting positions:', positionsError)
      return
    }
    
    console.log(`✅ Inserted ${positions.length} positions`)    
    // 5. Summary of inserted data
    console.log('\n' + '='.repeat(60))
    console.log('🎉 MOCK DATA INSERTION COMPLETE!')
    console.log('='.repeat(60))
    
    console.log('📈 Assets:', assets.map(a => a.symbol).join(', '))
    console.log('📁 Portfolio:', portfolio.name)
    console.log('💰 Transactions:', transactions.length)
    console.log('📊 Active Positions:', positions.length)
    
    // Calculate some sample metrics for preview
    const totalTransactionValue = transactions
      .filter(t => t.transaction_type === 'buy' || t.transaction_type === 'sell')
      .reduce((sum, t) => sum + t.total_amount, 0)
    
    const totalDividends = transactions
      .filter(t => t.transaction_type === 'dividend')
      .reduce((sum, t) => sum + t.total_amount, 0)
    
    const totalFees = transactions
      .reduce((sum, t) => sum + t.fees, 0)
    
    console.log('\n📊 Sample Metrics Preview:')
    console.log(`💵 Total Transaction Volume: $${totalTransactionValue.toFixed(2)}`)
    console.log(`💰 Total Dividends: $${totalDividends.toFixed(2)}`)
    console.log(`💸 Total Fees: $${totalFees.toFixed(2)}`)
    
    console.log('\n✅ You can now test the dashboard summary display!')
    console.log('🌐 Open the application and navigate to the Dashboard to see the data.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
insertMockData()
