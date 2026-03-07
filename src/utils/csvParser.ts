import type { CsvImportRow, TransactionType } from '../types/index.js';

/**
 * Parse a CSV string into import rows.
 * Supports common broker export formats.
 *
 * Expected columns (case-insensitive, flexible order):
 *   symbol, type/action, quantity/shares, price, fees/commission, date, notes
 */
export function parseCsv(raw: string): { rows: CsvImportRow[]; errors: string[] } {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], errors: ['File appears empty'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows: CsvImportRow[] = [];
  const errors: string[] = [];

  const col = (name: string, aliases: string[] = []) => {
    const all = [name, ...aliases];
    const idx = headers.findIndex((h) => all.includes(h));
    return idx;
  };

  const symbolIdx = col('symbol', ['ticker']);
  const typeIdx = col('type', ['action', 'transaction type', 'side']);
  const qtyIdx = col('quantity', ['shares', 'qty', 'amount']);
  const priceIdx = col('price', ['unit price', 'executed price', 'avg price']);
  const feesIdx = col('fees', ['commission', 'fee']);
  const dateIdx = col('date', ['trade date', 'settlement date']);
  const notesIdx = col('notes', ['description', 'memo']);

  if (symbolIdx === -1) return { rows: [], errors: ['Missing "symbol" column'] };
  if (typeIdx === -1) return { rows: [], errors: ['Missing "type" or "action" column'] };
  if (qtyIdx === -1) return { rows: [], errors: ['Missing "quantity" or "shares" column'] };
  if (priceIdx === -1) return { rows: [], errors: ['Missing "price" column'] };
  if (dateIdx === -1) return { rows: [], errors: ['Missing "date" column'] };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCsvLine(line);
    const get = (idx: number) => (idx >= 0 ? cols[idx]?.replace(/['"]/g, '').trim() ?? '' : '');

    const symbol = get(symbolIdx).toUpperCase();
    const rawType = get(typeIdx).toLowerCase();
    const quantity = parseFloat(get(qtyIdx).replace(/,/g, ''));
    const price = parseFloat(get(priceIdx).replace(/[$,]/g, ''));
    const fees = feesIdx >= 0 ? parseFloat(get(feesIdx).replace(/[$,]/g, '')) || 0 : 0;
    const rawDate = get(dateIdx);
    const notes = get(notesIdx);

    if (!symbol) { errors.push(`Row ${i + 1}: missing symbol`); continue; }
    if (isNaN(quantity)) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    if (isNaN(price)) { errors.push(`Row ${i + 1}: invalid price`); continue; }

    const type = normalizeType(rawType);
    if (!type) { errors.push(`Row ${i + 1}: unknown type "${get(typeIdx)}"`); continue; }

    const date = normalizeDate(rawDate);
    if (!date) { errors.push(`Row ${i + 1}: invalid date "${rawDate}"`); continue; }

    rows.push({ symbol, type, quantity: Math.abs(quantity), price, fees, date, notes: notes || undefined });
  }

  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += char;
  }
  result.push(current);
  return result;
}

function normalizeType(raw: string): TransactionType | null {
  if (/^(buy|bought|purchase)/.test(raw)) return 'buy';
  if (/^(sell|sold)/.test(raw)) return 'sell';
  if (/^(div|dividend)/.test(raw)) return 'dividend';
  if (/^(split)/.test(raw)) return 'split';
  if (/^(transfer.?in|deposit)/.test(raw)) return 'transfer_in';
  if (/^(transfer.?out|withdrawal|withdraw)/.test(raw)) return 'transfer_out';
  return null;
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  // Try MM/DD/YYYY
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const d2 = new Date(`${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
    if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
  }
  return null;
}
