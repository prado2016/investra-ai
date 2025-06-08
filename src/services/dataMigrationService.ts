/**
 * Data Migration Service for Stock Tracker App
 * Migrates data from localStorage to Supabase database
 * Handles data transformation, validation, and error recovery
 */

import { SupabaseService } from './supabaseService'
import { storageService } from './storageService'
import type { 
  Portfolio as SupabasePortfolio,
  Asset as SupabaseAsset,
  Position as SupabasePosition,
  Transaction as SupabaseTransaction,
  AssetType,
  TransactionType 
} from '../lib/database/types'

// Migration status tracking
export interface MigrationStatus {
  stage: 'idle' | 'analyzing' | 'migrating' | 'completed' | 'error'
  progress: number
  currentStep: string
  errors: string[]
  warnings: string[]
  summary?: MigrationSummary
}

export interface MigrationSummary {
  portfoliosFound: number
  portfoliosMigrated: number
  positionsFound: number
  positionsMigrated: number
  transactionsFound: number
  transactionsMigrated: number
  assetsCreated: number
  totalErrors: number
  migrationTime: number
}

// Type mappings from localStorage to Supabase
const ASSET_TYPE_MAPPING: Record<string, AssetType> = {
  'stock': 'stock',
  'option': 'option',
  'forex': 'forex',
  'crypto': 'crypto',
  'reit': 'reit',
  'etf': 'etf'
}

const TRANSACTION_TYPE_MAPPING: Record<string, TransactionType> = {
  'buy': 'buy',
  'sell': 'sell',
  'dividend': 'dividend',
  'split': 'split',
  'merger': 'merger'
}

/**
 * Data Migration Service Class
 */
export class DataMigrationService {
  private migrationStatus: MigrationStatus = {
    stage: 'idle',
    progress: 0,
    currentStep: 'Ready to migrate',
    errors: [],
    warnings: []
  }

  private listeners: ((status: MigrationStatus) => void)[] = []

