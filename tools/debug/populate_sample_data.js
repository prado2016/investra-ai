// Script to populate localStorage with sample positions data for testing
// Run this in the browser console to add test data

// Sample positions data matching the expected structure
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
    openDate: new Date('2024-10-15'),
    lastTransactionDate: new Date('2024-12-10'),
    costBasisMethod: 'FIFO',
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
    openDate: new Date('2024-09-20'),
    lastTransactionDate: new Date('2024-11-05'),
    costBasisMethod: 'FIFO',
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
    assetId: 'asset-tsla',
    assetSymbol: 'TSLA',
    assetName: 'Tesla, Inc.',
    assetType: 'stock',
    quantity: 50,
    averageCostBasis: 280.75,
    totalCostBasis: 14037.50,
    currentMarketValue: 12500.00,
    currentPrice: 250.00,
    unrealizedPL: -1537.50,
    unrealizedPLPercent: -10.96,
    realizedPL: 0,
    totalReturn: -1537.50,
    totalReturnPercent: -10.96,
    currency: 'USD',
    openDate: new Date('2024-07-10'),
    lastTransactionDate: new Date('2024-07-15'),
    costBasisMethod: 'FIFO',
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
  }
];

// Add data to localStorage
console.log('Adding sample positions to localStorage...');
localStorage.setItem('stock_tracker_positions', JSON.stringify(samplePositions));
console.log('Sample positions added successfully!');
console.log('Current positions in storage:', JSON.parse(localStorage.getItem('stock_tracker_positions') || '[]'));

// Verify the data was added
const storedPositions = JSON.parse(localStorage.getItem('stock_tracker_positions') || '[]');
console.log(`Added ${storedPositions.length} positions to localStorage`);
storedPositions.forEach(pos => {
  console.log(`- ${pos.assetSymbol}: ${pos.quantity} shares, ${pos.unrealizedPL > 0 ? '+' : ''}$${pos.unrealizedPL.toFixed(2)} P&L`);
});

console.log('\nRefresh the page to see the positions!');
