export interface ParsedTransaction {
  symbol: string;
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  fees: number;
  date: string; // YYYY-MM-DD
  notes: string;
}

/**
 * Parse broker confirmation email text into structured transactions.
 * Uses simple regex patterns covering common broker formats.
 * Falls back to Gemini AI for complex formats.
 */
export function parseEmailText(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];

  // Common patterns across Fidelity, Schwab, TD Ameritrade, IBKR, Robinhood
  const patterns = [
    // "You bought 10 shares of AAPL at $150.00"
    /you\s+(bought|sold)\s+([\d,.]+)\s+shares?\s+of\s+([A-Z]{1,5})\s+at\s+\$?([\d,.]+)/gi,
    // "BUY 10 AAPL @ 150.00"
    /(buy|sell)\s+([\d,.]+)\s+([A-Z]{1,5})\s+@\s+\$?([\d,.]+)/gi,
    // "Executed: Bought 10 AAPL @ $150.00"
    /executed:?\s+(bought|sold)\s+([\d,.]+)\s+([A-Z]{1,5})\s+@?\s+\$?([\d,.]+)/gi,
    // "Dividend: AAPL $0.24 per share × 100 shares"
    /dividend:?\s+([A-Z]{1,5})\s+\$?([\d,.]+)\s+per\s+share\s+[×x]\s+([\d,.]+)\s+shares?/gi,
  ];

  const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\w+ \d{1,2},? \d{4})/);
  const rawDate = dateMatch?.[0] ?? new Date().toISOString().split('T')[0];
  const date = normalizeDate(rawDate);

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (pattern.source.startsWith('dividend')) {
        const [, symbol, priceStr, qtyStr] = match;
        results.push({
          symbol: symbol.toUpperCase(),
          type: 'dividend',
          quantity: parseNum(qtyStr),
          price: parseNum(priceStr),
          fees: 0,
          date,
          notes: 'Imported from email',
        });
      } else {
        const [, action, qtyStr, symbol, priceStr] = match;
        results.push({
          symbol: symbol.toUpperCase(),
          type: action.toLowerCase().startsWith('b') ? 'buy' : 'sell',
          quantity: parseNum(qtyStr),
          price: parseNum(priceStr),
          fees: extractFees(text),
          date,
          notes: 'Imported from email',
        });
      }
    }
  }

  return results;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

function extractFees(text: string): number {
  const m = text.match(/(?:commission|fee|charge)s?:?\s+\$?([\d,.]+)/i);
  return m ? parseNum(m[1]) : 0;
}

function normalizeDate(raw: string): string {
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}
