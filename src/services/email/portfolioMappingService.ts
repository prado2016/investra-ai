/**
 * Portfolio Mapping Service
 * Maps Wealthsimple account types to Investra AI portfolios
 */

import { SupabaseService } from '../supabaseService';
import type { Portfolio } from '../../lib/database/types';
import type { ServiceResponse } from '../supabaseService';

export interface AccountPortfolioMapping {
  wealthsimpleAccountType: string;
  portfolioId: string;
  portfolioName: string;
  autoCreate: boolean;
}

export interface MappingResult {
  portfolioId: string;
  portfolioName: string;
  accountType: string;
  created: boolean;
}

/**
 * Portfolio Mapping Service
 */
export class PortfolioMappingService {
  private static readonly ACCOUNT_TYPE_MAPPINGS: Record<string, {
    defaultName: string;
    description: string;
    currency: string;
    autoCreate: boolean;
  }> = {
    TFSA: {
      defaultName: 'Tax-Free Savings Account',
      description: 'TFSA portfolio for tax-free growth',
      currency: 'CAD',
      autoCreate: true
    },
    RRSP: {
      defaultName: 'Registered Retirement Savings Plan',
      description: 'RRSP portfolio for retirement savings',
      currency: 'CAD',
      autoCreate: true
    },
    RESP: {
      defaultName: 'Registered Education Savings Plan',
      description: 'RESP portfolio for education savings',
      currency: 'CAD',
      autoCreate: true
    },
    Margin: {
      defaultName: 'Margin Account',
      description: 'Non-registered margin account',
      currency: 'CAD',
      autoCreate: true
    },
    Cash: {
      defaultName: 'Cash Account',
      description: 'Non-registered cash account',
      currency: 'CAD',
      autoCreate: true
    },
    LIRA: {
      defaultName: 'Locked-In Retirement Account',
      description: 'LIRA portfolio for locked-in retirement funds',
      currency: 'CAD',
      autoCreate: true
    },
    RRIF: {
      defaultName: 'Registered Retirement Income Fund',
      description: 'RRIF portfolio for retirement income',
      currency: 'CAD',
      autoCreate: true
    }
  };

