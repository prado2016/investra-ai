// Mock Yahoo Finance quote data
export const mockQuoteData = {
  AAPL: {
    symbol: 'AAPL',
    shortName: 'Apple Inc.',
    longName: 'Apple Inc.',
    regularMarketPrice: 150.25,
    regularMarketChange: 2.15,
    regularMarketChangePercent: 1.45,
    regularMarketPreviousClose: 148.10,
    regularMarketOpen: 149.50,
    regularMarketDayHigh: 151.20,
    regularMarketDayLow: 148.80,
    regularMarketVolume: 52487300,
    marketCap: 2456789000000,
    trailingPE: 25.4,
    trailingAnnualDividendYield: 0.0048,
    trailingEps: 5.91,
    beta: 1.2,
    currency: 'USD',
    fullExchangeName: 'NASDAQ Global Select',
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  GOOGL: {
    symbol: 'GOOGL',
    shortName: 'Alphabet Inc.',
    longName: 'Alphabet Inc. (Google)',
    regularMarketPrice: 2750.80,
    regularMarketChange: -15.30,
    regularMarketChangePercent: -0.55,
    regularMarketPreviousClose: 2766.10,
    regularMarketOpen: 2760.00,
    regularMarketDayHigh: 2780.50,
    regularMarketDayLow: 2745.20,
    regularMarketVolume: 1234567,
    marketCap: 1789012000000,
    trailingPE: 22.8,
    trailingEps: 120.65,
    beta: 1.1,
    currency: 'USD',
    fullExchangeName: 'NASDAQ Global Select',
    sector: 'Technology',
    industry: 'Internet Content & Information'
  },
  TSLA: {
    symbol: 'TSLA',
    shortName: 'Tesla, Inc.',
    longName: 'Tesla, Inc.',
    regularMarketPrice: 890.45,
    regularMarketChange: 35.20,
    regularMarketChangePercent: 4.12,
    regularMarketPreviousClose: 855.25,
    regularMarketOpen: 860.00,
    regularMarketDayHigh: 895.70,
    regularMarketDayLow: 858.30,
    regularMarketVolume: 28456789,
    marketCap: 890123000000,
    trailingPE: 45.2,
    trailingEps: 19.70,
    beta: 2.1,
    currency: 'USD',
    fullExchangeName: 'NASDAQ Global Select',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers'
  }
}

// Mock historical data
export const mockHistoricalData = {
  AAPL: {
    chart: {
      result: [{
        meta: {
          currency: 'USD',
          symbol: 'AAPL',
          exchangeName: 'NMS',
          instrumentType: 'EQUITY',
          firstTradeDate: 345479400,
          regularMarketTime: 1640995200,
          gmtoffset: -18000,
          timezone: 'EST',
          exchangeTimezoneName: 'America/New_York'
        },
        timestamp: [
          1640908800, 1640995200, 1641081600, 1641168000, 1641254400
        ],
        indicators: {
          quote: [{
            open: [148.50, 149.20, 150.10, 149.80, 150.25],
            high: [150.20, 151.50, 152.30, 151.90, 152.10],
            low: [147.80, 148.90, 149.50, 149.20, 149.85],
            close: [149.10, 150.25, 151.20, 150.80, 151.50],
            volume: [52487300, 48234567, 45678912, 51234890, 49876543]
          }],
          adjclose: [{
            adjclose: [149.10, 150.25, 151.20, 150.80, 151.50]
          }]
        }
      }],
      error: null
    }
  }
}

// Mock search results
export const mockSearchResults = [
  {
    symbol: 'AAPL',
    shortname: 'Apple Inc.',
    longname: 'Apple Inc.',
    quoteType: 'EQUITY',
    exchange: 'NMS',
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  {
    symbol: 'GOOGL',
    shortname: 'Alphabet Inc.',
    longname: 'Alphabet Inc. (Google)',
    quoteType: 'EQUITY',
    exchange: 'NMS',
    sector: 'Technology',
    industry: 'Internet Content & Information'
  },
  {
    symbol: 'TSLA',
    shortname: 'Tesla, Inc.',
    longname: 'Tesla, Inc.',
    quoteType: 'EQUITY',
    exchange: 'NMS',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers'
  },
  {
    symbol: 'MSFT',
    shortname: 'Microsoft Corporation',
    longname: 'Microsoft Corporation',
    quoteType: 'EQUITY',
    exchange: 'NMS',
    sector: 'Technology',
    industry: 'Software—Infrastructure'
  },
  {
    symbol: 'AMZN',
    shortname: 'Amazon.com, Inc.',
    longname: 'Amazon.com, Inc.',
    quoteType: 'EQUITY',
    exchange: 'NMS',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail'
  }
]

// Mock transaction data
export const mockTransactionData = {
  id: '1',
  assetId: 'AAPL',
  assetSymbol: 'AAPL',
  assetType: 'stock' as const,
  type: 'buy' as const,
  quantity: 10,
  price: 150.25,
  totalAmount: 1502.50,
  fees: 9.99,
  currency: 'USD' as const,
  date: new Date('2025-01-15'),
  notes: 'Test transaction',
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15')
}

// Mock position data
export const mockPositionData = {
  id: '1',
  assetSymbol: 'AAPL',
  assetType: 'stock' as const,
  quantity: 10,
  averageCostBasis: 150.25,
  currentMarketValue: 1512.50,
  unrealizedPL: 10.00,
  unrealizedPLPercent: 0.66,
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15')
}

// Export all mock data
export const mockData = {
  quotes: mockQuoteData,
  historical: mockHistoricalData,
  search: mockSearchResults,
  transaction: mockTransactionData,
  position: mockPositionData
}
