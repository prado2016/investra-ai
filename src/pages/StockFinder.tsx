import React, { useState } from 'react';
import type { Stock } from '../services/marketDataService';
import { marketDataService } from '../services/marketDataService';
import type { Signal } from '../services/analysisEngine';
import { analysisEngine } from '../services/analysisEngine';
import { useAIServices } from '../hooks/useAIServices';

interface AnalysisResult {
  stock: Stock;
  signal: Signal;
  aiInsight?: string;
}

type Universe = 'S&P 500' | 'NASDAQ-100' | 'TSX 60';

const StockFinder: React.FC = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe>('S&P 500');
  const { analyzeFinancialData, isInitialized, availableProviders } = useAIServices();

  const runAnalysis = async () => {
    setLoading(true);
    let stocks: Stock[] = [];
    switch (selectedUniverse) {
      case 'S&P 500':
        stocks = await marketDataService.getSP500();
        break;
      case 'NASDAQ-100':
        stocks = await marketDataService.getNASDAQ100();
        break;
      case 'TSX 60':
        stocks = await marketDataService.getTSX60();
        break;
    }

    const analysisResults: AnalysisResult[] = [];

    for (const stock of stocks) {
      const historicalData = await marketDataService.getHistoricalData(stock.symbol);
      if (historicalData.length > 0) {
        const signal = analysisEngine.smaCrossover(historicalData, 20, 50);
        analysisResults.push({ stock, signal });
      }
    }

    setResults(analysisResults);
    setLoading(false);
  };

  const getAIInsight = async (result: AnalysisResult) => {
    if (!isInitialized || availableProviders.length === 0) {
      alert('AI services are not available.');
      return;
    }

    const prompt = `Provide a brief investment insight for ${result.stock.name} (${result.stock.symbol}) which has a '${result.signal}' signal.`;
    const insightResult = await analyzeFinancialData({
      prompt,
      symbol: result.stock.symbol,
      analysisType: 'trend',
    });
    const insight = insightResult.insight;

    setResults((prevResults) =>
      prevResults.map((r) =>
        r.stock.symbol === result.stock.symbol ? { ...r, aiInsight: insight } : r
      )
    );
  };

  return (
    <div className="page-container">
      <h1>Stock Finder</h1>
      <div>
        <select value={selectedUniverse} onChange={(e) => setSelectedUniverse(e.target.value as Universe)}>
          <option value="S&P 500">S&P 500</option>
          <option value="NASDAQ-100">NASDAQ-100</option>
          <option value="TSX 60">TSX 60</option>
        </select>
        <button onClick={runAnalysis} disabled={loading}>
          {loading ? 'Analyzing...' : `Run ${selectedUniverse} Analysis`}
        </button>
      </div>

      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Exchange</th>
              <th>Signal</th>
              <th>AI Insight</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.stock.symbol}>
                <td>{result.stock.symbol}</td>
                <td>{result.stock.name}</td>
                <td>{result.stock.exchange}</td>
                <td>{result.signal}</td>
                <td>
                  {result.aiInsight ? (
                    result.aiInsight
                  ) : (
                    <button onClick={() => getAIInsight(result)}>Get Insight</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StockFinder;