  /**
   * Subscribe to migration status updates
   */
  public onStatusUpdate(listener: (status: MigrationStatus) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Update migration status and notify listeners
   */
  private updateStatus(updates: Partial<MigrationStatus>): void {
    this.migrationStatus = { ...this.migrationStatus, ...updates }
    this.listeners.forEach(listener => listener(this.migrationStatus))
  }

  /**
   * Get current migration status
   */
  public getStatus(): MigrationStatus {
    return { ...this.migrationStatus }
  }

  /**
   * Analyze localStorage data before migration
   */
  public async analyzeLocalData(): Promise<{
    portfolios: number
    positions: number
    transactions: number
    hasData: boolean
    estimatedTime: number
  }> {
    try {
      this.updateStatus({
        stage: 'analyzing',
        currentStep: 'Analyzing localStorage data...',
        progress: 0
      })

      const portfolios = storageService.getPortfolios()
      const positions = storageService.getPositions()
      const transactions = storageService.getTransactions()

      const totalItems = portfolios.length + positions.length + transactions.length
      const estimatedTime = Math.max(totalItems * 0.5, 5) // Estimate 0.5 seconds per item, minimum 5 seconds

      this.updateStatus({
        stage: 'idle',
        currentStep: 'Analysis complete',
        progress: 0
      })

      return {
        portfolios: portfolios.length,
        positions: positions.length,
        transactions: transactions.length,
        hasData: totalItems > 0,
        estimatedTime
      }
    } catch (error) {
      this.updateStatus({
        stage: 'error',
        currentStep: 'Analysis failed',
        errors: [error instanceof Error ? error.message : 'Unknown analysis error']
      })
      throw error
    }
  }

  /**
   * Perform full data migration from localStorage to Supabase
   */
  public async migrateData(): Promise<MigrationSummary> {
    const startTime = Date.now()
    let summary: MigrationSummary = {
      portfoliosFound: 0,
      portfoliosMigrated: 0,
      positionsFound: 0,
      positionsMigrated: 0,
      transactionsFound: 0,
      transactionsMigrated: 0,
      assetsCreated: 0,
      totalErrors: 0,
      migrationTime: 0
    }

    try {
      this.updateStatus({
        stage: 'migrating',
        progress: 0,
        currentStep: 'Starting migration...',
        errors: [],
        warnings: []
      })

      // Step 1: Get all localStorage data
      this.updateStatus({
        currentStep: 'Reading localStorage data...',
        progress: 10
      })

      const localPortfolios = storageService.getPortfolios()
      const localPositions = storageService.getPositions()
      const localTransactions = storageService.getTransactions()

      summary.portfoliosFound = localPortfolios.length
      summary.positionsFound = localPositions.length
      summary.transactionsFound = localTransactions.length

      if (summary.portfoliosFound === 0 && summary.positionsFound === 0 && summary.transactionsFound === 0) {
        this.updateStatus({
          stage: 'completed',
          currentStep: 'No data to migrate',
          progress: 100,
          warnings: ['No data found in localStorage']
        })
        return summary
      }

      // Step 2: Migrate portfolios first
      this.updateStatus({
        currentStep: 'Migrating portfolios...',
        progress: 20
      })

      const portfolioMapping: Record<string, string> = {}
      for (let i = 0; i < localPortfolios.length; i++) {
        try {
          const localPortfolio = localPortfolios[i]
          const result = await SupabaseService.portfolio.createPortfolio(
            localPortfolio.name,
            localPortfolio.description || '',
            localPortfolio.currency,
            i === 0 // First portfolio is default
          )

          if (result.success && result.data) {
            portfolioMapping[localPortfolio.id] = result.data.id
            summary.portfoliosMigrated++
          } else {
            this.updateStatus({
              errors: [...this.migrationStatus.errors, `Failed to migrate portfolio "${localPortfolio.name}": ${result.error}`]
            })
            summary.totalErrors++
          }
        } catch (error) {
          this.updateStatus({
            errors: [...this.migrationStatus.errors, `Error migrating portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`]
          })
          summary.totalErrors++
        }

        this.updateStatus({
          progress: 20 + (i / localPortfolios.length) * 20
        })
      }

      // Step 3: Create assets from positions and transactions
      this.updateStatus({
        currentStep: 'Creating assets...',
        progress: 40
      })

      const assetMapping: Record<string, string> = {}
      const uniqueAssets = new Set<string>()

      // Collect unique assets from positions and transactions
      localPositions.forEach(pos => uniqueAssets.add(pos.assetSymbol))
      localTransactions.forEach(trans => uniqueAssets.add(trans.assetSymbol))

      const assetArray = Array.from(uniqueAssets)
      for (let i = 0; i < assetArray.length; i++) {
        try {
          const symbol = assetArray[i]
          // Find asset type from positions or transactions
          const position = localPositions.find(p => p.assetSymbol === symbol)
          const transaction = localTransactions.find(t => t.assetSymbol === symbol)
          const assetType = position?.assetType || transaction?.assetType || 'stock'

          const result = await SupabaseService.asset.getOrCreateAsset(
            symbol,
            symbol, // Use symbol as name for now
            ASSET_TYPE_MAPPING[assetType] || 'stock'
          )

          if (result.success && result.data) {
            assetMapping[symbol] = result.data.id
            summary.assetsCreated++
          } else {
            this.updateStatus({
              errors: [...this.migrationStatus.errors, `Failed to create asset "${symbol}": ${result.error}`]
            })
            summary.totalErrors++
          }
        } catch (error) {
          this.updateStatus({
            errors: [...this.migrationStatus.errors, `Error creating asset: ${error instanceof Error ? error.message : 'Unknown error'}`]
          })
          summary.totalErrors++
        }

        this.updateStatus({
          progress: 40 + (i / assetArray.length) * 20
        })
      }

      // Step 4: Migrate positions
      this.updateStatus({
        currentStep: 'Migrating positions...',
        progress: 60
      })

      for (let i = 0; i < localPositions.length; i++) {
        try {
          const localPosition = localPositions[i]
          const portfolioId = portfolioMapping[localPosition.id] // Assuming position.id maps to portfolio
          const assetId = assetMapping[localPosition.assetSymbol]

          if (!portfolioId) {
            this.updateStatus({
              warnings: [...this.migrationStatus.warnings, `Skipping position for ${localPosition.assetSymbol}: No matching portfolio found`]
            })
            continue
          }

          if (!assetId) {
            this.updateStatus({
              warnings: [...this.migrationStatus.warnings, `Skipping position for ${localPosition.assetSymbol}: Asset not created`]
            })
            continue
          }

          const result = await SupabaseService.position.upsertPosition(
            portfolioId,
            assetId,
            localPosition.quantity,
            localPosition.averageCostBasis,
            'FIFO' // Default cost basis method
          )

          if (result.success) {
            summary.positionsMigrated++
          } else {
            this.updateStatus({
              errors: [...this.migrationStatus.errors, `Failed to migrate position for ${localPosition.assetSymbol}: ${result.error}`]
            })
            summary.totalErrors++
          }
        } catch (error) {
          this.updateStatus({
            errors: [...this.migrationStatus.errors, `Error migrating position: ${error instanceof Error ? error.message : 'Unknown error'}`]
          })
          summary.totalErrors++
        }

        this.updateStatus({
          progress: 60 + (i / localPositions.length) * 20
        })
      }

      // Step 5: Migrate transactions
      this.updateStatus({
        currentStep: 'Migrating transactions...',
        progress: 80
      })

      for (let i = 0; i < localTransactions.length; i++) {
        try {
          const localTransaction = localTransactions[i]
          const portfolioId = Object.values(portfolioMapping)[0] // Use first portfolio for now
          const assetId = assetMapping[localTransaction.assetSymbol]

          if (!portfolioId || !assetId) {
            this.updateStatus({
              warnings: [...this.migrationStatus.warnings, `Skipping transaction for ${localTransaction.assetSymbol}: Missing portfolio or asset`]
            })
            continue
          }

          const result = await SupabaseService.transaction.createTransaction(
            portfolioId,
            assetId,
            TRANSACTION_TYPE_MAPPING[localTransaction.type] || 'buy',
            localTransaction.quantity,
            localTransaction.price,
            new Date(localTransaction.date).toISOString(),
            undefined, // position_id
            localTransaction.fees || 0,
            localTransaction.currency,
            localTransaction.notes
          )

          if (result.success) {
            summary.transactionsMigrated++
          } else {
            this.updateStatus({
              errors: [...this.migrationStatus.errors, `Failed to migrate transaction for ${localTransaction.assetSymbol}: ${result.error}`]
            })
            summary.totalErrors++
          }
        } catch (error) {
          this.updateStatus({
            errors: [...this.migrationStatus.errors, `Error migrating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`]
          })
          summary.totalErrors++
        }

        this.updateStatus({
          progress: 80 + (i / localTransactions.length) * 15
        })
      }

      // Step 6: Complete migration
      summary.migrationTime = Date.now() - startTime

      this.updateStatus({
        stage: 'completed',
        currentStep: 'Migration completed!',
        progress: 100,
        summary
      })

      return summary

    } catch (error) {
      summary.migrationTime = Date.now() - startTime
      this.updateStatus({
        stage: 'error',
        currentStep: 'Migration failed',
        errors: [...this.migrationStatus.errors, error instanceof Error ? error.message : 'Unknown migration error']
      })
      throw error
    }
  }

  /**
   * Clear localStorage data after successful migration
   */
  public async clearLocalStorageData(): Promise<boolean> {
    try {
      this.updateStatus({
        currentStep: 'Clearing localStorage...',
        progress: 95
      })

      return storageService.clearAllData()
    } catch (error) {
      this.updateStatus({
        errors: [...this.migrationStatus.errors, `Failed to clear localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`]
      })
      return false
    }
  }

  /**
   * Reset migration status
   */
  public reset(): void {
    this.migrationStatus = {
      stage: 'idle',
      progress: 0,
      currentStep: 'Ready to migrate',
      errors: [],
      warnings: []
    }
    this.listeners.forEach(listener => listener(this.migrationStatus))
  }
}

// Export singleton instance
export const dataMigrationService = new DataMigrationService()
export default dataMigrationService
