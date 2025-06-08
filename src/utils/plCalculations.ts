/**
 * P&L Calculation Engine
 * Handles profit/loss calculations for both realized and unrealized gains
 */

import type { Transaction, Position } from '../types/portfolio';

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE';

export interface PLCalculationOptions {
  costBasisMethod?: CostBasisMethod;
  baseCurrency?: string;
  includeTaxImplications?: boolean;
}

export interface PLCalculationResult {
  realizedPL: number;
  unrealizedPL: number;
  totalPL: number;
  dividendIncome: number;
  totalFees: number;
  tradingVolume: number;
  netCashFlow: number;
}

export interface PositionPL {
  positionId: string;
  symbol: string;
  assetType: string;
  quantity: number;
  averageCostBasis: number;
  currentPrice: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
}

export interface TaxImplication {
  shortTermGains: number;
  longTermGains: number;
  totalTaxableGains: number;
  estimatedTaxLiability: number;
}

export interface EnhancedPLResult extends PLCalculationResult {
  taxImplications?: TaxImplication;
  currencyBreakdown?: Record<string, number>;
  annualizedReturn?: number;
}

/**
 * Calculate realized P&L from a list of transactions (legacy function - uses FIFO)
 */
export function calculateRealizedPL(transactions: Transaction[]): number {
  return calculateRealizedPLWithMethod(transactions, { costBasisMethod: 'FIFO' });
}

/**
 * Calculate unrealized P&L from current positions
 */
export function calculateUnrealizedPL(positions: Position[]): number {
  return positions.reduce((total, position) => {
    return total + (position.unrealizedPL || 0);
  }, 0);
}

/**
 * Calculate dividend income from transactions
 */
export function calculateDividendIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'dividend')
    .reduce((total, t) => total + t.totalAmount, 0);
}

/**
 * Calculate total fees paid
 */
export function calculateTotalFees(transactions: Transaction[]): number {
  return transactions.reduce((total, t) => total + (t.fees || 0), 0);
}

/**
 * Calculate trading volume (buy + sell amounts)
 */
export function calculateTradingVolume(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'buy' || t.type === 'sell')
    .reduce((total, t) => total + t.totalAmount, 0);
}

/**
 * Calculate net cash flow (money out - money in)
 */
export function calculateNetCashFlow(transactions: Transaction[]): number {
  let cashOut = 0;
  let cashIn = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'buy') {
      cashOut += transaction.totalAmount;
    } else if (transaction.type === 'sell' || transaction.type === 'dividend') {
      cashIn += transaction.totalAmount;
    }
  });

  return cashIn - cashOut;
}

/**
 * Calculate comprehensive P&L for a given period with enhanced options
 */
export function calculateEnhancedPLForPeriod(
  transactions: Transaction[], 
  positions: Position[],
  options: PLCalculationOptions = {}
): EnhancedPLResult {
  const { includeTaxImplications = false } = options;
  
  const realizedPL = calculateRealizedPLWithMethod(transactions, options);
  const unrealizedPL = calculateUnrealizedPL(positions);
  const dividendIncome = calculateDividendIncome(transactions);
  const totalFees = calculateTotalFees(transactions);
  const tradingVolume = calculateTradingVolume(transactions);
  const netCashFlow = calculateNetCashFlow(transactions);

  const result: EnhancedPLResult = {
    realizedPL,
    unrealizedPL,
    totalPL: realizedPL + unrealizedPL + dividendIncome,
    dividendIncome,
    totalFees,
    tradingVolume,
    netCashFlow
  };

  // Add tax implications if requested
  if (includeTaxImplications) {
    result.taxImplications = calculateTaxImplications(transactions, options);
  }

  // Calculate annualized return if we have transaction history
  if (transactions.length > 0) {
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sortedTransactions[0].date);
    const endDate = new Date();
    const initialInvestment = Math.abs(netCashFlow);
    const currentValue = initialInvestment + result.totalPL;
    
    result.annualizedReturn = calculateAnnualizedReturn(initialInvestment, currentValue, startDate, endDate);
  }

  return result;
}

/**
 * Calculate comprehensive P&L for a given period (backward compatibility)
 */
export function calculatePLForPeriod(
  transactions: Transaction[], 
  positions: Position[]
): PLCalculationResult {
  const enhanced = calculateEnhancedPLForPeriod(transactions, positions);
  return {
    realizedPL: enhanced.realizedPL,
    unrealizedPL: enhanced.unrealizedPL,
    totalPL: enhanced.totalPL,
    dividendIncome: enhanced.dividendIncome,
    totalFees: enhanced.totalFees,
    tradingVolume: enhanced.tradingVolume,
    netCashFlow: enhanced.netCashFlow
  };
}

/**
 * Calculate P&L for individual positions
 */
