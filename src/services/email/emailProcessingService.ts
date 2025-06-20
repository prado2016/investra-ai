/**
 * Email Processing Integration Service
 * Coordinates email parsing with portfolio mapping and transaction creation
 */

import { WealthsimpleEmailParser, type WealthsimpleEmailData } from './wealthsimpleEmailParser';
import { PortfolioMappingService, type MappingResult } from './portfolioMappingService';
import { EnhancedEmailSymbolParser, type EmailSymbolParseResult } from './enhancedEmailSymbolParser';
import { SupabaseService } from '../supabaseService';
import { EmailConfigurationService } from '../emailConfigurationService';
import { emailProcessingMonitor } from '../monitoring/emailProcessingMonitor';
import { ManualReviewQueue } from './manualReviewQueue';
import type { Transaction } from '../../lib/database/types';
import type { ServiceResponse } from '../supabaseService';

// Development-only logging utility
const devLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message);
  }
};

export interface EmailProcessingResult {
  success: boolean;
  emailParsed: boolean;
  symbolProcessed: boolean;
  portfolioMapped: boolean;
  transactionCreated: boolean;
  queuedForReview: boolean; // New field to track manual review queue
  transaction?: Transaction;
  reviewQueueId?: string; // ID of the manual review queue item
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
  configId?: string; // Email configuration ID for auto-insert setting
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
    const processingStartTime = Date.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Record email received event
    emailProcessingMonitor.recordEvent({
      type: 'email_received',
      email: {
        subject,
        fromEmail,
        messageId
      }
    });
    
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
      queuedForReview: false,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Parse the email
      const parseStartTime = Date.now();
      devLog('📧 Parsing Wealthsimple email...');
      
      // Record parsing started event
      emailProcessingMonitor.recordEvent({
        type: 'parsing_started',
        email: {
          subject,
          fromEmail,
          messageId
        }
      });
      
      const parseResult = WealthsimpleEmailParser.parseEmail(
        subject,
        fromEmail,
        htmlContent,
        textContent
      );

      const parseTime = Date.now() - parseStartTime;

      if (!parseResult.success || !parseResult.data) {
        result.errors.push(`Email parsing failed: ${parseResult.error}`);
        if (parseResult.warnings) {
          result.warnings.push(...parseResult.warnings);
        }
        
        // Record parsing failure
        emailProcessingMonitor.recordEvent({
          type: 'processing_failed',
          email: {
            subject,
            fromEmail,
            messageId
          },
          metrics: {
            processingTime: parseTime,
            stage: 'parsing'
          },
          error: {
            message: parseResult.error || 'Unknown parsing error',
            code: 'PARSING_FAILED'
          }
        });
        
        return result;
      }

      result.emailParsed = true;
      result.emailData = parseResult.data;
      
      if (parseResult.warnings) {
        result.warnings.push(...parseResult.warnings);
      }

      devLog(`✅ Email parsed: ${parseResult.data.symbol} ${parseResult.data.transactionType} ${parseResult.data.quantity}`);

