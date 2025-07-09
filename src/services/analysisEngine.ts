
import type { HistoricalData } from './marketDataService';

export type Signal = 'Buy' | 'Sell' | 'Hold';

// This service will contain the logic for our analysis strategies.

const calculateSMA = (data: number[], period: number): (number | null)[] => {
    if (period > data.length) {
      return new Array(data.length).fill(null);
    }
  
    const sma: (number | null)[] = new Array(period - 1).fill(null);
    let sum = 0;
  
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    sma.push(sum / period);
  
    for (let i = period; i < data.length; i++) {
      sum -= data[i - period];
      sum += data[i];
      sma.push(sum / period);
    }
  
    return sma;
  };

export const analysisEngine = {
    smaCrossover: (historicalData: HistoricalData[], shortPeriod: number, longPeriod: number): Signal => {
        const closePrices = historicalData.map(d => d.close);
        const shortSMA = calculateSMA(closePrices, shortPeriod);
        const longSMA = calculateSMA(closePrices, longPeriod);
    
        const lastShortSMA = shortSMA[shortSMA.length - 1];
        const lastLongSMA = longSMA[longSMA.length - 1];
        const prevShortSMA = shortSMA[shortSMA.length - 2];
        const prevLongSMA = longSMA[longSMA.length - 2];
    
        if (lastShortSMA && lastLongSMA && prevShortSMA && prevLongSMA) {
          if (prevShortSMA <= prevLongSMA && lastShortSMA > lastLongSMA) {
            return 'Buy';
          }
          if (prevShortSMA >= prevLongSMA && lastShortSMA < lastLongSMA) {
            return 'Sell';
          }
        }
    
        return 'Hold';
      },
};
