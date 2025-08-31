/**
 * CSV Parser Service for broker transaction files
 * Converts broker CSV format to application JSON format
 */

import type { TransactionType } from '../types/common';

export interface CSVTransaction {
  date: string;
  transaction: string;
  description: string;
  amount: string;
  balance: string;
  currency: string;
}

export interface ParsedTransaction {
  transaction_type: TransactionType;
  symbol: string;
  asset_type: 'stock' | 'option';
  quantity: number;
  price: number;
  total_amount: number;
  fees: number;
  currency: string;
  transaction_date: string;
  notes?: string;
  portfolio_name: string;
}

export class CSVParserService {
  // CSV transaction type to app transaction type mapping
  private static readonly CSV_TYPE_MAPPING: Record<string, TransactionType> = {
    'BUY': 'buy',
    'SELL': 'sell',
    'BUYTOOPEN': 'buy_to_open',
    'SELLTOOPEN': 'sell_to_open',
    'BUYTOCLOSE': 'buy_to_close',
    'SELLTOCLOSE': 'sell_to_close',
    'DIV': 'dividend',
    'TRFIN': 'transfer_in',
    'TRFOUT': 'transfer_out',
    'CONT': 'transfer_in',
    'INTCHARGED': 'fee',
    'FPLINT': 'interest',
    'LOAN': 'loan',
    'RECALL': 'recall'
  };

  /**
   * Parse CSV file content to transactions
   */
  static parseCSV(csvContent: string, filename: string): ParsedTransaction[] {
    const lines = csvContent.trim().split('\n');
    const header = lines[0];
    
    // Validate CSV format
    if (!header.includes('date') || !header.includes('transaction') || !header.includes('description')) {
      throw new Error('Invalid CSV format: Missing required columns');
    }

    const portfolioName = this.extractPortfolioFromFilename(filename);
    const transactions: ParsedTransaction[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const transaction = this.parseCSVLine(lines[i], portfolioName);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn(`Failed to parse line ${i + 1}: ${lines[i]}`, error);
      }
    }

    return transactions;
  }

  /**
   * Extract portfolio name from CSV filename
   */
  private static extractPortfolioFromFilename(filename: string): string {
    const portfolioName = filename.split('-')[0];
    
    // Map CSV portfolio names to app portfolio names
    const portfolioMapping: Record<string, string> = {
      'RRSP': 'RSP',
      'TFSA': 'TFSA',
      'Agora': 'Agora',
      'BBD': 'BBD'
    };

    return portfolioMapping[portfolioName] || portfolioName;
  }

  /**
   * Parse a single CSV line to transaction
   */
  private static parseCSVLine(line: string, portfolioName: string): ParsedTransaction | null {
    const values = this.parseCSVRow(line);
    if (values.length < 6) return null;

    const [date, transactionType, description, amount, , currency] = values;
    const appTransactionType = this.CSV_TYPE_MAPPING[transactionType];
    
    if (!appTransactionType) {
      console.warn(`Unknown transaction type: ${transactionType}`);
      return null;
    }

    // Skip non-position affecting transactions for now
    if (['transfer_in', 'transfer_out', 'fee', 'interest', 'loan', 'recall', 'dividend'].includes(appTransactionType)) {
      return null;
    }

    // Extract symbol and details from description
    const symbolData = this.extractSymbolFromDescription(description, transactionType);
    if (!symbolData) {
      console.warn(`Could not extract symbol from: ${description}`);
      return null;
    }

    const amountValue = Math.abs(parseFloat(amount));
    const quantity = symbolData.quantity;
    const price = quantity > 0 ? amountValue / quantity : 0;

    return {
      transaction_type: appTransactionType,
      symbol: symbolData.symbol,
      asset_type: symbolData.assetType,
      quantity: quantity,
      price: price,
      total_amount: amountValue,
      fees: symbolData.fees,
      currency: currency.replace(/"/g, ''),
      transaction_date: date.replace(/"/g, ''),
      notes: description,
      portfolio_name: portfolioName
    };
  }

  /**
   * Extract symbol, quantity, and fees from transaction description
   */
  private static extractSymbolFromDescription(description: string, _transactionType: string): {
    symbol: string;
    quantity: number;
    assetType: 'stock' | 'option';
    fees: number;
  } | null {
    // Remove quotes
    const desc = description.replace(/"/g, '');

    // Option transaction patterns
    const optionPatterns = [
      /^([A-Z]+)\s+[\d.]+\s+USD\s+(CALL|PUT)\s+[\d-]+:\s+(?:Bought|Sold)\s+([\d.]+)\s+contract/i,
      /^([A-Z]+)\s+[\d.]+\s+CAD\s+(CALL|PUT)\s+[\d-]+:\s+(?:Bought|Sold)\s+([\d.]+)\s+contract/i
    ];

    // Stock transaction patterns  
    const stockPatterns = [
      /^([A-Z]+)\s+-\s+.*?:\s+(?:Bought|Sold)\s+([\d.]+)\s+shares/i,
    ];

    // Check for options first
    for (const pattern of optionPatterns) {
      const match = desc.match(pattern);
      if (match) {
        const [, symbol, , quantityStr] = match;
        const quantity = parseFloat(quantityStr);
        const fees = this.extractFees(desc);
        return {
          symbol: symbol,
          quantity: quantity,
          assetType: 'option',
          fees: fees
        };
      }
    }

    // Check for stocks
    for (const pattern of stockPatterns) {
      const match = desc.match(pattern);
      if (match) {
        const [, symbol, quantityStr] = match;
        const quantity = parseFloat(quantityStr);
        return {
          symbol: symbol,
          quantity: quantity,
          assetType: 'stock',
          fees: 0 // Usually no explicit fees for stocks
        };
      }
    }

    return null;
  }

  /**
   * Extract fees from description
   */
  private static extractFees(description: string): number {
    const feeMatch = description.match(/Fee:\s*\$?([\d.]+)/i);
    return feeMatch ? parseFloat(feeMatch[1]) : 0;
  }

  /**
   * Parse CSV row handling quoted values
   */
  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }
}