  /**
   * Get or create portfolio for Wealthsimple account type
   */
  static async getOrCreatePortfolio(
    accountType: string,
    _userId?: string
  ): Promise<ServiceResponse<MappingResult>> {
    try {
      // Normalize account type
      const normalizedType = this.normalizeAccountType(accountType);
      
      if (!normalizedType) {
        return {
          data: null,
          error: `Unknown account type: ${accountType}`,
          success: false
        };
      }

      // First, try to find existing portfolio
      const existingResult = await this.findExistingPortfolio(normalizedType);
      
      if (existingResult.success && existingResult.data) {
        return {
          data: {
            portfolioId: existingResult.data.id,
            portfolioName: existingResult.data.name,
            accountType: normalizedType,
            created: false
          },
          error: null,
          success: true
        };
      }

      // Check if we should auto-create
      const mapping = this.ACCOUNT_TYPE_MAPPINGS[normalizedType];
      if (!mapping.autoCreate) {
        return {
          data: null,
          error: `Portfolio for account type ${normalizedType} must be created manually`,
          success: false
        };
      }

      // Create new portfolio
      const createResult = await this.createPortfolioForAccountType(normalizedType);
      
      if (!createResult.success || !createResult.data) {
        return {
          data: null,
          error: createResult.error || 'Failed to create portfolio',
          success: false
        };
      }

      return {
        data: {
          portfolioId: createResult.data.id,
          portfolioName: createResult.data.name,
          accountType: normalizedType,
          created: true
        },
        error: null,
        success: true
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Find existing portfolio by account type
   */
  private static async findExistingPortfolio(
    accountType: string
  ): Promise<ServiceResponse<Portfolio>> {
    try {
      const portfoliosResult = await SupabaseService.portfolio.getPortfolios();
      
      if (!portfoliosResult.success || !portfoliosResult.data) {
        return {
          data: null,
          error: 'Failed to fetch portfolios',
          success: false
        };
      }

      // Look for portfolio with matching name or description
      const mapping = this.ACCOUNT_TYPE_MAPPINGS[accountType];
      const matchingPortfolio = portfoliosResult.data.find(p => 
        p.name.toLowerCase().includes(accountType.toLowerCase()) ||
        p.name.toLowerCase().includes(mapping.defaultName.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(accountType.toLowerCase()))
      );

      if (matchingPortfolio) {
        return {
          data: matchingPortfolio,
          error: null,
          success: true
        };
      }

      return {
        data: null,
        error: 'No matching portfolio found',
        success: false
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Create new portfolio for account type
   */
  private static async createPortfolioForAccountType(
    accountType: string
  ): Promise<ServiceResponse<Portfolio>> {
    const mapping = this.ACCOUNT_TYPE_MAPPINGS[accountType];
    
    if (!mapping) {
      return {
        data: null,
        error: `No mapping configuration for account type: ${accountType}`,
        success: false
      };
    }

    try {
      const result = await SupabaseService.portfolio.createPortfolio(
        mapping.defaultName,
        mapping.description,
        mapping.currency
      );

      return result;

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Normalize account type from various formats
   */
  private static normalizeAccountType(accountType: string): string | null {
    const normalized = accountType.toUpperCase().trim();
    
    // Direct matches
    if (this.ACCOUNT_TYPE_MAPPINGS[normalized]) {
      return normalized;
    }

    // Common variations
    const variations: Record<string, string> = {
      'TAX-FREE SAVINGS': 'TFSA',
      'TAX FREE SAVINGS': 'TFSA',
      'TFSA ACCOUNT': 'TFSA',
      'REGISTERED RETIREMENT': 'RRSP',
      'RRSP ACCOUNT': 'RRSP',
      'REGISTERED EDUCATION': 'RESP',
      'RESP ACCOUNT': 'RESP',
      'MARGIN ACCOUNT': 'Margin',
      'NON-REGISTERED': 'Margin',
      'CASH ACCOUNT': 'Cash',
      'PERSONAL': 'Cash',
      'LOCKED-IN RETIREMENT': 'LIRA',
      'LIRA ACCOUNT': 'LIRA',
      'RETIREMENT INCOME': 'RRIF',
      'RRIF ACCOUNT': 'RRIF'
    };

    for (const [variation, standard] of Object.entries(variations)) {
      if (normalized.includes(variation)) {
        return standard;
      }
    }

    return null;
  }

  /**
   * Get all account type mappings
   */
  static getAccountTypeMappings(): Record<string, {
    defaultName: string;
    description: string;
    currency: string;
    autoCreate: boolean;
  }> {
    return { ...this.ACCOUNT_TYPE_MAPPINGS };
  }

  /**
   * Get supported account types
   */
  static getSupportedAccountTypes(): string[] {
    return Object.keys(this.ACCOUNT_TYPE_MAPPINGS);
  }

  /**
   * Validate account type
   */
  static isValidAccountType(accountType: string): boolean {
    return this.normalizeAccountType(accountType) !== null;
  }

  /**
   * Get mapping for specific account type
   */
  static getMappingForAccountType(accountType: string): {
    defaultName: string;
    description: string;
    currency: string;
    autoCreate: boolean;
  } | null {
    const normalized = this.normalizeAccountType(accountType);
    return normalized ? this.ACCOUNT_TYPE_MAPPINGS[normalized] : null;
  }

  /**
   * Create custom portfolio mapping
   */
  static async createCustomMapping(
    accountType: string,
    portfolioName: string,
    description: string,
    currency: string = 'CAD'
  ): Promise<ServiceResponse<Portfolio>> {
    try {
      const result = await SupabaseService.portfolio.createPortfolio(
        portfolioName,
        description,
        currency
      );

      if (result.success) {
        console.log(`Created custom portfolio mapping: ${accountType} -> ${portfolioName}`);
      }

      return result;

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Get portfolio statistics by account type
   */
  static async getPortfolioStatsByAccountType(): Promise<ServiceResponse<Record<string, {
    portfolioCount: number;
    accountType: string;
    portfolios: Portfolio[];
  }>>> {
    try {
      const portfoliosResult = await SupabaseService.portfolio.getAllPortfolios();
      
      if (!portfoliosResult.success || !portfoliosResult.data) {
        return {
          data: null,
          error: 'Failed to fetch portfolios',
          success: false
        };
      }

      const stats: Record<string, {
        portfolioCount: number;
        accountType: string;
        portfolios: Portfolio[];
      }> = {};

      // Group portfolios by inferred account type
      for (const portfolio of portfoliosResult.data) {
        const accountType = this.inferAccountTypeFromPortfolio(portfolio);
        
        if (!stats[accountType]) {
          stats[accountType] = {
            portfolioCount: 0,
            accountType,
            portfolios: []
          };
        }

        stats[accountType].portfolioCount++;
        stats[accountType].portfolios.push(portfolio);
      }

      return {
        data: stats,
        error: null,
        success: true
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Infer account type from portfolio
   */
  private static inferAccountTypeFromPortfolio(portfolio: Portfolio): string {
    const name = portfolio.name.toLowerCase();
    const description = (portfolio.description || '').toLowerCase();
    const combined = name + ' ' + description;

    for (const [accountType, mapping] of Object.entries(this.ACCOUNT_TYPE_MAPPINGS)) {
      if (combined.includes(accountType.toLowerCase()) ||
          combined.includes(mapping.defaultName.toLowerCase())) {
        return accountType;
      }
    }

    return 'Unknown';
  }
}

export default PortfolioMappingService;
