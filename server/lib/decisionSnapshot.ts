import { createHash } from 'crypto';
import { positionQueries } from '../db/queries/positions.js';
import { transactionQueries } from '../db/queries/transactions.js';
import type { PortfolioScope } from './portfolioScope.js';

const DECISION_REQUEST_SCHEMA_VERSION = '1.0';
const SNAPSHOT_TRANSACTION_LIMIT = 200;

export interface DecisionSnapshotAccount {
  account_id: string;
  account_name: string;
  account_type: 'master' | 'child';
  parent_account_id: string | null;
  currency: string;
}

export interface DecisionSnapshotPosition {
  portfolio_id: string;
  account_id: string;
  asset_id: string;
  symbol: string;
  asset_type: string;
  quantity: number;
  avg_cost_basis: number;
  market_value: number | null;
  unrealized_pl: number | null;
  strike_price: number | null;
  expiration_date: string | null;
  option_type: 'call' | 'put' | null;
}

export interface DecisionSnapshotTransaction {
  id: string;
  account_id: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  fees: number;
  trade_date: string;
  source: string;
}

export interface PortfolioReviewRequestPayload {
  schema_version: string;
  portfolio_id: string;
  portfolio_name: string;
  as_of: string;
  base_currency: string;
  requested_by_user_id: string;
  requested_by_user_email: string;
  accounts: DecisionSnapshotAccount[];
  positions: DecisionSnapshotPosition[];
  recent_transactions: DecisionSnapshotTransaction[];
  constraints: {
    mode: 'read_only';
    allow_trade_execution: false;
  };
}

export interface BuildDecisionSnapshotResult {
  snapshot: PortfolioReviewRequestPayload;
  snapshotJson: string;
  snapshotHash: string;
}

export function stableStringify(value: unknown) {
  return JSON.stringify(value);
}

export function hashSnapshot(snapshotJson: string) {
  return createHash('sha256').update(snapshotJson).digest('hex');
}

export async function buildDecisionSnapshot(params: {
  user: { id: string; email: string };
  scope: PortfolioScope;
}): Promise<BuildDecisionSnapshotResult> {
  const { user, scope } = params;

  const accounts: DecisionSnapshotAccount[] = [
    {
      account_id: scope.portfolio.id,
      account_name: scope.portfolio.name,
      account_type: 'master',
      parent_account_id: null,
      currency: scope.portfolio.currency,
    },
    ...scope.childPortfolios
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((account) => ({
        account_id: account.id,
        account_name: account.name,
        account_type: 'child' as const,
        parent_account_id: account.parentPortfolioId ?? null,
        currency: account.currency,
      })),
  ];

  const positions = (await positionQueries.listByPortfolioIds(scope.portfolioIds))
    .slice()
    .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.portfolioId.localeCompare(b.portfolioId))
    .map((position) => ({
      portfolio_id: scope.portfolio.id,
      account_id: position.portfolioId,
      asset_id: position.assetId,
      symbol: position.symbol,
      asset_type: position.assetType,
      quantity: position.quantity,
      avg_cost_basis: position.avgCostBasis,
      market_value: null,
      unrealized_pl: null,
      strike_price: null,
      expiration_date: null,
      option_type: null,
    }));

  const recentTransactions = (await transactionQueries.listByPortfolioIds(scope.portfolioIds))
    .slice(0, SNAPSHOT_TRANSACTION_LIMIT)
    .map((transaction) => ({
      id: transaction.id,
      account_id: transaction.portfolioId,
      symbol: transaction.symbol,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      fees: transaction.fees,
      trade_date: transaction.date,
      source: transaction.source,
    }));

  const snapshot: PortfolioReviewRequestPayload = {
    schema_version: DECISION_REQUEST_SCHEMA_VERSION,
    portfolio_id: scope.portfolio.id,
    portfolio_name: scope.portfolio.name,
    as_of: new Date().toISOString(),
    base_currency: scope.portfolio.currency,
    requested_by_user_id: user.id,
    requested_by_user_email: user.email,
    accounts,
    positions,
    recent_transactions: recentTransactions,
    constraints: {
      mode: 'read_only',
      allow_trade_execution: false,
    },
  };

  const snapshotJson = stableStringify(snapshot);

  return {
    snapshot,
    snapshotJson,
    snapshotHash: hashSnapshot(snapshotJson),
  };
}
