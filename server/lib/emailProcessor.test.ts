// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/queries/portfolios.js', () => ({
  portfolioQueries: {
    create: vi.fn(),
    setDefault: vi.fn(),
  },
}));

vi.mock('../db/queries/emailConfigs.js', () => ({
  emailConfigQueries: {
    getByUser: vi.fn(),
    getLogs: vi.fn(),
    logEmail: vi.fn(),
  },
}));

vi.mock('../db/queries/transactions.js', () => ({
  transactionQueries: {
    create: vi.fn(),
  },
}));

vi.mock('./positions.js', () => ({
  ensureAsset: vi.fn(),
  recalcPositions: vi.fn(),
}));

vi.mock('./emailParser.js', () => ({
  parseEmailText: vi.fn(),
}));

vi.mock('./credentialVault.js', () => ({
  decryptStoredSecret: vi.fn(),
}));

vi.mock('./syncStore.js', () => ({
  syncStore: {
    update: vi.fn(),
  },
}));

import { portfolioQueries } from '../db/queries/portfolios.js';
import { normalizePortfolioKey, resolvePortfolioIdForAccount } from './emailProcessor.js';

describe('emailProcessor account routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the fallback portfolio when the email has no account', async () => {
    const portfolioIdsByKey = new Map<string, string>([['tfsa', 'portfolio-1']]);

    const portfolioId = await resolvePortfolioIdForAccount({
      userId: 'user-1',
      importRootPortfolioId: 'root-portfolio',
      portfolioIdsByKey,
    });

    expect(portfolioId).toBe('root-portfolio');
    expect(portfolioQueries.create).not.toHaveBeenCalled();
  });

  it('matches an existing portfolio name case-insensitively', async () => {
    const portfolioIdsByKey = new Map<string, string>([['tfsa', 'portfolio-1']]);

    const portfolioId = await resolvePortfolioIdForAccount({
      userId: 'user-1',
      importRootPortfolioId: 'root-portfolio',
      accountName: '  TFSA  ',
      portfolioIdsByKey,
    });

    expect(portfolioId).toBe('portfolio-1');
    expect(portfolioQueries.create).not.toHaveBeenCalled();
  });

  it('creates a new portfolio when the email account does not exist yet', async () => {
    vi.mocked(portfolioQueries.create).mockResolvedValue({
      id: 'portfolio-2',
      userId: 'user-1',
      name: 'RRSP',
      currency: 'USD',
      parentPortfolioId: 'root-portfolio',
      isDefault: false,
      createdAt: new Date(),
    });

    const portfolioIdsByKey = new Map<string, string>([['tfsa', 'portfolio-1']]);

    const portfolioId = await resolvePortfolioIdForAccount({
      userId: 'user-1',
      importRootPortfolioId: 'root-portfolio',
      accountName: 'RRSP',
      portfolioIdsByKey,
    });

    expect(portfolioId).toBe('portfolio-2');
    expect(portfolioQueries.create).toHaveBeenCalledWith('user-1', {
      name: 'RRSP',
      parentPortfolioId: 'root-portfolio',
    });
    expect(portfolioIdsByKey.get(normalizePortfolioKey('RRSP'))).toBe('portfolio-2');
  });
});
