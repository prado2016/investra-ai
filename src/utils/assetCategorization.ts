// Inline type definitions to avoid import issues
export type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';
type PropertySector = 
  | 'residential' 
  | 'commercial' 
  | 'industrial' 
  | 'retail' 
  | 'office' 
  | 'healthcare' 
  | 'hotel' 
  | 'storage' 
  | 'data_center' 
  | 'mixed';

// Asset categorization utility functions

/**
 * Interface for parsed ticker information
 */
export interface ParsedTicker {
  originalSymbol: string;
  cleanSymbol: string;
  exchange?: string;
  suffix?: string;
  market?: string;
  country?: string;
}

/**
 * Exchange suffix mappings
 */
export const EXCHANGE_SUFFIXES = {
  // North American exchanges
  '.TO': { exchange: 'TSX', market: 'Toronto Stock Exchange', country: 'CA' },
  '.V': { exchange: 'TSXV', market: 'TSX Venture Exchange', country: 'CA' },
  '.CN': { exchange: 'CSE', market: 'Canadian Securities Exchange', country: 'CA' },
  '.NEO': { exchange: 'NEO', market: 'NEO Exchange', country: 'CA' },
  
  // European exchanges
  '.L': { exchange: 'LSE', market: 'London Stock Exchange', country: 'GB' },
  '.PA': { exchange: 'EPA', market: 'Euronext Paris', country: 'FR' },
  '.AS': { exchange: 'AMS', market: 'Euronext Amsterdam', country: 'NL' },
  '.BR': { exchange: 'EBR', market: 'Euronext Brussels', country: 'BE' },
  '.DE': { exchange: 'XETRA', market: 'Deutsche Börse XETRA', country: 'DE' },
  '.F': { exchange: 'FRA', market: 'Frankfurt Stock Exchange', country: 'DE' },
  '.MI': { exchange: 'BIT', market: 'Borsa Italiana', country: 'IT' },
  '.MC': { exchange: 'BME', market: 'Bolsa de Madrid', country: 'ES' },
  '.SW': { exchange: 'SWX', market: 'SIX Swiss Exchange', country: 'CH' },
  '.ST': { exchange: 'STO', market: 'Nasdaq Stockholm', country: 'SE' },
  '.OL': { exchange: 'OSE', market: 'Oslo Stock Exchange', country: 'NO' },
  
  // Asian exchanges
  '.HK': { exchange: 'HKEX', market: 'Hong Kong Stock Exchange', country: 'HK' },
  '.SS': { exchange: 'SSE', market: 'Shanghai Stock Exchange', country: 'CN' },
  '.SZ': { exchange: 'SZSE', market: 'Shenzhen Stock Exchange', country: 'CN' },
  '.T': { exchange: 'TSE', market: 'Tokyo Stock Exchange', country: 'JP' },
  '.KS': { exchange: 'KRX', market: 'Korea Exchange', country: 'KR' },
  '.SI': { exchange: 'SGX', market: 'Singapore Exchange', country: 'SG' },
  '.AX': { exchange: 'ASX', market: 'Australian Securities Exchange', country: 'AU' },
  '.NS': { exchange: 'NSE', market: 'National Stock Exchange of India', country: 'IN' },
  '.BO': { exchange: 'BSE', market: 'Bombay Stock Exchange', country: 'IN' },
  
  // Other exchanges
  '.SA': { exchange: 'BVSP', market: 'B3 (Brazil)', country: 'BR' },
  '.MX': { exchange: 'BMV', market: 'Mexican Stock Exchange', country: 'MX' },
  '.JO': { exchange: 'JSE', market: 'Johannesburg Stock Exchange', country: 'ZA' },
};

/**
 * Parse ticker symbol and extract exchange information
 */
export function parseTickerSymbol(symbol: string): ParsedTicker {
  const originalSymbol = symbol.trim();
  let cleanSymbol = originalSymbol.toUpperCase();
  let exchange: string | undefined;
  let suffix: string | undefined;
  let market: string | undefined;
  let country: string | undefined;
  
  // Check for exchange suffixes
  for (const [suffixPattern, exchangeInfo] of Object.entries(EXCHANGE_SUFFIXES)) {
    if (cleanSymbol.endsWith(suffixPattern)) {
      suffix = suffixPattern;
      exchange = exchangeInfo.exchange;
      market = exchangeInfo.market;
      country = exchangeInfo.country;
      cleanSymbol = cleanSymbol.slice(0, -suffixPattern.length);
      break;
    }
  }
  
  // Handle other common patterns
  if (!suffix) {
    // Check for colon format (e.g., XETRA:BMW, NASDAQ:AAPL)
    const colonMatch = cleanSymbol.match(/^([A-Z]+):([A-Z0-9]+)$/);
    if (colonMatch) {
      const [, exchangeCode, tickerCode] = colonMatch;
      cleanSymbol = tickerCode;
      exchange = exchangeCode;
    }
    
    // Check for space format (e.g., "AAPL US", "BTC USD")
    const spaceMatch = cleanSymbol.match(/^([A-Z0-9]+)\s+([A-Z]{2,4})$/);
    if (spaceMatch) {
      const [, tickerCode, exchangeOrCurrency] = spaceMatch;
      cleanSymbol = tickerCode;
      // Could be exchange or currency - context dependent
      if (['US', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].includes(exchangeOrCurrency)) {
        // Likely a currency pair or US market indicator
        if (exchangeOrCurrency === 'US') {
          exchange = 'NASDAQ'; // Default assumption
          country = 'US';
        }
      }
    }
  }
  
  // Default to US markets for clean symbols without exchange info
  if (!exchange && isStock(cleanSymbol)) {
    exchange = 'NASDAQ'; // Default assumption for US stocks
    country = 'US';
  }
  
  return {
    originalSymbol,
    cleanSymbol,
    exchange,
    suffix,
    market,
    country
  };
}

