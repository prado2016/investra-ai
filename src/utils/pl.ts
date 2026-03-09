import type { Position, QuoteMap, PortfolioSummary } from '../types/index.js';

export function enrichPositions(positions: Position[], quotes: QuoteMap): Position[] {
  return positions.map((p) => {
    const q = quotes[p.symbol];
    if (!q) return p;
    const marketValue = p.quantity * q.price;
    const costBasisTotal = p.quantity * p.avgCostBasis;
    const unrealizedPl = marketValue - costBasisTotal;
    const unrealizedPlPercent = Math.abs(costBasisTotal) > 0
      ? (unrealizedPl / Math.abs(costBasisTotal)) * 100
      : 0;
    const dailyChange = q.change * p.quantity;
    const previousMarketValue = p.quantity * (q.price - q.change);
    const dailyChangePercent = Math.abs(previousMarketValue) > 0
      ? (dailyChange / Math.abs(previousMarketValue)) * 100
      : 0;
    return {
      ...p,
      currentPrice: q.price,
      dailyChange,
      dailyChangePercent,
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
  let previousAbsoluteValue = 0;
  let realizedPl = 0;

  for (const p of positions) {
    totalValue += p.marketValue ?? 0;
    totalCost += p.quantity * p.avgCostBasis;
    dailyChange += p.dailyChange ?? 0;
    previousAbsoluteValue += Math.abs((p.marketValue ?? 0) - (p.dailyChange ?? 0));
    realizedPl += p.realizedPl;
  }

  const unrealizedPl = totalValue - totalCost;
  const unrealizedPlPercent = Math.abs(totalCost) > 0
    ? (unrealizedPl / Math.abs(totalCost)) * 100
    : 0;
  const dailyChangePercent = previousAbsoluteValue > 0 ? (dailyChange / previousAbsoluteValue) * 100 : 0;

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
