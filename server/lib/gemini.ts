import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SymbolResult {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
}

export async function lookupSymbol(query: string, apiKey: string): Promise<SymbolResult[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a financial data assistant. Given the search query "${query}", return the top 5 most likely matching stock/ETF/crypto symbols.

Respond ONLY with a JSON array, no markdown, no explanation. Example:
[{"symbol":"AAPL","name":"Apple Inc.","exchange":"NASDAQ","assetType":"stock"}]

Query: ${query}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip markdown code blocks if present
    const json = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(json) as SymbolResult[];
  } catch {
    return [];
  }
}