/**
 * Determine asset type based on symbol pattern
 */
export function detectAssetType(symbol: string): AssetType | null {
  // Parse the ticker symbol first
  const parsed = parseTickerSymbol(symbol);
  const cleanSymbol = parsed.cleanSymbol;

  // Forex patterns (currency pairs) - Check before crypto
  if (isForexPair(cleanSymbol) || isForexPair(parsed.originalSymbol)) {
    return 'forex';
  }

  // Cryptocurrency patterns
  if (isCryptocurrency(cleanSymbol)) {
    return 'crypto';
  }
  
  // Option patterns
  if (isOption(cleanSymbol)) {
    return 'option';
  }

  // ETF patterns (check before stock as ETFs trade like stocks)
  if (isETF(cleanSymbol)) {
    return 'etf';
  }
  
  // REIT patterns
  if (isREIT(cleanSymbol)) {
    return 'reit';
  }
  
  // Default to stock for standard symbols
  if (isStock(cleanSymbol)) {
    return 'stock';
  }
  
  return null;
}

/**
 * Check if symbol represents a cryptocurrency
 */
export function isCryptocurrency(symbol: string): boolean {
  // Common crypto symbols
  const majorCryptos = [
    'BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'AVAX', 'MATIC', 'LINK', 'UNI',
    'LTC', 'BCH', 'XRP', 'DOGE', 'SHIB', 'ATOM', 'FTM', 'NEAR', 'ICP',
    'ALGO', 'VET', 'MANA', 'SAND', 'CRO', 'LRC', 'ENJ', 'GALA', 'CHZ',
    'AAVE', 'COMP', 'MKR', 'SNX', 'YFI', 'SUSHI', 'CRV', 'BAL', 'REN',
    'KNC', 'ZRX', 'BAT', 'REP', 'GNT', 'OMG', 'ZIL', 'ICX', 'QTUM',
    'ONT', 'ZEC', 'DASH', 'XMR', 'DCR', 'LSK', 'XTZ', 'WAVES'
  ];
  
  // Check direct match
  if (majorCryptos.includes(symbol)) {
    return true;
  }
  
  // Check for USD/USDT pairs
  if (symbol.endsWith('USD') || symbol.endsWith('USDT') || symbol.endsWith('USDC')) {
    const base = symbol.replace(/USD[TC]?$/, '');
    if (majorCryptos.includes(base)) {
      return true;
    }
  }
  
  // Check for common crypto pair formats
  const cryptoPairPatterns = [
    /^[A-Z]{3,5}[-/]?USD[TC]?$/,  // BTC-USD, ETH/USDT
    /^[A-Z]{3,5}[-/]?BTC$/,       // ETH-BTC, ADA/BTC
    /^[A-Z]{3,5}[-/]?ETH$/        // LINK-ETH, UNI/ETH
  ];
  
  return cryptoPairPatterns.some(pattern => pattern.test(symbol));
}

/**
 * Check if symbol represents a forex pair
 */
export function isForexPair(symbol: string): boolean {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY'];
  
  // Standard forex pair format: XXXYYY (6 characters)
  if (symbol.length === 6) {
    const base = symbol.substring(0, 3);
    const quote = symbol.substring(3, 6);
    return currencies.includes(base) && currencies.includes(quote);
  }
  
  // Alternative formats: XXX/YYY or XXX-YYY
  if (symbol.includes('/') || symbol.includes('-')) {
    const parts = symbol.split(/[/-]/);
    if (parts.length === 2) {
      return currencies.includes(parts[0]) && currencies.includes(parts[1]);
    }
  }
  
  return false;
}

/**
 * Check if symbol represents an option
 */
export function isOption(symbol: string): boolean {
  // Options typically have complex symbols with expiration dates and strike prices
  // Examples: AAPL240315C00150000, TSLA240412P00180000
  
  // Pattern: Symbol + YYMMDD + C/P + Strike (8 digits)
  const optionPattern = /^[A-Z]{1,5}\d{6}[CP]\d{8}$/;
  
  return optionPattern.test(symbol);
}

/**
 * Check if symbol represents a REIT
 */
