import yahooFinance from 'yahoo-finance2';

export interface Stock {
    symbol: string;
    name: string;
    exchange: string;
  }
  
  export interface HistoricalData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  
  // This service will be responsible for fetching market data.
  export const marketDataService = {
    getSP500: async (): Promise<Stock[]> => {
      // For now, return a static list of stocks.
      // In the future, this could fetch from an API.
      return Promise.resolve([
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
        { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
      ]);
    },

    getNASDAQ100: async (): Promise<Stock[]> => {
        return Promise.resolve([
            { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ' },
            { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ' },
            { symbol: 'CSCO', name: 'Cisco Systems, Inc.', exchange: 'NASDAQ' },
            { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' },
            { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
        ]);
    },

    getTSX60: async (): Promise<Stock[]> => {
        return Promise.resolve([
            { symbol: 'BCE.TO', name: 'BCE Inc.', exchange: 'TSX' },
            { symbol: 'BNS.TO', name: 'The Bank of Nova Scotia', exchange: 'TSX' },
            { symbol: 'CNQ.TO', name: 'Canadian Natural Resources Limited', exchange: 'TSX' },
            { symbol: 'ENB.TO', name: 'Enbridge Inc.', exchange: 'TSX' },
            { symbol: 'RY.TO', name: 'Royal Bank of Canada', exchange: 'TSX' },
        ]);
    },

    getHistoricalData: async (symbol: string): Promise<HistoricalData[]> => {
        try {
          const to = new Date();
          const from = new Date();
          from.setFullYear(from.getFullYear() - 1); // 1 year of data
    
          const result = await yahooFinance.historical(symbol, {
            period1: from.toISOString().split('T')[0],
            period2: to.toISOString().split('T')[0],
            interval: '1d',
          });
    
          return result.map((item: any) => ({
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
          }));
        } catch (error) {
          console.error(`Failed to fetch historical data for ${symbol}`, error);
          return [];
        }
      },
  };