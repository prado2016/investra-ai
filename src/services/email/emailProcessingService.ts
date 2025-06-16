/**
 * Email Processing Integration Service
 * Coordinates email parsing with portfolio mapping and transaction creation
 */

import { WealthsimpleEmailParser, type WealthsimpleEmailData } from './wealthsimpleEmailParser';
import { PortfolioMappingService, type MappingResult } from './portfolioMappingService';
import { EnhancedEmailSymbolParser, type EmailSymbolParseResult } from './enhancedEmailSymbolParser';
import { SupabaseService } from '../supabaseService';
import type { Transaction } from '../../lib/database/types';
import type { ServiceResponse } from '../supabaseService';

export interface EmailProcessingResult {
  success: boolean;
  emailParsed: boolean;
  symbolProcessed: boolean;
  portfolioMapped: boolean;
  transactionCreated: boolean;
  transaction?: Transaction;
  emailData?: WealthsimpleEmailData;
  symbolResult?: EmailSymbolParseResult;
  portfolioMapping?: MappingResult;
  errors: string[];
  warnings: string[];
}

export interface ProcessingOptions {
  createMissingPortfolios: boolean;
  skipDuplicateCheck: boolean;
  enhanceSymbols: boolean;
  dryRun: boolean;
  validateOnly: boolean;
}

/**
 * Email Processing Integration Service
 */