export function isREIT(symbol: string): boolean {
  // Known major REITs by symbol
  const knownREITs = [
    // Equity REITs
    'O', 'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'WELL', 'AVB', 'EQR', 'DLR',
    'BXP', 'VTR', 'ARE', 'ESS', 'MAA', 'UDR', 'CPT', 'FRT', 'REG', 'HST',
    'SLG', 'AIV', 'ELS', 'SUI', 'EXR', 'CUBE', 'LSI', 'PPS', 'REXR',
    // Mortgage REITs
    'AGNC', 'NLY', 'STWD', 'BXMT', 'MFA', 'CIM', 'IVR', 'PMT', 'NYMT',
    // Canadian REITs
    'REI.UN.TO', 'CRT.UN.TO', 'SRU.UN.TO', 'FCR.UN.TO', 'HR.UN.TO'
  ];
  
  // Direct symbol match
  if (knownREITs.includes(symbol)) {
    return true;
  }
  
  // REIT indicators in symbol
  const reitPatterns = [
    /REIT/i, /PROPERTIES/i, /REALTY/i, /REAL/i, /PROP/i, /TRUST/i,
    /\.UN\.TO$/, // Canadian REIT units
    /\.UN\.V$/   // Canadian REIT units on TSXV
  ];
  
  return reitPatterns.some(pattern => pattern.test(symbol));
}

/**
 * Check if symbol represents an ETF
 */
export function isETF(symbol: string): boolean {
  // Known major ETFs
  const knownETFs = [
    // Broad market
    'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'IEFA', 'IEMG', 'ACWI',
    // Sector ETFs
    'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU', 'XLB', 'XLRE',
    // Bond ETFs
    'AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'BNDX',
    // Commodity ETFs
    'GLD', 'SLV', 'USO', 'UNG', 'DBA', 'DBC', 'PDBC', 'GSG',
    // International
    'EFA', 'EEM', 'VGK', 'VPL', 'EPP', 'FXI', 'ASHR', 'MCHI', 'EWJ', 'EWZ',
    // Vanguard
    'VTI', 'VXUS', 'VEA', 'VWO', 'VTV', 'VUG', 'VOO', 'VIG', 'VYM', 'VGIT',
    // iShares
    'IVV', 'IEFA', 'IEMG', 'IJH', 'IJR', 'IXUS', 'ITOT', 'IUSB', 'IUSG', 'IUSV',
    // Leveraged/Inverse ETFs
    'NVDL', 'NVDU', 'NVDD', 'SOXL', 'SOXS', 'TQQQ', 'SQQQ', 'SPXL', 'SPXS',
    'UPRO', 'SPXU', 'TECL', 'TECS', 'FNGU', 'FNGD', 'LABU', 'LABD',
    // Additional Leveraged ETFs
    'TSLL', 'AAPU', 'WEBL', 'WEBS', 'BULZ', 'BERZ', 'CURE', 'HIBL', 'HIBS',
    'NAIL', 'DRN', 'DRV', 'DFEN', 'DPST', 'DRIP', 'GUSH', 'JNUG', 'JDST',
    'NUGT', 'DUST', 'YOLO', 'BOIL', 'KOLD', 'UGAZ', 'DGAZ', 'USLV', 'DSLV',
    'UDOW', 'SDOW', 'UMDD', 'SMDD', 'URTY', 'SRTY', 'TZA', 'TNA', 'MIDU',
    'MIDZ', 'WANT', 'NEED', 'UTSL', 'DTUL', 'RETL', 'EMTY', 'PILL', 'SICK',
    // Canadian ETFs
    'VTI.TO', 'VXUS.TO', 'VEA.TO', 'TDB902.TO', 'XIC.TO', 'VCN.TO'
  ];
  
  if (knownETFs.includes(symbol)) {
    return true;
  }
  
  // ETF patterns in symbol name
  const etfPatterns = [
    /ETF$/i,
    /SPDR/i,
    /ISHARES/i,
    /VANGUARD/i,
    /INVESCO/i,
    /SCHWAB/i
  ];
  
  return etfPatterns.some(pattern => pattern.test(symbol));
}

/**
 * Check if symbol represents a stock
 */
export function isStock(symbol: string): boolean {
  // Basic validation for stock symbols
  // Typically 1-5 characters, letters only (may include dots for some exchanges)
  const stockPattern = /^[A-Z]{1,5}(\.[A-Z])?$/;
  
  return stockPattern.test(symbol);
}

/**
 * Categorize REIT by property sector based on name or known mappings
 */
export function categorizeREITSector(symbol: string, name?: string): PropertySector {
  const sectorKeywords = {
    residential: ['apartment', 'residential', 'home', 'housing', 'living'],
    commercial: ['commercial', 'office', 'corporate'],
    industrial: ['industrial', 'warehouse', 'logistics', 'distribution'],
    retail: ['retail', 'shopping', 'mall', 'store'],
    office: ['office', 'corporate', 'business'],
    healthcare: ['healthcare', 'medical', 'hospital', 'senior', 'care'],
    hotel: ['hotel', 'hospitality', 'resort', 'lodging'],
    storage: ['storage', 'self-storage'],
    data_center: ['data', 'digital', 'technology', 'server'],
  };
  
  const searchText = `${symbol} ${name || ''}`.toLowerCase();
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return sector as PropertySector;
    }
  }
  
  return 'mixed'; // Default category
}

