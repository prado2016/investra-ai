/**
 * Legacy export for backward compatibility
 * This file now re-exports from the PortfolioContext
 * All new code should import directly from contexts/PortfolioContext
 */

export { usePortfolios as useSupabasePortfolios } from '../contexts/PortfolioContext';
export type { Portfolio } from '../lib/database/types';
