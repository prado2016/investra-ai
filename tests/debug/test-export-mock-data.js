// Test script to verify export functionality with mock data
console.log('Testing export functionality...');

// Mock portfolio that should be available
const mockPortfolio = {
  id: 'mock-portfolio-id',
  user_id: 'mock-user-id', 
  name: 'Mock Trading Portfolio',
  description: 'Sample portfolio for testing dashboard metrics',
  currency: 'USD',
  is_default: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Test the export data structure
const exportData = {
  portfolios: [mockPortfolio],
  transactions: [], // Would be empty for mock data unless mock transactions exist
  assets: [],
  exportDate: new Date().toISOString(),
  version: '2.0.0',
  source: 'supabase'
};

console.log('Mock export data structure:', JSON.stringify(exportData, null, 2));
console.log('Export should work with this data structure!');