/**
 * Extract currency from forex pair
 */
export function extractForexCurrencies(symbol: string): { base: string; quote: string } | null {
  if (!isForexPair(symbol)) {
    return null;
  }
  
  // Handle different formats
  if (symbol.includes('/')) {
    const parts = symbol.split('/');
    return { base: parts[0], quote: parts[1] };
  }
  
  if (symbol.includes('-')) {
    const parts = symbol.split('-');
    return { base: parts[0], quote: parts[1] };
  }
  
  // Standard 6-character format
  if (symbol.length === 6) {
    return {
      base: symbol.substring(0, 3),
      quote: symbol.substring(3, 6)
    };
  }
  
  return null;
}

/**
 * Parse option symbol to extract components
 */
export function parseOptionSymbol(symbol: string): {
  underlying: string;
  expiration: Date;
  type: 'call' | 'put';
  strike: number;
} | null {
  const optionPattern = /^([A-Z]{1,5})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/;
  const match = symbol.match(optionPattern);
  
  if (!match) {
    return null;
  }
  
  const [, underlying, year, month, day, type, strikeStr] = match;
  
  // Convert 2-digit year to 4-digit (assuming 20xx)
  const fullYear = 2000 + parseInt(year);
  const expiration = new Date(fullYear, parseInt(month) - 1, parseInt(day));
  
  // Convert strike price (8 digits with implied decimal)
  const strike = parseInt(strikeStr) / 1000;
  
  return {
    underlying,
    expiration,
    type: type === 'C' ? 'call' : 'put',
    strike
  };
}

/**
 * Comprehensive asset categorization with enhanced information
 */
export interface AssetCategorizationResult {
  assetType: AssetType | null;
  parsedTicker: ParsedTicker;
  confidence: number; // 0-1 scale
  suggestions?: string[];
  warnings?: string[];
}

/**
 * Categorize asset with comprehensive analysis
 */
