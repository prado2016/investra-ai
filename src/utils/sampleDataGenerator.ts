/**
 * Sample Data Generator for Testing Migration
 * Creates sample portfolios, positions, and transactions in localStorage
 */

import { storageService } from '../services/storageService'
import type { Currency, TransactionType } from '../types/common'

interface SampleDataOptions {
  portfolioCount?: number
  positionCount?: number
  transactionCount?: number
}

export class SampleDataGenerator {
  
  /**
   * Generate sample data for migration testing
   */
  static generateSampleData(options: SampleDataOptions = {}): {
    portfolios: number;
    positions: number; 
    transactions: number;
    assets: number;
  } {
    const {
      portfolioCount = 2,
      positionCount = 5,
      transactionCount = 10
    } = options

    console.log('🎯 Generating sample data for migration testing...')

    // Clear existing data
    storageService.clearAllData()

    // Generate sample portfolios
    const portfolios = []
    for (let i = 0; i < portfolioCount; i++) {
      const portfolio = {
        id: `portfolio_${i + 1}`,
        name: `Sample Portfolio ${i + 1}`,
        description: `This is a sample portfolio for testing migration functionality`,
        currency: (i === 0 ? 'USD' : 'EUR') as Currency,
        totalValue: 10000 + (i * 5000),
        totalCostBasis: 8000 + (i * 4000),
        totalUnrealizedPL: 2000 + (i * 1000),
        totalUnrealizedPLPercent: 25.0,
        totalRealizedPL: 500 + (i * 200),
        totalReturn: 2500 + (i * 1200),
        totalReturnPercent: 31.25,
        cashBalance: 1000 + (i * 500),
        positions: [],
        assetAllocation: [
          { assetType: 'stock' as const, value: 8000, percentage: 80, count: 3 },
          { assetType: 'crypto' as const, value: 1500, percentage: 15, count: 2 },
          { assetType: 'etf' as const, value: 500, percentage: 5, count: 1 }
        ],
        dailyPL: 50 + (i * 25),
        weeklyPL: 150 + (i * 75),
        monthlyPL: 800 + (i * 400),
        yearlyPL: 2500 + (i * 1200),
        createdAt: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date(),
        isActive: true,
        owner: `user_${i + 1}`
      }
      portfolios.push(portfolio)
      storageService.savePortfolio(portfolio)
    }

    // Generate sample positions
    const sampleAssets = [
      { symbol: 'AAPL', type: 'stock', price: 150.50 },
      { symbol: 'GOOGL', type: 'stock', price: 2800.75 },
      { symbol: 'TSLA', type: 'stock', price: 800.25 },
      { symbol: 'BTC-USD', type: 'crypto', price: 45000.00 },
      { symbol: 'ETH-USD', type: 'crypto', price: 3200.50 },
      { symbol: 'SPY', type: 'etf', price: 450.75 },
      { symbol: 'QQQ', type: 'etf', price: 380.25 }
    ]

    const positions = []
    for (let i = 0; i < positionCount; i++) {
      const asset = sampleAssets[i % sampleAssets.length]
      const quantity = Math.floor(Math.random() * 100) + 1
      const avgCost = asset.price * (0.8 + Math.random() * 0.4) // Random cost basis
      
      const position = {
        id: `position_${i + 1}`,
        assetId: `asset_${asset.symbol}`,
        assetSymbol: asset.symbol,
        assetType: asset.type as 'stock' | 'option' | 'crypto' | 'etf',
        quantity,
        averageCostBasis: avgCost,
        totalCostBasis: quantity * avgCost,
        currentMarketValue: quantity * asset.price,
        unrealizedPL: quantity * (asset.price - avgCost),
        unrealizedPLPercent: ((asset.price - avgCost) / avgCost) * 100,
        realizedPL: Math.random() * 500 - 250,
        totalReturn: quantity * (asset.price - avgCost) + (Math.random() * 500 - 250),
        totalReturnPercent: 0,
        currency: 'USD' as Currency,
        openDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastTransactionDate: new Date(),
        costBasisMethod: 'FIFO' as const,
        lots: [],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
      
      position.totalReturnPercent = (position.totalReturn / position.totalCostBasis) * 100
      positions.push(position)
      storageService.savePosition(position)
    }

    // Generate sample transactions
    const transactions = []
    for (let i = 0; i < transactionCount; i++) {
      const asset = sampleAssets[i % sampleAssets.length]
      const quantity = Math.floor(Math.random() * 50) + 1
      const price = asset.price * (0.8 + Math.random() * 0.4)
      const fees = Math.random() * 10 + 1
      
      const transaction = {
        id: `transaction_${i + 1}`,
        assetId: `asset_${asset.symbol}`,
        assetSymbol: asset.symbol,
        assetType: asset.type as 'stock' | 'option' | 'crypto' | 'etf',
        type: (Math.random() > 0.3 ? 'buy' : 'sell') as TransactionType,
        quantity,
        price,
        totalAmount: quantity * price + fees,
        fees,
        currency: 'USD' as Currency,
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        notes: `Sample ${asset.type} transaction for ${asset.symbol}`,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        source: 'sample_data_generator'
      }
      
      transactions.push(transaction)
      storageService.saveTransaction(transaction)
    }

    console.log('✅ Sample data generated successfully!')
    console.log(`📊 Created: ${portfolios.length} portfolios, ${positions.length} positions, ${transactions.length} transactions`)
    
    // Show summary
    return {
      portfolios: portfolios.length,
      positions: positions.length,
      transactions: transactions.length,
      assets: sampleAssets.length
    }
  }

  /**
   * Clear all sample data
   */
  static clearSampleData(): void {
    console.log('🗑️ Clearing sample data...')
    storageService.clearAllData()
    console.log('✅ Sample data cleared!')
  }

  /**
   * Check if sample data exists
   */
  static hasSampleData(): boolean {
    const portfolios = storageService.getPortfolios()
    const positions = storageService.getPositions()
    const transactions = storageService.getTransactions()
    
    return portfolios.length > 0 || positions.length > 0 || transactions.length > 0
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).SampleDataGenerator = SampleDataGenerator
}

export default SampleDataGenerator