export function calculatePositionPL(
  position: Position,
  transactions: Transaction[],
  currentPrice: number
): PositionPL {
  // Filter transactions for this position
  const positionTransactions = transactions.filter(t => 
    t.assetSymbol === position.assetSymbol && t.assetType === position.assetType
  );

  const realizedPL = calculateRealizedPL(positionTransactions);
  const unrealizedPL = position.quantity * (currentPrice - position.averageCostBasis);
  const unrealizedPLPercent = (unrealizedPL / (position.averageCostBasis * position.quantity)) * 100;
  const totalReturn = realizedPL + unrealizedPL;
  const totalCost = position.averageCostBasis * position.quantity;
  const totalReturnPercent = (totalReturn / totalCost) * 100;

  return {
    positionId: position.id,
    symbol: position.assetSymbol,
    assetType: position.assetType,
    quantity: position.quantity,
    averageCostBasis: position.averageCostBasis,
    currentPrice,
    unrealizedPL,
    unrealizedPLPercent,
    realizedPL,
    totalReturn,
    totalReturnPercent
  };
}

/**
 * Calculate daily P&L change
 */
export function calculateDailyPLChange(
  transactions: Transaction[],
  positions: Position[],
  date: Date
): PLCalculationResult {
  // Filter transactions for the specific date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const dayTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startOfDay && transactionDate <= endOfDay;
  });

  return calculatePLForPeriod(dayTransactions, positions);
}

/**
 * Format P&L with appropriate color coding
 */
export function formatPLWithColor(amount: number): { value: string; isPositive: boolean; isNegative: boolean } {
  return {
    value: Math.abs(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    }),
    isPositive: amount > 0,
    isNegative: amount < 0
  };
}

/**
 * Calculate realized P&L with different cost basis methods
 */
export function calculateRealizedPLWithMethod(
  transactions: Transaction[], 
  options: PLCalculationOptions = {}
): number {
  const { costBasisMethod = 'FIFO' } = options;
  
  // Group transactions by asset
  const assetTransactions = new Map<string, Transaction[]>();
  
  transactions.forEach(transaction => {
    const key = `${transaction.assetSymbol}_${transaction.assetType}`;
    if (!assetTransactions.has(key)) {
      assetTransactions.set(key, []);
    }
    assetTransactions.get(key)!.push(transaction);
  });

  let totalRealizedPL = 0;

  // Calculate realized P&L for each asset using specified method
  assetTransactions.forEach((assetTxns) => {
    totalRealizedPL += calculateAssetRealizedPL(assetTxns, costBasisMethod);
  });

  return totalRealizedPL;
}

/**
 * Calculate realized P&L for a specific asset using different cost basis methods
 */
function calculateAssetRealizedPL(transactions: Transaction[], method: CostBasisMethod): number {
  const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  switch (method) {
    case 'FIFO':
      return calculateFIFORealizedPL(sortedTransactions);
    case 'LIFO':
      return calculateLIFORealizedPL(sortedTransactions);
    case 'AVERAGE':
      return calculateAverageRealizedPL(sortedTransactions);
    default:
      return calculateFIFORealizedPL(sortedTransactions);
  }
}

/**
 * FIFO (First In, First Out) cost basis calculation
 */
function calculateFIFORealizedPL(transactions: Transaction[]): number {
  const buyQueue: { quantity: number; price: number; fees: number; date: Date }[] = [];
  let realizedPL = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'buy') {
      buyQueue.push({
        quantity: transaction.quantity,
        price: transaction.price,
        fees: transaction.fees || 0,
        date: transaction.date
      });
    } else if (transaction.type === 'sell') {
      let remainingToSell = transaction.quantity;
      const sellProceeds = transaction.totalAmount - (transaction.fees || 0);
      let costBasis = 0;

      while (remainingToSell > 0 && buyQueue.length > 0) {
        const oldestBuy = buyQueue[0];
        const quantityToUse = Math.min(remainingToSell, oldestBuy.quantity);
        
        costBasis += quantityToUse * oldestBuy.price + (oldestBuy.fees * quantityToUse / oldestBuy.quantity);
        
        oldestBuy.quantity -= quantityToUse;
        remainingToSell -= quantityToUse;
        
        if (oldestBuy.quantity === 0) {
          buyQueue.shift();
        }
      }

      realizedPL += sellProceeds - costBasis;
    }
  });

  return realizedPL;
}

/**
 * LIFO (Last In, First Out) cost basis calculation
 */
function calculateLIFORealizedPL(transactions: Transaction[]): number {
  const buyStack: { quantity: number; price: number; fees: number; date: Date }[] = [];
  let realizedPL = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'buy') {
      buyStack.push({
        quantity: transaction.quantity,
        price: transaction.price,
        fees: transaction.fees || 0,
        date: transaction.date
      });
    } else if (transaction.type === 'sell') {
      let remainingToSell = transaction.quantity;
      const sellProceeds = transaction.totalAmount - (transaction.fees || 0);
      let costBasis = 0;

      while (remainingToSell > 0 && buyStack.length > 0) {
        const newestBuy = buyStack[buyStack.length - 1];
        const quantityToUse = Math.min(remainingToSell, newestBuy.quantity);
        
        costBasis += quantityToUse * newestBuy.price + (newestBuy.fees * quantityToUse / newestBuy.quantity);
        
        newestBuy.quantity -= quantityToUse;
        remainingToSell -= quantityToUse;
        
        if (newestBuy.quantity === 0) {
          buyStack.pop();
        }
      }

      realizedPL += sellProceeds - costBasis;
    }
  });

  return realizedPL;
}