export function categorizeAsset(symbol: string, name?: string): AssetCategorizationResult {
  const parsedTicker = parseTickerSymbol(symbol);
  const assetType = detectAssetType(symbol);
  
  let confidence = 0.7; // Base confidence
  const suggestions: string[] = [];
  const warnings: string[] = [];
  
  // Adjust confidence based on various factors
  if (parsedTicker.exchange) {
    confidence += 0.2; // Higher confidence with known exchange
  }
  
  if (name) {
    // Use name to validate categorization
    const nameBasedType = detectAssetTypeFromName(name);
    if (nameBasedType && nameBasedType === assetType) {
      confidence += 0.1;
    } else if (nameBasedType && nameBasedType !== assetType) {
      warnings.push(`Name suggests ${nameBasedType} but symbol suggests ${assetType}`);
      confidence -= 0.2;
    }
  }
  
  // Add specific suggestions based on asset type
  if (assetType === 'stock' && !parsedTicker.exchange) {
    suggestions.push('Consider adding exchange suffix for better categorization (e.g., .TO for TSX)');
  }
  
  if (assetType === 'crypto' && !parsedTicker.originalSymbol.includes('USD')) {
    suggestions.push('Consider using USD pair format for better price tracking (e.g., BTC-USD)');
  }
  
  if (!assetType) {
    warnings.push('Could not determine asset type from symbol');
    suggestions.push('Consider using a more standard symbol format or manually specify asset type');
  }
  
  return {
    assetType,
    parsedTicker,
    confidence: Math.max(0, Math.min(1, confidence)),
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Detect asset type from asset name
 */
function detectAssetTypeFromName(name: string): AssetType | null {
  const lowerName = name.toLowerCase();
  
  // ETF indicators (check first as they're specific)
  const etfIndicators = ['etf', 'exchange traded fund', 'index fund', 'spdr', 'ishares', 'vanguard etf'];
  if (etfIndicators.some(indicator => lowerName.includes(indicator))) {
    return 'etf';
  }
  
  // REIT indicators
  const reitIndicators = ['reit', 'real estate', 'properties', 'realty', 'trust fund'];
  if (reitIndicators.some(indicator => lowerName.includes(indicator))) {
    return 'reit';
  }
  
  // Crypto indicators
  const cryptoIndicators = ['bitcoin', 'ethereum', 'cryptocurrency', 'coin', 'token'];
  if (cryptoIndicators.some(indicator => lowerName.includes(indicator))) {
    return 'crypto';
  }
  
  // Fund indicators (could be ETF but if not caught above, default to stock)
  const fundIndicators = ['fund', 'index'];
  if (fundIndicators.some(indicator => lowerName.includes(indicator))) {
    return 'stock'; // Generic funds trade like stocks
  }
  
  return null;
}

/**
 * Enhanced validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  confidence: number; // 0-1 scale
  detectedType?: AssetType;
  normalizedSymbol?: string;
}

/**
 * Validate ticker symbol format with comprehensive checks
 */
export function validateTickerSymbol(symbol: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.5;
  
  if (!symbol || symbol.trim().length === 0) {
    return {
      isValid: false,
      errors: ['Symbol cannot be empty'],
      warnings: [],
      suggestions: ['Please enter a valid ticker symbol'],
      confidence: 0
    };
  }
  
  const trimmed = symbol.trim();
  const parsed = parseTickerSymbol(trimmed);
  const detectedType = detectAssetType(trimmed);
  
  // Basic format validation
  if (!/^[A-Za-z0-9.\-:/\s]+$/.test(trimmed)) {
    errors.push('Symbol contains invalid characters. Only letters, numbers, dots, hyphens, colons, slashes, and spaces are allowed');
  }
  
  // Length validation
  if (trimmed.length > 25) {
    errors.push('Symbol is too long (maximum 25 characters)');
  } else if (trimmed.length < 1) {
    errors.push('Symbol is too short (minimum 1 character)');
  }
  
  // Asset-specific validation
  if (detectedType) {
    confidence += 0.3;
    
    switch (detectedType) {
      case 'stock':
        validateStockSymbol(parsed.cleanSymbol, errors, warnings);
        break;
      case 'crypto':
        validateCryptoSymbol(trimmed, errors, warnings, suggestions);
        break;
      case 'forex':
        validateForexSymbol(trimmed, errors, warnings);
        break;
      case 'option':
        validateOptionSymbol(trimmed, errors, warnings);
        break;
      case 'etf':
        validateETFSymbol(parsed.cleanSymbol, errors, warnings, suggestions);
        break;
      case 'reit':
        validateREITSymbol(parsed.cleanSymbol, errors, warnings);
        break;
    }
  } else {
    warnings.push('Could not determine asset type from symbol');
    suggestions.push('Consider using a more standard symbol format');
  }
  
  // Exchange validation
  if (parsed.exchange) {
    confidence += 0.2;
  } else if (parsed.cleanSymbol.length >= 1 && parsed.cleanSymbol.length <= 5) {
    suggestions.push('Consider adding exchange suffix for better categorization (e.g., .TO for TSX, .L for LSE)');
  }
  
  // Format suggestions
  if (trimmed !== trimmed.toUpperCase()) {
    suggestions.push('Consider using uppercase for consistency');
  }
  
  // Normalize symbol
  const normalizedSymbol = parsed.originalSymbol.toUpperCase();
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    confidence: Math.max(0, Math.min(1, confidence)),
    detectedType: detectedType || undefined,
    normalizedSymbol
  };
}

/**
 * Validate stock symbol format
 */
function validateStockSymbol(symbol: string, errors: string[], warnings: string[]) {
  if (symbol.length < 1 || symbol.length > 6) {
    warnings.push('Stock symbols are typically 1-6 characters long');
  }
  
  if (!/^[A-Z]+(\.[A-Z])?$/.test(symbol)) {
    errors.push('Stock symbols should contain only letters and optional dot separator');
  }
  
  // Common stock symbol patterns
  if (symbol.includes('.')) {
    const parts = symbol.split('.');
    if (parts.length !== 2 || parts[1].length !== 1) {
      warnings.push('Stock symbols with dots typically have format ABC.X (e.g., BRK.A)');
    }
  }
}

/**
 * Validate cryptocurrency symbol format
 */
function validateCryptoSymbol(symbol: string, errors: string[], warnings: string[], suggestions: string[]) {
  const cleanSymbol = symbol.replace(/[-/]?(USD[TC]?|BTC|ETH)$/i, '');
  
  if (cleanSymbol.length < 2 || cleanSymbol.length > 10) {
    warnings.push('Cryptocurrency symbols are typically 2-10 characters long');
  }
  
  if (!/^[A-Z0-9]+$/i.test(cleanSymbol)) {
    errors.push('Cryptocurrency symbols should contain only letters and numbers');
  }
  
  if (!symbol.match(/[-/]?(USD[TC]?|BTC|ETH)$/i)) {
    suggestions.push('Consider adding currency pair suffix (e.g., BTC-USD, ETH/USDT)');
  }
}

/**
 * Validate forex symbol format
 */
function validateForexSymbol(symbol: string, errors: string[], warnings: string[]) {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'NOK', 'SEK', 'DKK'];
  
  // Check standard 6-character format
  if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
    const base = symbol.substring(0, 3);
    const quote = symbol.substring(3, 6);
    
    if (!currencies.includes(base)) {
      warnings.push(`Base currency '${base}' is not commonly traded`);
    }
    if (!currencies.includes(quote)) {
      warnings.push(`Quote currency '${quote}' is not commonly traded`);
    }
  } else if (symbol.includes('/') || symbol.includes('-')) {
    const parts = symbol.split(/[/-]/);
    if (parts.length !== 2) {
      errors.push('Forex pairs should have format ABC/XYZ or ABC-XYZ');
    } else {
      if (parts[0].length !== 3 || parts[1].length !== 3) {
        warnings.push('Currency codes should be 3 characters long (ISO 4217 format)');
      }
    }
  } else {
    errors.push('Forex symbols should be in format ABCXYZ, ABC/XYZ, or ABC-XYZ');
  }
}

