/**
 * CSV Import Service
 * Handles importing CSV broker data into the Supabase database
 */

import { CSVParserService, type ParsedTransaction } from './csvParserService';
import { SupabaseService } from './supabaseService';

interface ImportResult {
  success: boolean;
  error?: string;
  stats: {
    portfoliosCreated: number;
    assetsCreated: number;
    transactionsCreated: number;
    transactionsSkipped: number;
  };
}

export class CSVImportService {
  /**
   * Import CSV file and create all necessary portfolios, assets, and transactions
   */
  static async importCSVFile(fileContent: string, filename: string): Promise<ImportResult> {
    const stats = {
      portfoliosCreated: 0,
      assetsCreated: 0,
      transactionsCreated: 0,
      transactionsSkipped: 0
    };

    try {
      console.log('🔄 Starting CSV import process for:', filename);
      
      // Step 1: Parse CSV to transactions
      const parsedTransactions = CSVParserService.parseCSV(fileContent, filename);
      console.log(`📊 Parsed ${parsedTransactions.length} transactions from CSV`);
      
      if (parsedTransactions.length === 0) {
        return {
          success: false,
          error: 'No valid transactions found in CSV file',
          stats
        };
      }

      // Step 2: Group by portfolio and asset
      const portfolioMap = new Map<string, ParsedTransaction[]>();
      const assetSymbols = new Set<string>();

      for (const transaction of parsedTransactions) {
        // Group by portfolio
        const portfolioTransactions = portfolioMap.get(transaction.portfolio_name) || [];
        portfolioTransactions.push(transaction);
        portfolioMap.set(transaction.portfolio_name, portfolioTransactions);
        
        // Collect asset symbols
        assetSymbols.add(transaction.symbol);
      }

      console.log(`🗂️  Found ${portfolioMap.size} portfolios and ${assetSymbols.size} unique assets`);

      // Step 3: Create or get portfolios
      const portfolioIds = new Map<string, string>();
      for (const portfolioName of portfolioMap.keys()) {
        const portfolioResult = await this.createOrGetPortfolio(portfolioName);
        if (portfolioResult.success && portfolioResult.data) {
          portfolioIds.set(portfolioName, portfolioResult.data.id);
          if (portfolioResult.created) {
            stats.portfoliosCreated++;
          }
        } else {
          console.error(`Failed to create/get portfolio ${portfolioName}:`, portfolioResult.error);
          return {
            success: false,
            error: `Failed to create portfolio: ${portfolioName}`,
            stats
          };
        }
      }

      // Step 4: Create or get assets
      const assetIds = new Map<string, string>();
      for (const symbol of assetSymbols) {
        // Asset type will be auto-detected by getOrCreateAsset
        // const assetTransactions = parsedTransactions.filter((t: ParsedTransaction) => t.symbol === symbol);
        // const assetType = assetTransactions[0]?.asset_type || 'stock';
        
        const assetResult = await SupabaseService.asset.getOrCreateAsset(symbol);
        if (assetResult.success && assetResult.data) {
          assetIds.set(symbol, assetResult.data.id);
          stats.assetsCreated++;
        } else {
          console.error(`Failed to create/get asset ${symbol}:`, assetResult.error);
          return {
            success: false,
            error: `Failed to create asset: ${symbol}`,
            stats
          };
        }
      }

      // Step 5: Create transactions
      for (const transaction of parsedTransactions) {
        const portfolioId = portfolioIds.get(transaction.portfolio_name);
        const assetId = assetIds.get(transaction.symbol);

        if (!portfolioId || !assetId) {
          console.warn(`Skipping transaction - missing portfolio or asset ID:`, transaction);
          stats.transactionsSkipped++;
          continue;
        }

        const transactionResult = await SupabaseService.transaction.createTransaction(
          portfolioId,
          assetId,
          transaction.transaction_type,
          transaction.quantity,
          transaction.price,
          transaction.transaction_date,
          {
            fees: transaction.fees,
            currency: transaction.currency,
            notes: transaction.notes
          }
        );

        if (transactionResult.success) {
          stats.transactionsCreated++;
        } else {
          console.error(`Failed to create transaction:`, transactionResult.error);
          stats.transactionsSkipped++;
        }
      }

      console.log('✅ CSV import completed:', stats);
      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error('❌ CSV import failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during CSV import',
        stats
      };
    }
  }

  /**
   * Create or get portfolio by name
   */
  private static async createOrGetPortfolio(name: string): Promise<{
    success: boolean;
    data?: { id: string };
    created?: boolean;
    error?: string;
  }> {
    try {
      // First, try to find existing portfolio
      const existingPortfolios = await SupabaseService.portfolio.getPortfolios();
      if (existingPortfolios.success && existingPortfolios.data) {
        const existing = existingPortfolios.data.find(p => p.name === name);
        if (existing) {
          console.log(`📁 Using existing portfolio: ${name}`);
          return {
            success: true,
            data: { id: existing.id },
            created: false
          };
        }
      }

      // Create new portfolio
      console.log(`📁 Creating new portfolio: ${name}`);
      
      // Determine currency based on portfolio name
      let currency = 'USD';
      if (name === 'TFSA' || name === 'RSP' || name === 'RRSP') {
        currency = 'CAD'; // Canadian accounts typically use CAD
      }

      const createResult = await SupabaseService.portfolio.createPortfolio(
        name,
        `Auto-created from CSV import`,
        currency
      );

      if (createResult.success && createResult.data) {
        return {
          success: true,
          data: { id: createResult.data.id },
          created: true
        };
      } else {
        return {
          success: false,
          error: createResult.error || 'Failed to create portfolio'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating portfolio'
      };
    }
  }

  /**
   * Import multiple CSV files from the broker_csv directory
   */
  static async importAllCSVFiles(): Promise<ImportResult> {
    const totalStats = {
      portfoliosCreated: 0,
      assetsCreated: 0,
      transactionsCreated: 0,
      transactionsSkipped: 0
    };

    try {
      // This would need to be called from a context where we can access file system
      // For now, this is a placeholder for batch processing functionality
      console.log('📁 Batch CSV import not yet implemented');
      
      return {
        success: false,
        error: 'Batch CSV import not yet implemented',
        stats: totalStats
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during batch import',
        stats: totalStats
      };
    }
  }
}