// Inline types to avoid import issues
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'BTC' | 'ETH';
type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT';

interface PositionLot {
  id: string;
  transactionId: string;
  quantity: number;
  costBasis: number;
  purchaseDate: Date;
  remainingQuantity: number;
}

interface Position {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName?: string;
  assetType: AssetType;
  quantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentMarketValue: number;
  currentPrice?: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  currency: Currency;
  openDate: Date;
  lastTransactionDate: Date;
  costBasisMethod: CostBasisMethod;
  lots: PositionLot[];
  createdAt: Date;
  updatedAt: Date;
}

// Duplicate types to avoid module resolution issues
export type { AssetType, Currency, CostBasisMethod };

/**
 * Enhance positions with missing display properties
 */
function enhancePositionsWithDisplayData(positions: Position[]): Position[] {
  const assetNames: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation', 
    'BTC-USD': 'Bitcoin',
    'TSLA': 'Tesla, Inc.',
    'VNQ': 'Vanguard Real Estate ETF',
    'ETH-USD': 'Ethereum',
    'NVDA': 'NVIDIA Corporation',
    'EURUSD=X': 'EUR/USD'
  };

  return positions.map(position => ({
    ...position,
    assetName: position.assetName || assetNames[position.assetSymbol] || position.assetSymbol,
    currentPrice: position.currentPrice || (position.currentMarketValue / position.quantity)
  }));
}

/**
 * Generate sample position data for testing and development
 */
export function generateSamplePositions(): Position[] {
  const rawPositions: Position[] = [
    {
      id: 'pos-1',
      assetId: 'asset-aapl',
      assetSymbol: 'AAPL',
      assetName: 'Apple Inc.',
      assetType: 'stock' as AssetType,
      quantity: 100,
      averageCostBasis: 150.25,
      totalCostBasis: 15025.00,
      currentMarketValue: 15750.00,
      currentPrice: 157.50,
      unrealizedPL: 725.00,
      unrealizedPLPercent: 4.83,
      realizedPL: 0,
      totalReturn: 725.00,
      totalReturnPercent: 4.83,
      currency: 'USD' as Currency,
      openDate: new Date('2024-10-15'),
      lastTransactionDate: new Date('2024-12-10'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-1',
          transactionId: 'txn-1',
          quantity: 100,
          costBasis: 150.25,
          purchaseDate: new Date('2024-10-15'),
          remainingQuantity: 100,
        }
      ],
      createdAt: new Date('2024-10-15'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-2',
      assetId: 'asset-msft',
      assetSymbol: 'MSFT',
      assetName: 'Microsoft Corporation',
      assetType: 'stock' as AssetType,
      quantity: 75,
      averageCostBasis: 320.50,
      totalCostBasis: 24037.50,
      currentMarketValue: 25500.00,
      currentPrice: 340.00,
      unrealizedPL: 1462.50,
      unrealizedPLPercent: 6.08,
      realizedPL: 0,
      totalReturn: 1462.50,
      totalReturnPercent: 6.08,
      currency: 'USD' as Currency,
      openDate: new Date('2024-09-20'),
      lastTransactionDate: new Date('2024-12-05'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-2',
          transactionId: 'txn-2',
          quantity: 75,
          costBasis: 320.50,
          purchaseDate: new Date('2024-09-20'),
          remainingQuantity: 75,
        }
      ],
      createdAt: new Date('2024-09-20'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-3',
      assetId: 'asset-btc',
      assetSymbol: 'BTC-USD',
      assetType: 'crypto' as AssetType,
      quantity: 0.5,
      averageCostBasis: 45000.00,
      totalCostBasis: 22500.00,
      currentMarketValue: 24000.00,
      unrealizedPL: 1500.00,
      unrealizedPLPercent: 6.67,
      realizedPL: 0,
      totalReturn: 1500.00,
      totalReturnPercent: 6.67,
      currency: 'USD' as Currency,
      openDate: new Date('2024-08-15'),
      lastTransactionDate: new Date('2024-11-20'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-3',
          transactionId: 'txn-3',
          quantity: 0.5,
          costBasis: 45000.00,
          purchaseDate: new Date('2024-08-15'),
          remainingQuantity: 0.5,
        }
      ],
      createdAt: new Date('2024-08-15'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-4',
      assetId: 'asset-tsla',
      assetSymbol: 'TSLA',
      assetType: 'stock' as AssetType,
      quantity: 50,
      averageCostBasis: 280.75,
      totalCostBasis: 14037.50,
      currentMarketValue: 12500.00,
      unrealizedPL: -1537.50,
      unrealizedPLPercent: -10.95,
      realizedPL: 0,
      totalReturn: -1537.50,
      totalReturnPercent: -10.95,
      currency: 'USD' as Currency,
      openDate: new Date('2024-07-10'),
      lastTransactionDate: new Date('2024-11-15'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-4',
          transactionId: 'txn-4',
          quantity: 50,
          costBasis: 280.75,
          purchaseDate: new Date('2024-07-10'),
          remainingQuantity: 50,
        }
      ],
      createdAt: new Date('2024-07-10'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-5',
      assetId: 'asset-vnq',
      assetSymbol: 'VNQ',
      assetType: 'reit' as AssetType,
      quantity: 200,
      averageCostBasis: 85.30,
      totalCostBasis: 17060.00,
      currentMarketValue: 17200.00,
      unrealizedPL: 140.00,
      unrealizedPLPercent: 0.82,
      realizedPL: 0,
      totalReturn: 140.00,
      totalReturnPercent: 0.82,
      currency: 'USD' as Currency,
      openDate: new Date('2024-06-05'),
      lastTransactionDate: new Date('2024-10-25'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-5',
          transactionId: 'txn-5',
          quantity: 200,
          costBasis: 85.30,
          purchaseDate: new Date('2024-06-05'),
          remainingQuantity: 200,
        }
      ],
      createdAt: new Date('2024-06-05'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-6',
      assetId: 'asset-eth',
      assetSymbol: 'ETH-USD',
      assetType: 'crypto' as AssetType,
      quantity: 10,
      averageCostBasis: 2500.00,
      totalCostBasis: 25000.00,
      currentMarketValue: 23500.00,
      unrealizedPL: -1500.00,
      unrealizedPLPercent: -6.00,
      realizedPL: 0,
      totalReturn: -1500.00,
      totalReturnPercent: -6.00,
      currency: 'USD' as Currency,
      openDate: new Date('2024-05-20'),
      lastTransactionDate: new Date('2024-09-30'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-6',
          transactionId: 'txn-6',
          quantity: 10,
          costBasis: 2500.00,
          purchaseDate: new Date('2024-05-20'),
          remainingQuantity: 10,
        }
      ],
      createdAt: new Date('2024-05-20'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-7',
      assetId: 'asset-nvda',
      assetSymbol: 'NVDA',
      assetType: 'stock' as AssetType,
      quantity: 25,
      averageCostBasis: 450.00,
      totalCostBasis: 11250.00,
      currentMarketValue: 12750.00,
      unrealizedPL: 1500.00,
      unrealizedPLPercent: 13.33,
      realizedPL: 0,
      totalReturn: 1500.00,
      totalReturnPercent: 13.33,
      currency: 'USD' as Currency,
      openDate: new Date('2024-04-15'),
      lastTransactionDate: new Date('2024-08-20'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-7',
          transactionId: 'txn-7',
          quantity: 25,
          costBasis: 450.00,
          purchaseDate: new Date('2024-04-15'),
          remainingQuantity: 25,
        }
      ],
      createdAt: new Date('2024-04-15'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-8',
      assetId: 'asset-eur',
      assetSymbol: 'EURUSD=X',
      assetType: 'forex' as AssetType,
      quantity: 10000,
      averageCostBasis: 1.0850,
      totalCostBasis: 10850.00,
      currentMarketValue: 10950.00,
      unrealizedPL: 100.00,
      unrealizedPLPercent: 0.92,
      realizedPL: 0,
      totalReturn: 100.00,
      totalReturnPercent: 0.92,
      currency: 'USD' as Currency,
      openDate: new Date('2024-03-10'),
      lastTransactionDate: new Date('2024-07-15'),
      costBasisMethod: 'FIFO' as CostBasisMethod,
      lots: [
        {
          id: 'lot-8',
          transactionId: 'txn-8',
          quantity: 10000,
          costBasis: 1.0850,
          purchaseDate: new Date('2024-03-10'),
          remainingQuantity: 10000,
        }
      ],
      createdAt: new Date('2024-03-10'),
      updatedAt: new Date('2024-12-15'),
    },
  ];

  return enhancePositionsWithDisplayData(rawPositions);
}