/**
 * Validate option symbol format
 */
function validateOptionSymbol(symbol: string, errors: string[], warnings: string[]) {
  const optionPattern = /^([A-Z]{1,5})(\d{6})([CP])(\d{8})$/;
  const match = symbol.match(optionPattern);
  
  if (!match) {
    errors.push('Option symbols should follow format: SYMBOL+YYMMDD+C/P+STRIKE (e.g., AAPL240315C00150000)');
    return;
  }
  
  const [, , dateStr, , strikeStr] = match;
  
  // Validate date
  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4));
  const day = parseInt(dateStr.substring(4, 6));
  
  if (month < 1 || month > 12) {
    errors.push('Invalid month in option expiration date');
  }
  if (day < 1 || day > 31) {
    errors.push('Invalid day in option expiration date');
  }
  
  const expirationDate = new Date(year, month - 1, day);
  if (expirationDate < new Date()) {
    warnings.push('Option appears to be expired');
  }
  
  // Validate strike price
  const strike = parseInt(strikeStr) / 1000;
  if (strike <= 0) {
    errors.push('Strike price must be positive');
  }
  if (strike > 10000) {
    warnings.push('Unusually high strike price');
  }
}

/**
 * Validate ETF symbol format
 */
function validateETFSymbol(symbol: string, errors: string[], warnings: string[], suggestions: string[]) {
  if (symbol.length < 2 || symbol.length > 5) {
    warnings.push('ETF symbols are typically 2-5 characters long');
  }
  
  if (!/^[A-Z]+$/.test(symbol)) {
    errors.push('ETF symbols should contain only letters');
  }
  
  // Check for common ETF patterns
  if (!symbol.match(/^(SPY|QQQ|VT[I-Z]|I[A-Z]{2,3}|XL[A-Z]|[A-Z]{3,4})$/)) {
    suggestions.push('Verify this is a valid ETF symbol');
  }
}

/**
 * Validate REIT symbol format
 */
function validateREITSymbol(symbol: string, errors: string[], warnings: string[]) {
  if (symbol.length < 1 || symbol.length > 6) {
    warnings.push('REIT symbols are typically 1-6 characters long');
  }
  
  if (!/^[A-Z]+$/.test(symbol)) {
    errors.push('REIT symbols should contain only letters');
  }
}

/**
 * Manual override functionality for asset categorization
 */

/**
 * Interface for asset type overrides
 */
export interface AssetTypeOverride {
  symbol: string;
  originalType: AssetType | null;
  overriddenType: AssetType;
  reason?: string;
  timestamp: Date;
  confidence: number;
}

/**
 * Get all asset type overrides from localStorage
 */
export function getAssetTypeOverrides(): Record<string, AssetTypeOverride> {
  try {
    const stored = localStorage.getItem('assetTypeOverrides');
    if (!stored) return {};
    
    const parsed = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    Object.values(parsed).forEach((override: unknown) => {
      const typedOverride = override as { timestamp: string };
      typedOverride.timestamp = new Date(typedOverride.timestamp) as unknown as string;
    });
    
    return parsed;
  } catch (error) {
    console.error('Error loading asset type overrides:', error);
    return {};
  }
}

/**
 * Save asset type overrides to localStorage
 */
function saveAssetTypeOverrides(overrides: Record<string, AssetTypeOverride>): void {
  try {
    localStorage.setItem('assetTypeOverrides', JSON.stringify(overrides));
  } catch (error) {
    console.error('Error saving asset type overrides:', error);
  }
}

/**
 * Set manual override for an asset type
 */
export function setAssetTypeOverride(
  symbol: string,
  overriddenType: AssetType,
  reason?: string
): boolean {
  try {
    const normalizedSymbol = parseTickerSymbol(symbol).originalSymbol.toUpperCase();
    const originalType = detectAssetType(symbol);
    const overrides = getAssetTypeOverrides();
    
    const override: AssetTypeOverride = {
      symbol: normalizedSymbol,
      originalType,
      overriddenType,
      reason,
      timestamp: new Date(),
      confidence: 1.0 // Manual overrides have 100% confidence
    };
    
    overrides[normalizedSymbol] = override;
    saveAssetTypeOverrides(overrides);
    
    return true;
  } catch (error) {
    console.error('Error setting asset type override:', error);
    return false;
  }
}

/**
 * Remove manual override for a symbol
 */
