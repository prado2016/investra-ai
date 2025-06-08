/**
 * Development Mock Data Override for Dashboard Testing
 * 
 * This file provides mock data for testing the dashboard summary display
 * when the database is empty or when authentication is not available.
 * 
 * Usage: Import and use this in development mode to test dashboard components
 */

// Mock dashboard metrics for testing
export const mockDashboardMetrics = {
  totalDailyPL: 1250.75,      // Today's P/L - positive
  realizedPL: 3420.50,        // This month's realized gains
  unrealizedPL: -234.25,      // Current unrealized loss
  dividendIncome: 127.88,     // Monthly dividends
  tradingFees: 89.94,         // Monthly fees
  tradeVolume: 45670.25,      // Today's trading volume
  netCashFlow: 15000.00,      // Net cash flow
  transactionCount: 12,       // Number of transactions today
  lastUpdated: new Date()     // Current timestamp
}

// Alternative mock data with different scenarios
export const mockDashboardMetricsVariations = {
  // Scenario 1: Profitable day
  profitable: {
    totalDailyPL: 2150.30,
    realizedPL: 8750.25,
    unrealizedPL: 1540.75,
    dividendIncome: 245.60,
    tradingFees: 124.85,
    tradeVolume: 67890.50,
    netCashFlow: 25000.00,
    transactionCount: 18,
    lastUpdated: new Date()
  },
  
  // Scenario 2: Loss day
  lossDay: {
    totalDailyPL: -890.45,
    realizedPL: 2340.15,
    unrealizedPL: -1650.80,
    dividendIncome: 98.75,
    tradingFees: 156.70,
    tradeVolume: 34567.25,
    netCashFlow: -5000.00,
    transactionCount: 8,
    lastUpdated: new Date()
  },
  
  // Scenario 3: Flat/quiet day
  quietDay: {
    totalDailyPL: 23.15,
    realizedPL: 1250.00,
    unrealizedPL: 567.30,
    dividendIncome: 0.00,
    tradingFees: 19.98,
    tradeVolume: 2500.00,
    netCashFlow: 0.00,
    transactionCount: 2,
    lastUpdated: new Date()
  }
}

/**
 * Development flag to enable mock data
 * Set this to true in development to use mock data instead of database queries
 */
export const USE_MOCK_DATA = process.env.NODE_ENV === 'development' && process.env.VITE_USE_MOCK_DASHBOARD === 'true'

/**
 * Get mock dashboard metrics based on selected scenario
 */
export function getMockDashboardMetrics(scenario = 'default') {
  switch (scenario) {
    case 'profitable':
      return mockDashboardMetricsVariations.profitable
    case 'loss':
      return mockDashboardMetricsVariations.lossDay
    case 'quiet':
      return mockDashboardMetricsVariations.quietDay
    default:
      return mockDashboardMetrics
  }
}
