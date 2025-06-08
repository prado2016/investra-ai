// Debug script to check localStorage and add sample data if needed
console.log('=== DEBUGGING POSITIONS PAGE ===');

// Check localStorage directly
console.log('Raw localStorage data:');
console.log('stock_tracker_positions:', localStorage.getItem('stock_tracker_positions'));
console.log('stock_tracker_transactions:', localStorage.getItem('stock_tracker_transactions'));
console.log('stock_tracker_portfolios:', localStorage.getItem('stock_tracker_portfolios'));

// Parse and display
try {
  const positions = JSON.parse(localStorage.getItem('stock_tracker_positions') || '[]');
  console.log('Parsed positions:', positions);
  console.log('Positions count:', positions.length);
  
  if (positions.length === 0) {
    console.log('No positions found in localStorage. Adding sample data...');
    
    // Add sample positions data
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
        lastTransactionDate: new Date('2024-12-05'),
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
      }
    ];
    
    localStorage.setItem('stock_tracker_positions', JSON.stringify(samplePositions));
    console.log('Sample positions data added to localStorage');
    console.log('New positions count:', samplePositions.length);
    
    // Trigger a page reload to see the changes
    window.location.reload();
  } else {
    console.log('Positions found:', positions);
  }
} catch (error) {
  console.error('Error parsing localStorage data:', error);
}