export function removeAssetTypeOverride(symbol: string): boolean {
  try {
    const normalizedSymbol = parseTickerSymbol(symbol).originalSymbol.toUpperCase();
    const overrides = getAssetTypeOverrides();
    
    if (overrides[normalizedSymbol]) {
      delete overrides[normalizedSymbol];
      saveAssetTypeOverrides(overrides);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error removing asset type override:', error);
    return false;
  }
}

/**
 * Get asset type with manual override consideration
 */
export function getAssetTypeWithOverride(symbol: string): AssetType | null {
  const normalizedSymbol = parseTickerSymbol(symbol).originalSymbol.toUpperCase();
  const overrides = getAssetTypeOverrides();
  
  // Check for manual override first
  if (overrides[normalizedSymbol]) {
    return overrides[normalizedSymbol].overriddenType;
  }
  
  // Fall back to automatic detection
  return detectAssetType(symbol);
}

/**
 * Get detailed categorization with override information
 */
export function categorizeAssetWithOverride(symbol: string, name?: string): AssetCategorizationResult & {
  hasOverride: boolean;
  override?: AssetTypeOverride;
} {
  const normalizedSymbol = parseTickerSymbol(symbol).originalSymbol.toUpperCase();
  const overrides = getAssetTypeOverrides();
  const override = overrides[normalizedSymbol];
  
  if (override) {
    // Return override result
    return {
      assetType: override.overriddenType,
      parsedTicker: parseTickerSymbol(symbol),
      confidence: override.confidence,
      suggestions: [`Manually set to ${override.overriddenType}`],
      warnings: override.reason ? [`Override reason: ${override.reason}`] : undefined,
      hasOverride: true,
      override
    };
  }
  
  // Return automatic categorization
  const result = categorizeAsset(symbol, name);
  return {
    ...result,
    hasOverride: false
  };
}
export async function validateTickerExists(symbol: string): Promise<{
  exists: boolean;
  name?: string;
  exchange?: string;
  lastPrice?: number;
  error?: string;
}> {
  // Placeholder for future Yahoo Finance API integration
  // This would make an actual API call to verify the symbol exists
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock validation for demo purposes
      const parsed = parseTickerSymbol(symbol);
      const type = detectAssetType(symbol);
      
      if (type && parsed.cleanSymbol.length >= 1 && parsed.cleanSymbol.length <= 6) {
        resolve({
          exists: true,
          name: `Mock ${type.toUpperCase()} for ${parsed.cleanSymbol}`,
          exchange: parsed.exchange || 'NASDAQ',
          lastPrice: Math.random() * 1000
        });
      } else {
        resolve({
          exists: false,
          error: 'Symbol not found in market data'
        });
      }
    }, 500); // Simulate API delay
  });
}


/**
 * Enhanced exchange and market identification utilities
 */

/**
 * Extended exchange information interface
 */
export interface ExchangeInfo {
  code: string;
  name: string;
  country: string;
  countryCode: string;
  timezone: string;
  currency: string;
  marketHours: {
    open: string;
    close: string;
  };
  website?: string;
  region: 'North America' | 'Europe' | 'Asia Pacific' | 'Middle East' | 'Africa' | 'Latin America';
}

/**
 * Comprehensive exchange information database
 */
export const EXCHANGE_INFO: Record<string, ExchangeInfo> = {
  // North American exchanges
  'NASDAQ': {
    code: 'NASDAQ',
    name: 'NASDAQ Stock Market',
    country: 'United States',
    countryCode: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    marketHours: { open: '09:30', close: '16:00' },
    website: 'https://www.nasdaq.com',
    region: 'North America'
  },
  'NYSE': {
    code: 'NYSE',
    name: 'New York Stock Exchange',
    country: 'United States',
    countryCode: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    marketHours: { open: '09:30', close: '16:00' },
    website: 'https://www.nyse.com',
    region: 'North America'
  },
  'TSX': {
    code: 'TSX',
    name: 'Toronto Stock Exchange',
    country: 'Canada',
    countryCode: 'CA',
    timezone: 'America/Toronto',
    currency: 'CAD',
    marketHours: { open: '09:30', close: '16:00' },
    website: 'https://www.tsx.com',
    region: 'North America'
  },
  'TSXV': {
    code: 'TSXV',
    name: 'TSX Venture Exchange',
    country: 'Canada',
    countryCode: 'CA',
    timezone: 'America/Toronto',
    currency: 'CAD',
    marketHours: { open: '09:30', close: '16:00' },
    region: 'North America'
  }
};

// Add more exchanges to the EXCHANGE_INFO
Object.assign(EXCHANGE_INFO, {
  // European exchanges
  'LSE': {
    code: 'LSE',
    name: 'London Stock Exchange',
    country: 'United Kingdom',
    countryCode: 'GB',
    timezone: 'Europe/London',
    currency: 'GBP',
    marketHours: { open: '08:00', close: '16:30' },
    website: 'https://www.londonstockexchange.com',
    region: 'Europe'
  },
  'EPA': {
    code: 'EPA',
    name: 'Euronext Paris',
    country: 'France',
    countryCode: 'FR',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    marketHours: { open: '09:00', close: '17:30' },
    region: 'Europe'
  },
  'XETRA': {
    code: 'XETRA',
    name: 'Deutsche Börse XETRA',
    country: 'Germany',
    countryCode: 'DE',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    marketHours: { open: '09:00', close: '17:30' },
    website: 'https://www.xetra.com',
    region: 'Europe'
  },
  
  // Asian exchanges
  'HKEX': {
    code: 'HKEX',
    name: 'Hong Kong Stock Exchange',
    country: 'Hong Kong',
    countryCode: 'HK',
    timezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    marketHours: { open: '09:30', close: '16:00' },
    website: 'https://www.hkex.com.hk',
    region: 'Asia Pacific'
  },
  'TSE': {
    code: 'TSE',
    name: 'Tokyo Stock Exchange',
    country: 'Japan',
    countryCode: 'JP',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    marketHours: { open: '09:00', close: '15:00' },
    region: 'Asia Pacific'
  },
  'ASX': {
    code: 'ASX',
    name: 'Australian Securities Exchange',
    country: 'Australia',
    countryCode: 'AU',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    marketHours: { open: '10:00', close: '16:00' },
    website: 'https://www.asx.com.au',
    region: 'Asia Pacific'
  }
});


