import type { Transaction, FundMovement, Asset } from './portfolio';

export type UnifiedEntryType = 'transaction' | 'fund_movement';

export interface UnifiedEntryCommon {
  id: string;
  portfolioId: string;
  date: Date;
  amount: number; // For transactions: totalAmount; for fund movements: amount
  currency: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedTransactionEntry extends UnifiedEntryCommon {
  type: 'transaction';
  transactionType: Transaction['type']; // Renamed to avoid conflict with UnifiedEntryType
  assetId: string;
  assetSymbol: string;
  assetType: Asset['asset_type'];
  quantity: number;
  price: number;
  fees?: number;
  strategyType?: Transaction['strategyType'];
  brokerName?: string;
  externalId?: string;
  settlementDate?: string;
  asset?: Asset; // Include asset details for display
}

export interface UnifiedFundMovementEntry extends UnifiedEntryCommon {
  type: 'fund_movement';
  fundMovementType: FundMovement['type']; // Renamed to avoid conflict with UnifiedEntryType
  status: FundMovement['status'];
  originalAmount?: number;
  originalCurrency?: string;
  convertedAmount?: number;
  convertedCurrency?: string;
  exchangeRate?: number;
  exchangeFees?: number;
  account?: string;
  fromAccount?: string;
  toAccount?: string;
}

export type UnifiedEntry = UnifiedTransactionEntry | UnifiedFundMovementEntry;