/**
 * Generate sample position for a specific asset type
 */
export function generateSamplePosition(assetType: AssetType): Position {
  const positions = generateSamplePositions();
  const position = positions.find(p => p.assetType === assetType);
  
  if (position) {
    return position;
  }
  
  // Fallback position if type not found
  return {
    id: `pos-sample-${assetType}`,
    assetId: `asset-sample-${assetType}`,
    assetSymbol: 'SAMPLE',
    assetType: assetType,
    quantity: 100,
    averageCostBasis: 100.00,
    totalCostBasis: 10000.00,
    currentMarketValue: 10500.00,
    unrealizedPL: 500.00,
    unrealizedPLPercent: 5.00,
    realizedPL: 0,
    totalReturn: 500.00,
    totalReturnPercent: 5.00,
    currency: 'USD' as Currency,
    openDate: new Date(),
    lastTransactionDate: new Date(),
    costBasisMethod: 'FIFO' as CostBasisMethod,
    lots: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Asset lookup data for position display
 */
export interface AssetInfo {
  symbol: string;
  name: string;
  type: AssetType;
}

/**
 * Sample asset information lookup
 */
export function getAssetInfo(): Map<string, AssetInfo> {
  const assetMap = new Map<string, AssetInfo>();
  
  assetMap.set('AAPL', { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' });
  assetMap.set('MSFT', { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' });
  assetMap.set('BTC-USD', { symbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto' });
  assetMap.set('TSLA', { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock' });
  assetMap.set('VNQ', { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'reit' });
  assetMap.set('ETH-USD', { symbol: 'ETH-USD', name: 'Ethereum', type: 'crypto' });
  assetMap.set('NVDA', { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' });
  assetMap.set('EURUSD=X', { symbol: 'EURUSD=X', name: 'EUR/USD', type: 'forex' });
  
  return assetMap;
}