/**
 * Get detailed exchange information
 */
export function getExchangeInfo(exchangeCode: string): ExchangeInfo | null {
  return EXCHANGE_INFO[exchangeCode] || null;
}

/**
 * Get exchange information from ticker symbol
 */
export function getExchangeFromTicker(symbol: string): ExchangeInfo | null {
  const parsed = parseTickerSymbol(symbol);
  
  if (parsed.exchange) {
    return getExchangeInfo(parsed.exchange);
  }
  
  return null;
}

/**
 * Check if market is currently open (simplified - doesn't account for holidays)
 */
export function isMarketOpen(exchangeCode: string): boolean {
  const exchangeInfo = getExchangeInfo(exchangeCode);
  if (!exchangeInfo) return false;
  
  try {
    const now = new Date();
    const marketTime = new Date(now.toLocaleString('en-US', { timeZone: exchangeInfo.timezone }));
    const currentHour = marketTime.getHours();
    const currentMinute = marketTime.getMinutes();
    const currentTime = currentHour * 100 + currentMinute;
    
    const [openHour, openMinute] = exchangeInfo.marketHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = exchangeInfo.marketHours.close.split(':').map(Number);
    const openTime = openHour * 100 + openMinute;
    const closeTime = closeHour * 100 + closeMinute;
    
    // Check if it's a weekday (Monday = 1, Sunday = 0)
    const dayOfWeek = marketTime.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    return isWeekday && currentTime >= openTime && currentTime < closeTime;
  } catch (error) {
    console.error('Error checking market hours:', error);
    return false;
  }
}

/**
 * Get all exchanges by region
 */
export function getExchangesByRegion(region: ExchangeInfo['region']): ExchangeInfo[] {
  return Object.values(EXCHANGE_INFO).filter(exchange => exchange.region === region);
}


/**
 * Get market identification with confidence scoring
 */
export function identifyMarket(symbol: string): {
  exchange?: ExchangeInfo;
  confidence: number;
  alternativeExchanges: ExchangeInfo[];
  notes: string[];
} {
  const parsed = parseTickerSymbol(symbol);
  const notes: string[] = [];
  let confidence = 0.5;
  
  // Primary exchange detection
  if (parsed.exchange) {
    const exchange = getExchangeInfo(parsed.exchange);
    if (exchange) {
      confidence = 0.9;
      notes.push(`Exchange detected from symbol suffix: ${parsed.suffix || 'format'}`);
      
      return {
        exchange,
        confidence,
        alternativeExchanges: [],
        notes
      };
    }
  }
  
  // Alternative detection based on symbol patterns
  const alternativeExchanges: ExchangeInfo[] = [];
  
  // US market assumptions for clean symbols
  if (!parsed.exchange && isStock(parsed.cleanSymbol)) {
    alternativeExchanges.push(EXCHANGE_INFO.NASDAQ, EXCHANGE_INFO.NYSE);
    confidence = 0.6;
    notes.push('Assuming US market for clean stock symbol');
  }
  
  // Crypto exchanges (conceptual)
  if (isCryptocurrency(symbol)) {
    notes.push('Cryptocurrency - trades on multiple exchanges globally');
    confidence = 0.8;
  }
  
  // Forex (no specific exchange)
  if (isForexPair(symbol)) {
    notes.push('Forex pair - trades on global FX markets');
    confidence = 0.9;
  }
  
  return {
    exchange: alternativeExchanges[0], // Default to first alternative
    confidence,
    alternativeExchanges,
    notes
  };
}

/**
 * Get global market status for all exchanges
 */
export function getGlobalMarketStatus(): Record<string, { 
  isOpen: boolean; 
  exchange: ExchangeInfo; 
  localTime: string; 
}> {
  const status: Record<string, { isOpen: boolean; exchange: ExchangeInfo; localTime: string; }> = {};
  
  Object.entries(EXCHANGE_INFO).forEach(([code, exchange]) => {
    const isOpen = isMarketOpen(code);
    const localTime = new Date().toLocaleString('en-US', { 
      timeZone: exchange.timezone,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    status[code] = {
      isOpen,
      exchange,
      localTime
    };
  });
  
  return status;
}
