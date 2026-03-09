// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { encryptStoredSecret } from '../lib/credentialVault.js';
import type { AuthUser } from '../middleware/requireAuth.js';

vi.mock('../db/queries/emailConfigs.js', () => ({
  emailConfigQueries: {
    getByUser: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    getLogs: vi.fn(),
  },
}));

vi.mock('../db/queries/portfolios.js', () => ({
  portfolioQueries: {
    get: vi.fn(),
  },
}));

import { emailConfigQueries } from '../db/queries/emailConfigs.js';
import { portfolioQueries } from '../db/queries/portfolios.js';
import settingsRouter from './settings.js';

const TEST_USER: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
};

function createApp() {
  const app = new Hono<{ Variables: { user: AuthUser } }>();
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER);
    await next();
  });
  app.route('/settings', settingsRouter);
  return app;
}

describe('settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_CREDENTIALS_SECRET = 'test-email-secret';
  });

  it('reuses the existing encrypted password when editing without a new password', async () => {
    const encryptedPassword = encryptStoredSecret('keep-me');
    vi.mocked(emailConfigQueries.getByUser).mockReturnValue({
      id: 'cfg-1',
      userId: TEST_USER.id,
      provider: 'custom',
      imapHost: 'imap.old.test',
      imapPort: 993,
      emailAddress: 'user@example.com',
      encryptedPassword,
      defaultPortfolioId: null,
      createdAt: new Date(),
    });
    vi.mocked(emailConfigQueries.upsert).mockResolvedValue({
      id: 'cfg-1',
      userId: TEST_USER.id,
      provider: 'custom',
      imapHost: 'imap.new.test',
      imapPort: 993,
      emailAddress: 'user@example.com',
      encryptedPassword,
      defaultPortfolioId: null,
      createdAt: new Date(),
    });

    const app = createApp();
    const response = await app.request('/settings/email-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imapHost: 'imap.new.test',
        imapPort: 993,
        emailAddress: 'user@example.com',
        password: '',
      }),
    });

    expect(response.status).toBe(200);
    expect(emailConfigQueries.upsert).toHaveBeenCalledWith(
      TEST_USER.id,
      expect.objectContaining({
        encryptedPassword,
        imapHost: 'imap.new.test',
      }),
    );
  });

  it('rejects a default portfolio that does not belong to the user', async () => {
    vi.mocked(emailConfigQueries.getByUser).mockReturnValue(undefined);
    vi.mocked(portfolioQueries.get).mockReturnValue({
      id: 'portfolio-2',
      userId: 'another-user',
      name: 'Other',
      parentPortfolioId: null,
      currency: 'USD',
      isDefault: false,
      createdAt: new Date(),
    });

    const app = createApp();
    const response = await app.request('/settings/email-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imapHost: 'imap.test',
        imapPort: 993,
        emailAddress: 'user@example.com',
        password: 'new-password',
        defaultPortfolioId: 'portfolio-2',
      }),
    });

    expect(response.status).toBe(400);
    expect(emailConfigQueries.upsert).not.toHaveBeenCalled();
  });
});
