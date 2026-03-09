export interface ParsedTransaction {
  symbol: string;
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  fees: number;
  date: string; // YYYY-MM-DD
  notes: string;
  accountName?: string;
}

/**
 * Parse broker confirmation email text into structured transactions.
 * Supports Wealthsimple and common US broker formats.
 */
export function parseEmailText(text: string): ParsedTransaction[] {
  // Try Wealthsimple format first
  const ws = parseWealthsimple(text);
  if (ws.length > 0) return ws;

  // Fall back to generic US broker patterns
  return parseGenericBroker(text);
}

function parseWealthsimple(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];

  // Normalize: remove zero-width chars and collapse whitespace
  const clean = text.replace(/[\u200C\u200B\u00A0]/g, '').replace(/\s+/g, ' ');
  const accountName = extractAccountName(clean);

  // Wealthsimple stock: Type: *Limit* *Buy* Symbol: *TSLL* Shares: *100* Average price: *US$12.42* ... Time: *July 21, 2025 ...
  const stockPattern = /Type:\s*\*[^*]*\*\s*\*(Buy|Sell)\*(?:\s*\*[^*]*\*)?\s*Symbol:\s*\*([A-Z]{1,10})\*\s*Shares:\s*\*([\d,.]+)\*\s*Average price:\s*\*(?:US\$|CA\$|\$)([\d,.]+)\*\s*Total (?:cost|value):\s*\*(?:US\$|CA\$|\$)([\d,.]+)\*\s*Time:\s*\*([^*]+)\*/gi;

  let m: RegExpExecArray | null;
  while ((m = stockPattern.exec(clean)) !== null) {
    const [, action, symbol, shares, avgPrice, totalCost, timeStr] = m;
    const total = parseNum(totalCost);
    const qty = parseNum(shares);
    const price = parseNum(avgPrice);
    // Fees = total - (shares * avg price)
    const fees = Math.max(0, Math.round((total - qty * price) * 100) / 100);
    results.push({
      symbol: symbol.toUpperCase(),
      type: action.toLowerCase() === 'buy' ? 'buy' : 'sell',
      quantity: qty,
      price,
      fees,
      date: normalizeDate(timeStr.trim()),
      notes: 'Imported from Wealthsimple email',
      accountName,
    });
  }

  // Wealthsimple options: Type: *Limit* *Sell* *to Open* Option: *TSLA 335.00 call* Contracts: *2* Expiry: *2025-07-25* Average price: *US$8.90* Total value: *US$1,778.50* Time: *...*
  const optionPattern = /Type:\s*\*[^*]*\*\s*\*(Buy|Sell)\*\s*\*to\s+(Open|Close)\*\s*Option:\s*\*([A-Z]{1,10})\s+([\d,.]+)\s+(call|put)\*\s*Contracts:\s*\*([\d,.]+)\*\s*Expiry:\s*\*([^*]+)\*\s*Average price:\s*\*(?:US\$|CA\$|\$)([\d,.]+)\*\s*Total value:\s*\*(?:US\$|CA\$|\$)([\d,.]+)\*\s*Time:\s*\*([^*]+)\*/gi;

  while ((m = optionPattern.exec(clean)) !== null) {
    const [, action, openClose, underlying, strike, callPut, contracts, expiry, avgPrice, totalVal, timeStr] = m;
    const qty = parseNum(contracts);
    const price = parseNum(avgPrice);
    const total = parseNum(totalVal);
    const fees = Math.max(0, Math.round((total - qty * price * 100) * 100) / 100);
    const isBuy = (action.toLowerCase() === 'buy' && openClose.toLowerCase() === 'open') ||
                  (action.toLowerCase() === 'sell' && openClose.toLowerCase() === 'close');
    results.push({
      symbol: `${underlying.toUpperCase()} ${strike} ${callPut.toUpperCase()} ${expiry}`,
      type: isBuy ? 'buy' : 'sell',
      quantity: qty,
      price: price * 100, // options price per contract (x100 shares)
      fees,
      date: normalizeDate(timeStr.trim()),
      notes: `Imported from Wealthsimple email (${action} to ${openClose})`,
      accountName,
    });
  }

  return results;
}

function parseGenericBroker(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];
  const accountName = extractAccountName(text);

  const patterns = [
    /you\s+(bought|sold)\s+([\d,.]+)\s+shares?\s+of\s+([A-Z]{1,5})\s+at\s+\$?([\d,.]+)/gi,
    /(buy|sell)\s+([\d,.]+)\s+([A-Z]{1,5})\s+@\s+\$?([\d,.]+)/gi,
    /executed:?\s+(bought|sold)\s+([\d,.]+)\s+([A-Z]{1,5})\s+@?\s+\$?([\d,.]+)/gi,
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
          accountName,
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
          accountName,
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

function extractAccountName(text: string): string | undefined {
  const patterns = [
    /Account:\s*\*([^*]+)\*/i,
    /Account:\s*([A-Za-z0-9][A-Za-z0-9 &'()\/.-]{0,80}?)(?=\s+(?:Type:|Symbol:|Shares:|Contracts:|Option:|Expiry:|Average price:|Total (?:cost|value):|Time:|Date:|$))/i,
    /(?:from|in)\s+your\s+([A-Za-z0-9][A-Za-z0-9 &'()\/.-]{0,80}?)\s+account/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const accountName = match?.[1]?.replace(/\s+/g, ' ').trim();
    if (accountName) return accountName;
  }

  return undefined;
}