      // Record successful parsing
      emailProcessingMonitor.recordEvent({
        type: 'parsing_completed',
        email: {
          subject,
          fromEmail,
          messageId
        },
        metrics: {
          processingTime: parseTime,
          confidence: parseResult.data.confidence,
          stage: 'parsing'
        },
        result: {
          success: true
        }
      });

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
        devLog('🤖 Processing symbol with AI enhancement...');
        try {
          symbolResult = await EnhancedEmailSymbolParser.processEmailSymbol(parseResult.data);
          result.symbolProcessed = true;
          result.symbolResult = symbolResult;
          
          const symbolValidation = EnhancedEmailSymbolParser.validateSymbolResult(symbolResult);
          if (!symbolValidation.isValid) {
            result.warnings.push(`Symbol processing warnings: ${symbolValidation.errors.join(', ')}`);
          }
          
          devLog(`✅ Symbol processed: ${symbolResult.symbol} -> ${symbolResult.normalizedSymbol} (${symbolResult.source}, confidence: ${symbolResult.confidence.toFixed(2)})`);
          
          if (symbolResult.warnings && symbolResult.warnings.length > 0) {
            result.warnings.push(...symbolResult.warnings);
          }
        } catch (error) {
          result.warnings.push(`Symbol enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          devLog('⚠️ Symbol enhancement failed, continuing with original symbol');
        }
      }

      // Step 3: Map to portfolio
      devLog('🏦 Mapping to portfolio...');
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

      devLog(`✅ Portfolio mapped: ${portfolioResult.data.portfolioName} (${portfolioResult.data.created ? 'created' : 'existing'})`);

      // Stop here if dry run
      if (opts.dryRun) {
        result.success = true;
        devLog('🧪 Dry run mode - stopping before transaction creation');
        return result;
      }

      // Step 4: Check for duplicates (unless skipped)
      if (!opts.skipDuplicateCheck) {
        devLog('🔍 Checking for duplicate transactions...');
        const isDuplicate = await this.checkForDuplicate(
          portfolioResult.data.portfolioId,
          parseResult.data
        );

        if (isDuplicate) {
          result.warnings.push('Potential duplicate transaction detected');
          devLog('⚠️ Potential duplicate transaction detected');
        }
      }

      // Step 5: Check auto-insert setting and create transaction or queue for review
      devLog('🔄 Checking auto-insert setting...');

      let autoInsertEnabled = true; // Default to true

      // Check auto-insert setting if configId is provided
      if (opts.configId) {
        try {
          const autoInsertResult = await EmailConfigurationService.getAutoInsertSetting(opts.configId);
          if (autoInsertResult.success && autoInsertResult.data !== null) {
            autoInsertEnabled = autoInsertResult.data;
            devLog(`📊 Auto-insert setting: ${autoInsertEnabled ? 'ENABLED' : 'DISABLED'}`);
          } else {
            devLog('⚠️ Could not retrieve auto-insert setting, defaulting to enabled');
          }
        } catch (error) {
          devLog(`⚠️ Error checking auto-insert setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        devLog('📊 No configId provided, defaulting to auto-insert enabled');
      }

      if (autoInsertEnabled) {
        // Auto-insert enabled: Create transaction directly
        devLog('💰 Auto-insert enabled - Creating transaction...');
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

        devLog(`✅ Transaction created: ${transactionResult.data.id}`);
        devLog('🎉 Email processing completed successfully with auto-insert!');

        // Record successful transaction creation
        emailProcessingMonitor.recordEvent({
          type: 'transaction_created',
          email: {
            subject,
            fromEmail,
            messageId
          },
          metrics: {
            processingTime: Date.now() - processingStartTime,
            stage: 'transaction_creation'
          },
          result: {
            success: true,
            transactionId: transactionResult.data.id
          }
        });

      } else {
        // Auto-insert disabled: Queue for manual review
        devLog('📋 Auto-insert disabled - Queuing for manual review...');

        try {
          // Create a mock email identification for the review queue
          const emailIdentification = {
            messageId,
            subject,
            fromEmail,
            receivedAt: new Date().toISOString(),
            source: 'email_processing'
          };

          // Create a mock duplicate detection result (no duplicates for now)
          const duplicateDetectionResult = {
            isDuplicate: false,
            confidence: 0.0,
            duplicateCount: 0,
            potentialDuplicates: [],
            overallConfidence: parseResult.data.confidence,
            recommendation: 'review' as const
          };

          // Add to manual review queue
          const queueItem = await ManualReviewQueue.addToQueue(
            parseResult.data,
            emailIdentification,
            duplicateDetectionResult,
            portfolioResult.data.portfolioId
          );

          result.queuedForReview = true;
          result.reviewQueueId = queueItem.id;
          result.success = true;

          devLog(`✅ Email queued for manual review: ${queueItem.id}`);
          devLog('🎉 Email processing completed - queued for manual review!');

          // Record successful queuing for review
          emailProcessingMonitor.recordEvent({
            type: 'queued_for_review',
            email: {
              subject,
              fromEmail,
              messageId
            },
            metrics: {
              processingTime: Date.now() - processingStartTime,
              stage: 'manual_review_queue'
            },
            result: {
              success: true,
              queueId: queueItem.id
            }
          });

        } catch (error) {
          result.errors.push(`Failed to queue for manual review: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return result;
        }
      }

      return result;

    } catch (error) {
      result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Email processing failed:', error);

      // Record unexpected error
      emailProcessingMonitor.recordEvent({
        type: 'processing_failed',
        email: {
          subject,
          fromEmail,
          messageId
        },
        metrics: {
          processingTime: Date.now() - processingStartTime,
          stage: 'parsing' as const
        },
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'UNKNOWN_ERROR'
        }
      });

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

      devLog(`📊 Asset resolved: ${symbolToUse} -> ${assetResult.data.id} (${assetResult.data.asset_type})`);

      // Map transaction types
      const transactionTypeMap: Record<string, 'buy' | 'sell' | 'dividend' | 'option_expired'> = {
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
        devLog(`🤖 Used enhanced symbol processing: ${emailData.symbol} -> ${symbolResult.normalizedSymbol} (${symbolResult.source})`);
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

    devLog(`📬 Processing batch of ${emails.length} emails...`);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      devLog(`\n📧 Processing email ${i + 1}/${emails.length}: ${email.subject}`);
      
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
    
    devLog(`\n📊 Batch processing complete:`);
    devLog(`  Successful: ${successful}/${emails.length}`);
    devLog(`  Failed: ${failed}/${emails.length}`);
    
    if (failed > 0) {
      devLog(`\n❌ Failed emails:`);
      results.filter(r => !r.success).forEach((r, i) => {
        devLog(`  ${i + 1}. ${r.errors.join(', ')}`);
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
      } catch {
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
