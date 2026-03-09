import { portfolioQueries } from '../db/queries/portfolios.js';

type PortfolioRecord = NonNullable<ReturnType<typeof portfolioQueries.get>>;

export interface PortfolioScope {
  portfolio: PortfolioRecord;
  portfolioIds: string[];
  childPortfolios: Awaited<ReturnType<typeof portfolioQueries.listChildren>>;
  isAggregate: boolean;
}

export async function getPortfolioScope(userId: string, portfolioId: string): Promise<PortfolioScope | null> {
  const portfolio = portfolioQueries.get(portfolioId);
  if (!portfolio || portfolio.userId !== userId) return null;

  if (portfolio.parentPortfolioId) {
    return {
      portfolio,
      portfolioIds: [portfolio.id],
      childPortfolios: [],
      isAggregate: false,
    };
  }

  const childPortfolios = await portfolioQueries.listChildren(portfolio.id);
  return {
    portfolio,
    portfolioIds: [portfolio.id, ...childPortfolios.map((child) => child.id)],
    childPortfolios,
    isAggregate: childPortfolios.length > 0,
  };
}