export class EmailProcessingService {
  /**
   * Process a complete Wealthsimple email
   */
  static async processEmail(
    subject: string,
    fromEmail: string,
    htmlContent: string,
    textContent?: string,
    options: Partial<ProcessingOptions> = {}
  ): Promise<EmailProcessingResult> {
    const defaultOptions: ProcessingOptions = {
      createMissingPortfolios: true,
      skipDuplicateCheck: false,
      enhanceSymbols: true,
      dryRun: false,
      validateOnly: false
    };

    const opts = { ...defaultOptions, ...options };
    const result: EmailProcessingResult = {
      success: false,
      emailParsed: false,
      symbolProcessed: false,
      portfolioMapped: false,
      transactionCreated: false,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Parse the email
      console.log('📧 Parsing Wealthsimple email...');
      const parseResult = WealthsimpleEmailParser.parseEmail(
        subject,
        fromEmail,
        htmlContent,
        textContent
      );

      if (!parseResult.success || !parseResult.data) {
        result.errors.push(`Email parsing failed: ${parseResult.error}`);
        if (parseResult.warnings) {
          result.warnings.push(...parseResult.warnings);
        }
        return result;
      }

      result.emailParsed = true;
      result.emailData = parseResult.data;
      
      if (parseResult.warnings) {
        result.warnings.push(...parseResult.warnings);
      }

      console.log(`✅ Email parsed: ${parseResult.data.symbol} ${parseResult.data.transactionType} ${parseResult.data.quantity}`);

      // Validate parsed data
      const validation = WealthsimpleEmailParser.validateParsedData(parseResult.data);
      if (!validation.isValid) {
        result.errors.push(`Parsed data validation failed: ${validation.errors.join(', ')}`);
        return result;
      }

      // Stop here if validation only
      if (opts.validateOnly) {
        result.success = true;
        return result;
      }

      // Step 2: Process symbol with AI enhancement (if enabled)
      let symbolResult: EmailSymbolParseResult | undefined;
      
      if (opts.enhanceSymbols) {
        console.log('🤖 Processing symbol with AI enhancement...');
        try {
          symbolResult = await EnhancedEmailSymbolParser.processEmailSymbol(parseResult.data);
          result.symbolProcessed = true;
          result.symbolResult = symbolResult;
          
          const symbolValidation = EnhancedEmailSymbolParser.validateSymbolResult(symbolResult);
          if (!symbolValidation.isValid) {
            result.warnings.push(`Symbol processing warnings: ${symbolValidation.errors.join(', ')}`);
          }
          
          console.log(`✅ Symbol processed: ${symbolResult.symbol} -> ${symbolResult.normalizedSymbol} (${symbolResult.source}, confidence: ${symbolResult.confidence.toFixed(2)})`);
          
          if (symbolResult.warnings && symbolResult.warnings.length > 0) {
            result.warnings.push(...symbolResult.warnings);
          }
        } catch (error) {
          result.warnings.push(`Symbol enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.log('⚠️ Symbol enhancement failed, continuing with original symbol');
        }
      }

      // Step 3: Map to portfolio
      console.log('🏦 Mapping to portfolio...');
      let portfolioResult: ServiceResponse<MappingResult>;
      
      if (opts.createMissingPortfolios) {
        portfolioResult = await PortfolioMappingService.getOrCreatePortfolio(
          parseResult.data.accountType
        );
      } else {
        // Try to find existing portfolio only
        portfolioResult = await PortfolioMappingService.getOrCreatePortfolio(
          parseResult.data.accountType
        );
        if (portfolioResult.success && portfolioResult.data?.created) {
          result.errors.push(`Portfolio for ${parseResult.data.accountType} does not exist and auto-creation is disabled`);
          return result;
        }
      }

      if (!portfolioResult.success || !portfolioResult.data) {
        result.errors.push(`Portfolio mapping failed: ${portfolioResult.error}`);
        return result;
      }

      result.portfolioMapped = true;
      result.portfolioMapping = portfolioResult.data;

      console.log(`✅ Portfolio mapped: ${portfolioResult.data.portfolioName} (${portfolioResult.data.created ? 'created' : 'existing'})`);

      // Stop here if dry run
      if (opts.dryRun) {
        result.success = true;
        console.log('🧪 Dry run mode - stopping before transaction creation');
        return result;
      }

      // Step 4: Check for duplicates (unless skipped)
      if (!opts.skipDuplicateCheck) {
        console.log('🔍 Checking for duplicate transactions...');
        const isDuplicate = await this.checkForDuplicate(
          portfolioResult.data.portfolioId,
          parseResult.data
        );

        if (isDuplicate) {
          result.warnings.push('Potential duplicate transaction detected');
          console.log('⚠️ Potential duplicate transaction detected');
        }
      }

      // Step 5: Create transaction
      console.log('💰 Creating transaction...');
      const transactionResult = await this.createTransaction(
        portfolioResult.data.portfolioId,
        parseResult.data,
        symbolResult
      );

      if (!transactionResult.success || !transactionResult.data) {
        result.errors.push(`Transaction creation failed: ${transactionResult.error}`);
        return result;
      }

      result.transactionCreated = true;
      result.transaction = transactionResult.data;
      result.success = true;

      console.log(`✅ Transaction created: ${transactionResult.data.id}`);
      console.log('🎉 Email processing completed successfully!');

      return result;

    } catch (error) {
      result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Email processing failed:', error);
      return result;
    }
  }

  /**
   * Check for potential duplicate transactions
   */
  private static async checkForDuplicate(
    portfolioId: string,
    emailData: WealthsimpleEmailData
  ): Promise<boolean> {
    try {
      // Get recent transactions for the portfolio
      const transactionsResult = await SupabaseService.transaction.getTransactions(portfolioId);
      
      if (!transactionsResult.success || !transactionsResult.data) {
        return false; // If we can't check, assume not duplicate
      }

      // Look for transactions with same symbol, type, quantity, and similar date
      const emailDate = new Date(emailData.transactionDate);
      const oneDayBefore = new Date(emailDate.getTime() - 24 * 60 * 60 * 1000);
      const oneDayAfter = new Date(emailDate.getTime() + 24 * 60 * 60 * 1000);

      const potentialDuplicates = transactionsResult.data.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_date);
        
        return (
          transaction.asset?.symbol === emailData.symbol &&
          transaction.transaction_type === emailData.transactionType &&
          Math.abs(transaction.quantity - emailData.quantity) < 0.01 &&
          Math.abs(transaction.price - emailData.price) < 0.01 &&
          transactionDate >= oneDayBefore &&
          transactionDate <= oneDayAfter
        );
      });

      return potentialDuplicates.length > 0;

    } catch (error) {
      console.warn('Error checking for duplicates:', error);
      return false;
    }
  }

  /**
   * Create transaction from email data
   */
  private static async createTransaction(
    portfolioId: string,
    emailData: WealthsimpleEmailData,
    symbolResult?: EmailSymbolParseResult
  ): Promise<ServiceResponse<Transaction>> {
    try {
      // Use enhanced symbol if available, otherwise fall back to email symbol
      const symbolToUse = symbolResult?.normalizedSymbol || emailData.symbol;
      
      // First, get or create the asset
      const assetResult = await SupabaseService.asset.getOrCreateAsset(symbolToUse);
      
      if (!assetResult.success || !assetResult.data) {
        return {
          data: null,
          error: `Failed to get or create asset: ${assetResult.error}`,
          success: false
        };
      }

      console.log(`📊 Asset resolved: ${symbolToUse} -> ${assetResult.data.id} (${assetResult.data.asset_type})`);

      // Map transaction types
      const transactionTypeMap: Record<string, any> = {
        'buy': 'buy',
        'sell': 'sell',
        'dividend': 'dividend',
        'option_expired': 'option_expired'
      };

      const mappedType = transactionTypeMap[emailData.transactionType];
      if (!mappedType) {
        return {
          data: null,
          error: `Unsupported transaction type: ${emailData.transactionType}`,
          success: false
        };
      }

      // Create the transaction
      const transactionResult = await SupabaseService.transaction.createTransaction(
        portfolioId,
        assetResult.data.id,
        mappedType,
        emailData.quantity,
        emailData.price,
        emailData.transactionDate
      );

      if (transactionResult.success && symbolResult) {
        console.log(`🤖 Used enhanced symbol processing: ${emailData.symbol} -> ${symbolResult.normalizedSymbol} (${symbolResult.source})`);
      }

      return transactionResult;

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Process multiple emails in batch
   */
  static async processBatchEmails(
    emails: Array<{
      subject: string;
      fromEmail: string;
      htmlContent: string;
      textContent?: string;
    }>,
    options: Partial<ProcessingOptions> = {}
  ): Promise<EmailProcessingResult[]> {
    const results: EmailProcessingResult[] = [];

    console.log(`📬 Processing batch of ${emails.length} emails...`);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      console.log(`\n📧 Processing email ${i + 1}/${emails.length}: ${email.subject}`);
      
      const result = await this.processEmail(
        email.subject,
        email.fromEmail,
        email.htmlContent,
        email.textContent,
        options
      );

      results.push(result);

      // Add delay between emails to avoid rate limiting
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Print batch summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Batch processing complete:`);
    console.log(`  Successful: ${successful}/${emails.length}`);
    console.log(`  Failed: ${failed}/${emails.length}`);
    
    if (failed > 0) {
      console.log(`\n❌ Failed emails:`);
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.errors.join(', ')}`);
      });
    }

    return results;
  }

  /**
   * Get processing statistics
   */
  static getProcessingStats(results: EmailProcessingResult[]): {
    total: number;
    successful: number;
    failed: number;
    emailsParsed: number;
    symbolsProcessed: number;
    portfoliosMapped: number;
    transactionsCreated: number;
    newPortfoliosCreated: number;
    duplicatesDetected: number;
    symbolEnhancementStats: {
      direct: number;
      aiEnhanced: number;
      aiFallback: number;
      averageConfidence: number;
    };
  } {
    const symbolProcessedResults = results.filter(r => r.symbolProcessed && r.symbolResult);
    
    const symbolStats = {
      direct: symbolProcessedResults.filter(r => r.symbolResult?.source === 'email-direct').length,
      aiEnhanced: symbolProcessedResults.filter(r => r.symbolResult?.source === 'email-ai-enhanced').length,
      aiFallback: symbolProcessedResults.filter(r => r.symbolResult?.source === 'ai-fallback').length,
      averageConfidence: symbolProcessedResults.length > 0 
        ? symbolProcessedResults.reduce((sum, r) => sum + (r.symbolResult?.confidence || 0), 0) / symbolProcessedResults.length
        : 0
    };

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      emailsParsed: results.filter(r => r.emailParsed).length,
      symbolsProcessed: results.filter(r => r.symbolProcessed).length,
      portfoliosMapped: results.filter(r => r.portfolioMapped).length,
      transactionsCreated: results.filter(r => r.transactionCreated).length,
      newPortfoliosCreated: results.filter(r => r.portfolioMapping?.created).length,
      duplicatesDetected: results.filter(r => 
        r.warnings.some(w => w.includes('duplicate'))
      ).length,
      symbolEnhancementStats: symbolStats
    };
  }

  /**
   * Validate email processing configuration
   */
  static async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test database connection
      const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
      if (!portfoliosResult.success) {
        errors.push('Cannot connect to portfolio service');
      }

      // Test portfolio mapping
      const accountTypes = PortfolioMappingService.getSupportedAccountTypes();
      if (accountTypes.length === 0) {
        warnings.push('No account type mappings configured');
      }

      // Test asset service
      const testAssetResult = await SupabaseService.asset.getOrCreateAsset('TEST');
      if (!testAssetResult.success) {
        errors.push('Cannot connect to asset service');
      }

      // Test AI symbol processing
      try {
        const testSymbolResult = await EnhancedEmailSymbolParser.processEmailSymbol({
          symbol: 'AAPL',
          transactionType: 'buy',
          quantity: 100,
          price: 150,
          totalAmount: 15000,
          accountType: 'TFSA',
          transactionDate: '2025-01-15',
          timezone: 'EST',
          currency: 'USD',
          subject: 'Test',
          fromEmail: 'test@wealthsimple.com',
          rawContent: 'Test content',
          confidence: 0.9,
          parseMethod: 'TEST'
        });
        
        if (testSymbolResult.confidence < 0.5) {
          warnings.push('AI symbol processing confidence is low');
        }
      } catch (error) {
        warnings.push('AI symbol processing test failed');
      }

    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default EmailProcessingService;
