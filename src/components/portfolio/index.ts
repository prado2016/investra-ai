/**
 * Portfolio Components Export Index
 * Task 8: Portfolio Management Frontend components
 * Central export point for all portfolio-related UI components
 */

// Portfolio selector and management
export { default as PortfolioSelector } from '../PortfolioSelector';
export { default as PortfolioManagementModal } from '../PortfolioManagementModal';
export { default as PortfolioCreationForm } from '../PortfolioCreationForm';

// Portfolio-aware components
export { default as PortfolioTransactionList } from '../PortfolioTransactionList';
export { default as PortfolioDashboard } from '../PortfolioDashboard';

// Types
export type { PortfolioTransactionWithAsset } from '../PortfolioTransactionList';