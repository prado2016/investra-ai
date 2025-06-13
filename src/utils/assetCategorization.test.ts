import { detectAssetType } from './assetCategorization';

describe('detectAssetType', () => {
  // Test cases for options
  it('should correctly identify option symbols', () => {
    expect(detectAssetType('NVDA250516C00000000')).toBe('option');
    expect(detectAssetType('AAPL231215P00150000')).toBe('option');
    expect(detectAssetType('SPY240119C00400000')).toBe('option');
    expect(detectAssetType('TSLA251231P00200000')).toBe('option');
  });

  // Test cases for stocks
  it('should correctly identify stock symbols', () => {
    expect(detectAssetType('AAPL')).toBe('stock');
    expect(detectAssetType('GOOG')).toBe('stock');
    expect(detectAssetType('MSFT')).toBe('stock');
    expect(detectAssetType('AMZN')).toBe('stock');
    // With exchange suffix
    expect(detectAssetType('SHOP.TO')).toBe('stock');
    expect(detectAssetType('BARC.L')).toBe('stock');
  });

  // Test cases for other asset types to ensure no misclassification
  it('should not misclassify other asset types as options or stocks', () => {
    // Crypto
    expect(detectAssetType('BTCUSD')).toBe('crypto');
    expect(detectAssetType('ETH-USD')).toBe('crypto');
    expect(detectAssetType('SOLUSDT')).toBe('crypto');
    // Forex
    expect(detectAssetType('EURUSD')).toBe('forex');
    expect(detectAssetType('GBP/JPY')).toBe('forex');
    // ETF
    expect(detectAssetType('SPY')).toBe('etf'); // Note: SPY is an ETF, also a valid option underlying
    expect(detectAssetType('QQQ')).toBe('etf');
    expect(detectAssetType('VTI')).toBe('etf');
    // REIT
    expect(detectAssetType('O')).toBe('reit'); // O is a REIT
    expect(detectAssetType('PLD')).toBe('reit');
  });

  it('should return null for invalid or unrecognizable symbols', () => {
    expect(detectAssetType('INVALID')).toBeNull();
    expect(detectAssetType('12345')).toBeNull();
    expect(detectAssetType('ABC123XYZ')).toBeNull();
    // An option-like symbol with incorrect length
    expect(detectAssetType('AAPL23121P00150000')).toBeNull(); // Missing a digit in date
    expect(detectAssetType('AAPL231215P0015000')).toBeNull(); // Missing a digit in strike
  });

  // Edge cases for options
  it('should handle edge cases for option symbols', () => {
    expect(detectAssetType('A250101C00001000')).toBe('option'); // Single letter underlying
    expect(detectAssetType('ABCDE250101P12345000')).toBe('option'); // 5-letter underlying
  });

  // Edge cases for stocks
  it('should handle edge cases for stock symbols', () => {
    expect(detectAssetType('A')).toBe('stock'); // Single letter stock
    expect(detectAssetType('BRK.A')).toBe('stock'); // Stock with class suffix
    expect(detectAssetType('GOOGL')).toBe('stock'); // 5-letter stock
  });
});