/**
 * Average Cost basis calculation
 */
function calculateAverageRealizedPL(transactions: Transaction[]): number {
  let totalQuantity = 0;
  let totalCost = 0;
  let realizedPL = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'buy') {
      totalCost += transaction.totalAmount;
      totalQuantity += transaction.quantity;
    } else if (transaction.type === 'sell') {
      const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      const costBasis = transaction.quantity * averageCost;
      const sellProceeds = transaction.totalAmount - (transaction.fees || 0);
      
      realizedPL += sellProceeds - costBasis;
      
      // Update totals after sale
      totalQuantity -= transaction.quantity;
      totalCost -= costBasis;
    }
  });

  return realizedPL;
}

/**
 * Calculate tax implications for realized gains
 */
export function calculateTaxImplications(
  transactions: Transaction[],
  options: PLCalculationOptions = {}
): TaxImplication {
  const { costBasisMethod = 'FIFO' } = options;
  
  // Group transactions by asset to track holding periods
  const assetTransactions = new Map<string, Transaction[]>();
  
  transactions.forEach(transaction => {
    const key = `${transaction.assetSymbol}_${transaction.assetType}`;
    if (!assetTransactions.has(key)) {
      assetTransactions.set(key, []);
    }
    assetTransactions.get(key)!.push(transaction);
  });

  let shortTermGains = 0;
  let longTermGains = 0;

  assetTransactions.forEach((assetTxns) => {
    const gains = calculateAssetTaxGains(assetTxns, costBasisMethod);
    shortTermGains += gains.shortTerm;
    longTermGains += gains.longTerm;
  });

  const totalTaxableGains = shortTermGains + longTermGains;
  // Simplified tax calculation (actual rates vary by jurisdiction and income)
  const estimatedTaxLiability = (shortTermGains * 0.24) + (longTermGains * 0.15);

  return {
    shortTermGains,
    longTermGains,
    totalTaxableGains,
    estimatedTaxLiability
  };
}

/**
 * Calculate tax gains for a specific asset
 */
function calculateAssetTaxGains(
  transactions: Transaction[], 
  method: CostBasisMethod
): { shortTerm: number; longTerm: number } {
  const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const buyQueue: { quantity: number; price: number; fees: number; date: Date }[] = [];
  let shortTermGains = 0;
  let longTermGains = 0;

  sortedTransactions.forEach(transaction => {
    if (transaction.type === 'buy') {
      buyQueue.push({
        quantity: transaction.quantity,
        price: transaction.price,
        fees: transaction.fees || 0,
        date: transaction.date
      });
    } else if (transaction.type === 'sell') {
      let remainingToSell = transaction.quantity;
      const sellProceeds = transaction.totalAmount - (transaction.fees || 0);
      const sellDate = new Date(transaction.date);

      while (remainingToSell > 0 && buyQueue.length > 0) {
        const buy = method === 'LIFO' ? buyQueue.pop()! : buyQueue.shift()!;
        const quantityToUse = Math.min(remainingToSell, buy.quantity);
        
        const costBasis = quantityToUse * buy.price + (buy.fees * quantityToUse / buy.quantity);
        const saleProceeds = (sellProceeds * quantityToUse) / transaction.quantity;
        const gain = saleProceeds - costBasis;
        
        // Check if holding period is more than 1 year
        const holdingPeriodDays = (sellDate.getTime() - new Date(buy.date).getTime()) / (1000 * 60 * 60 * 24);
        
        if (holdingPeriodDays > 365) {
          longTermGains += gain;
        } else {
          shortTermGains += gain;
        }
        
        buy.quantity -= quantityToUse;
        remainingToSell -= quantityToUse;
        
        if (buy.quantity > 0) {
          // Put remaining quantity back
          if (method === 'LIFO') {
            buyQueue.push(buy);
          } else {
            buyQueue.unshift(buy);
          }
        }
      }
    }
  });

  return { shortTerm: shortTermGains, longTerm: longTermGains };
}

/**
 * Calculate currency conversion for international assets
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // Use USD as base currency for conversions
  const toUSDRate = fromCurrency === 'USD' ? 1 : (exchangeRates[fromCurrency] || 1);
  const fromUSDRate = toCurrency === 'USD' ? 1 : (exchangeRates[toCurrency] || 1);
  
  const usdAmount = amount / toUSDRate;
  return usdAmount * fromUSDRate;
}

/**
 * Calculate annualized return
 */
export function calculateAnnualizedReturn(
  initialValue: number,
  finalValue: number,
  startDate: Date,
  endDate: Date
): number {
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const yearsDiff = daysDiff / 365.25;
  
  if (yearsDiff <= 0 || initialValue <= 0) {
    return 0;
  }
  
  return (Math.pow(finalValue / initialValue, 1 / yearsDiff) - 1) * 100;
}
