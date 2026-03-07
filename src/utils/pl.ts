import type { Position, QuoteMap, PortfolioSummary } from '../types/index.js';

export function enrichPositions(positions: Position[], quotes: QuoteMap): Position[] {
  return positions.map((p) => {
    const q = quotes[p.symbol];
    if (!q) return p;
    const marketValue = p.quantity * q.price;
    const costBasisTotal = p.quantity * p.avgCostBasis;
    const unrealizedPl = marketValue - costBasisTotal;
    const unrealizedPlPercent = costBasisTotal > 0 ? (unrealizedPl / costBasisTotal) * 100 : 0;
    return {
      ...p,
      currentPrice: q.price,
      dailyChange: q.change,
      dailyChangePercent: q.changePercent,
      marketValue,
      unrealizedPl,
      unrealizedPlPercent,
    };
  });
}

export function calcPortfolioSummary(positions: Position[]): PortfolioSummary {
  let totalValue = 0;
  let totalCost = 0;
  let dailyChange = 0;
  let realizedPl = 0;

  for (const p of positions) {
    totalValue += p.marketValue ?? 0;
    totalCost += p.quantity * p.avgCostBasis;
    dailyChange += (p.dailyChange ?? 0) * p.quantity;
    realizedPl += p.realizedPl;
  }

  const unrealizedPl = totalValue - totalCost;
  const unrealizedPlPercent = totalCost > 0 ? (unrealizedPl / totalCost) * 100 : 0;
  const dailyChangePercent = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;

  return {
    totalValue,
    totalCost,
    unrealizedPl,
    unrealizedPlPercent,
    realizedPl,
    dailyChange,
    dailyChangePercent,
    positionCount: positions.length,
  };
}
