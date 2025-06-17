/**
 * Portfolio API Endpoints
 * RESTful API interface for portfolio management operations
 */

import { SupabaseService } from '../supabaseService';
import type { Portfolio } from '../../lib/database/types';
import type { ServiceResponse, ServiceListResponse } from '../supabaseService';

export interface PortfolioCreateRequest {
  name: string;
  description?: string;
  currency?: string;
}

export interface PortfolioUpdateRequest {
  name?: string;
  description?: string;
  currency?: string;
  is_default?: boolean;
}

export interface PortfolioDuplicateRequest {
  newName: string;
  newDescription?: string;
}

/**
 * Portfolio API Class
 * Provides HTTP-like interface for portfolio operations
 */
export class PortfolioAPI {
  /**
   * GET /portfolios - Get all active portfolios for current user
   */
  static async getPortfolios(): Promise<ServiceListResponse<Portfolio>> {
    return await SupabaseService.portfolio.getPortfolios();
  }

  /**
   * GET /portfolios/all - Get all portfolios including archived ones
   */
  static async getAllPortfolios(): Promise<ServiceListResponse<Portfolio>> {
    return await SupabaseService.portfolio.getAllPortfolios();
  }

  /**
   * GET /portfolios/:id - Get portfolio by ID
   */
  static async getPortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    if (!portfolioId) {
      return { data: null, error: 'Portfolio ID is required', success: false };
    }
    return await SupabaseService.portfolio.getPortfolioById(portfolioId);
  }

  /**
   * POST /portfolios - Create new portfolio
   */
  static async createPortfolio(request: PortfolioCreateRequest): Promise<ServiceResponse<Portfolio>> {
    const { name, description = '', currency = 'USD' } = request;
    
    if (!name || name.trim().length === 0) {
      return { data: null, error: 'Portfolio name is required', success: false };
    }

    if (name.length > 100) {
      return { data: null, error: 'Portfolio name must be less than 100 characters', success: false };
    }

    return await SupabaseService.portfolio.createPortfolio(name.trim(), description, currency);
  }

  /**
   * PUT /portfolios/:id - Update portfolio
   */
  static async updatePortfolio(
    portfolioId: string, 
    request: PortfolioUpdateRequest
  ): Promise<ServiceResponse<Portfolio>> {
    if (!portfolioId) {
      return { data: null, error: 'Portfolio ID is required', success: false };
    }

    if (Object.keys(request).length === 0) {
      return { data: null, error: 'At least one field to update is required', success: false };
    }

    if (request.name !== undefined && request.name.trim().length === 0) {
      return { data: null, error: 'Portfolio name cannot be empty', success: false };
    }

    if (request.name !== undefined && request.name.length > 100) {
      return { data: null, error: 'Portfolio name must be less than 100 characters', success: false };
    }

    // Clean up name if provided
    const updates = { ...request };
    if (updates.name) {
      updates.name = updates.name.trim();
    }

    return await SupabaseService.portfolio.updatePortfolio(portfolioId, updates);
  }

  /**
   * PUT /portfolios/:id/default - Set portfolio as default
   */
  static async setDefaultPortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    if (!portfolioId) {
      return { data: null, error: 'Portfolio ID is required', success: false };
    }
    return await SupabaseService.portfolio.setDefaultPortfolio(portfolioId);
  }

  /**
   * PUT /portfolios/:id/archive - Archive portfolio
   */
  static async archivePortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    if (!portfolioId) {
      return { data: null, error: 'Portfolio ID is required', success: false };
    }
    return await SupabaseService.portfolio.archivePortfolio(portfolioId);
  }

  /**
   * PUT /portfolios/:id/restore - Restore archived portfolio
   */
  static async restorePortfolio(portfolioId: string): Promise<ServiceResponse<Portfolio>> {
    if (!portfolioId) {
      return { data: null, error: 'Portfolio ID is required', success: false };
    }
    return await SupabaseService.portfolio.restorePortfolio(portfolioId);
  }

  /**
   * POST /portfolios/:id/duplicate - Duplicate portfolio
   */
  static async duplicatePortfolio(
    portfolioId: string, 
    request: PortfolioDuplicateRequest
  ): Promise<ServiceResponse<Portfolio>> {
    if (!portfolioId) {
      return { data: null, error: 'Portfolio ID is required', success: false };
    }

    const { newName, newDescription } = request;
    
    if (!newName || newName.trim().length === 0) {
      return { data: null, error: 'New portfolio name is required', success: false };
    }

    if (newName.length > 100) {
      return { data: null, error: 'Portfolio name must be less than 100 characters', success: false };
    }

    return await SupabaseService.portfolio.duplicatePortfolio(
      portfolioId, 
      newName.trim(), 
      newDescription
    );
  }

  /**
   * Validate portfolio account type
   */
  static validateAccountType(accountType: string): boolean {
    const validTypes = ['RRSP', 'TFSA', 'RESP', 'Margin', 'Cash', 'LIRA', 'RRIF'];
    return validTypes.includes(accountType);
  }

  /**
   * Get available account types
   */
  static getAccountTypes(): string[] {
    return ['RRSP', 'TFSA', 'RESP', 'Margin', 'Cash', 'LIRA', 'RRIF'];
  }

  /**
   * Get supported currencies
   */
  static getSupportedCurrencies(): string[] {
    return ['USD', 'CAD', 'EUR', 'GBP'];
  }
}

export default PortfolioAPI;
