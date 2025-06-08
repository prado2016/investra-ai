// Script to add sample positions data to localStorage for testing
// This will be executed in a browser context

const samplePositions = [
  {
    id: 'pos-1',
    assetId: 'asset-aapl',
    assetSymbol: 'AAPL',
    assetName: 'Apple Inc.',
    assetType: 'stock',
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
    currency: 'USD',
    openDate: '2024-10-15T00:00:00.000Z',
    lastTransactionDate: '2024-12-10T00:00:00.000Z',
    costBasisMethod: 'FIFO',
    lots: [
      {
        id: 'lot-1',
        transactionId: 'txn-1',
        quantity: 100,
        costBasis: 150.25,
        purchaseDate: '2024-10-15T00:00:00.000Z',
        remainingQuantity: 100,
      }
    ],
    createdAt: '2024-10-15T00:00:00.000Z',
    updatedAt: '2024-12-15T00:00:00.000Z',
  },
  {
    id: 'pos-2',
    assetId: 'asset-msft',
    assetSymbol: 'MSFT',
    assetName: 'Microsoft Corporation',
    assetType: 'stock',
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
    currency: 'USD',
    openDate: '2024-09-20T00:00:00.000Z',
    lastTransactionDate: '2024-12-05T00:00:00.000Z',
    costBasisMethod: 'FIFO',
    lots: [
      {
        id: 'lot-2',
        transactionId: 'txn-2',
        quantity: 75,
        costBasis: 320.50,
        purchaseDate: '2024-09-20T00:00:00.000Z',
        remainingQuantity: 75,
      }
    ],
    createdAt: '2024-09-20T00:00:00.000Z',
    updatedAt: '2024-12-15T00:00:00.000Z',
  },
  {
    id: 'pos-3',
    assetId: 'asset-tsla',
    assetSymbol: 'TSLA',
    assetType: 'stock',
    quantity: 50,
    averageCostBasis: 280.75,
    totalCostBasis: 14037.50,
    currentMarketValue: 12500.00,
    currentPrice: 250.00,
    unrealizedPL: -1537.50,
    unrealizedPLPercent: -10.95,
    realizedPL: 0,
    totalReturn: -1537.50,
    totalReturnPercent: -10.95,
    currency: 'USD',
    openDate: '2024-07-10T00:00:00.000Z',
    lastTransactionDate: '2024-11-15T00:00:00.000Z',
    costBasisMethod: 'FIFO',
    lots: [
      {
        id: 'lot-3',
        transactionId: 'txn-3',
        quantity: 50,
        costBasis: 280.75,
        purchaseDate: '2024-07-10T00:00:00.000Z',
        remainingQuantity: 50,
      }
    ],
    createdAt: '2024-07-10T00:00:00.000Z',
    updatedAt: '2024-12-15T00:00:00.000Z',
  }
];

// Function to add data
function addPositionsData() {
  console.log('Adding sample positions data to localStorage...');
  localStorage.setItem('stock_tracker_positions', JSON.stringify(samplePositions));
  console.log('Sample positions added:', samplePositions.length);
  
  // Verify the data was added
  const storedData = localStorage.getItem('stock_tracker_positions');
  const parsedData = JSON.parse(storedData);
  console.log('Verified stored positions count:', parsedData.length);
  
  return parsedData;
}

// Execute if in browser context
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  addPositionsData();
} else {
  // Export for Node.js context
  module.exports = { samplePositions, addPositionsData };
}
