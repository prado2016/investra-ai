/**
 * Symbol Mapping and Validation Utility
 * Handles common symbol variations, typos, and domain mappings
 */

interface SymbolMapping {
  [key: string]: {
    correctSymbol: string;
    domain: string;
    commonVariations: string[];
  };
}

// Common symbol corrections and domain mappings
const SYMBOL_MAPPINGS: SymbolMapping = {
  'NVDA': {
    correctSymbol: 'NVDA',
    domain: 'nvidia.com',
    commonVariations: ['NVDIA', 'NVIDIA']
  },
  'AAPL': {
    correctSymbol: 'AAPL',
    domain: 'apple.com',
    commonVariations: ['APPLE']
  },
  'MSFT': {
    correctSymbol: 'MSFT',
    domain: 'microsoft.com',
    commonVariations: ['MICROSOFT', 'MSFT']
  },
  'GOOGL': {
    correctSymbol: 'GOOGL',
    domain: 'google.com',
    commonVariations: ['GOOGLE', 'GOOG']
  },
  'AMZN': {
    correctSymbol: 'AMZN',
    domain: 'amazon.com',
    commonVariations: ['AMAZON']
  },
  'TSLA': {
    correctSymbol: 'TSLA',
    domain: 'tesla.com',
    commonVariations: ['TESLA']
  },
  'META': {
    correctSymbol: 'META',
    domain: 'meta.com',
    commonVariations: ['FACEBOOK', 'FB']
  },
  'NFLX': {
    correctSymbol: 'NFLX',
    domain: 'netflix.com',
    commonVariations: ['NETFLIX']
  },
  'DIS': {
    correctSymbol: 'DIS',
    domain: 'disney.com',
    commonVariations: ['DISNEY']
  },
  'UBER': {
    correctSymbol: 'UBER',
    domain: 'uber.com',
    commonVariations: []
  },
  'SPOT': {
    correctSymbol: 'SPOT',
    domain: 'spotify.com',
    commonVariations: ['SPOTIFY']
  },
  'COIN': {
    correctSymbol: 'COIN',
    domain: 'coinbase.com',
    commonVariations: ['COINBASE']
  },
  'PYPL': {
    correctSymbol: 'PYPL',
    domain: 'paypal.com',
    commonVariations: ['PAYPAL']
  },
  'V': {
    correctSymbol: 'V',
    domain: 'visa.com',
    commonVariations: ['VISA']
  },
  'MA': {
    correctSymbol: 'MA',
    domain: 'mastercard.com',
    commonVariations: ['MASTERCARD']
  },
  'JPM': {
    correctSymbol: 'JPM',
    domain: 'jpmorganchase.com',
    commonVariations: ['JPMORGAN']
  },
  'BAC': {
    correctSymbol: 'BAC',
    domain: 'bankofamerica.com',
    commonVariations: []
  },
  'WMT': {
    correctSymbol: 'WMT',
    domain: 'walmart.com',
    commonVariations: ['WALMART']
  },
  'KO': {
    correctSymbol: 'KO',
    domain: 'coca-cola.com',
    commonVariations: ['COCACOLA']
  },
  'PEP': {
    correctSymbol: 'PEP',
    domain: 'pepsico.com',
    commonVariations: ['PEPSI']
  },
  'MCD': {
    correctSymbol: 'MCD',
    domain: 'mcdonalds.com',
    commonVariations: ['MCDONALDS']
  },
  'SBUX': {
    correctSymbol: 'SBUX',
    domain: 'starbucks.com',
    commonVariations: ['STARBUCKS']
  },
  'NKE': {
    correctSymbol: 'NKE',
    domain: 'nike.com',
    commonVariations: ['NIKE']
  }
};

export class SymbolValidator {
  /**
   * Normalize and validate a stock symbol
   */
  static normalizeSymbol(symbol: string): string {
    if (!symbol || typeof symbol !== 'string') {
      return '';
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    // Check direct mapping
    if (SYMBOL_MAPPINGS[cleanSymbol]) {
      return SYMBOL_MAPPINGS[cleanSymbol].correctSymbol;
    }

    // Check variations
    for (const [correctSymbol, mapping] of Object.entries(SYMBOL_MAPPINGS)) {
      if (mapping.commonVariations.includes(cleanSymbol)) {
        return correctSymbol;
      }
    }

    // Return cleaned symbol if no mapping found
    return cleanSymbol;
  }

  /**
   * Get the company domain for a symbol
   */
  static getCompanyDomain(symbol: string): string | null {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const mapping = SYMBOL_MAPPINGS[normalizedSymbol];
    return mapping ? mapping.domain : null;
  }

  /**
   * Check if a symbol is valid (exists in our mappings)
   */
  static isKnownSymbol(symbol: string): boolean {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    return normalizedSymbol in SYMBOL_MAPPINGS;
  }

  /**
   * Get symbol suggestions for a given input
   */
  static getSuggestions(input: string): string[] {
    if (!input || typeof input !== 'string') {
      return [];
    }

    const cleanInput = input.trim().toUpperCase();
    const suggestions: string[] = [];

    // Exact matches
    if (SYMBOL_MAPPINGS[cleanInput]) {
      suggestions.push(cleanInput);
    }

    // Partial matches
    for (const [symbol, mapping] of Object.entries(SYMBOL_MAPPINGS)) {
      if (symbol.includes(cleanInput) || 
          mapping.commonVariations.some(v => v.includes(cleanInput))) {
        suggestions.push(symbol);
      }
    }

    // Fuzzy matches (Levenshtein distance)
    for (const [symbol] of Object.entries(SYMBOL_MAPPINGS)) {
      if (this.levenshteinDistance(cleanInput, symbol) <= 2) {
        suggestions.push(symbol);
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Add or update a symbol mapping
   */
  static addMapping(symbol: string, domain: string, variations: string[] = []): void {
    const normalizedSymbol = symbol.trim().toUpperCase();
    SYMBOL_MAPPINGS[normalizedSymbol] = {
      correctSymbol: normalizedSymbol,
      domain,
      commonVariations: variations.map(v => v.trim().toUpperCase())
    };
  }
}

export { SYMBOL_MAPPINGS };
export type { SymbolMapping };
