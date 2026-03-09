import { Hono } from 'hono';
import { emailConfigQueries } from '../db/queries/emailConfigs.js';
import { portfolioQueries } from '../db/queries/portfolios.js';
import { encryptStoredSecret } from '../lib/credentialVault.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/email-config', async (c) => {
  const user = c.get('user');
  const config = emailConfigQueries.getByUser(user.id);
  if (!config) return c.json(null);
  const { encryptedPassword: _encryptedPassword, ...safe } = config;
  void _encryptedPassword;
  return c.json(safe);
});

app.put('/email-config', async (c) => {
  const user = c.get('user');
  const existing = emailConfigQueries.getByUser(user.id);
  const body = await c.req.json<{
    provider?: string;
    imapHost: string;
    imapPort?: number;
    emailAddress: string;
    password?: string;
    defaultPortfolioId?: string;
  }>();

  if (!body.imapHost || !body.emailAddress || (!existing && !body.password)) {
    return c.json({ error: 'imapHost, emailAddress, and password are required when creating a config' }, 400);
  }

  if (body.defaultPortfolioId) {
    const portfolio = portfolioQueries.get(body.defaultPortfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return c.json({ error: 'defaultPortfolioId must belong to the current user' }, 400);
    }
  }

  const config = await emailConfigQueries.upsert(user.id, {
    provider: body.provider,
    imapHost: body.imapHost,
    imapPort: body.imapPort,
    emailAddress: body.emailAddress,
    encryptedPassword: body.password
      ? encryptStoredSecret(body.password)
      : existing!.encryptedPassword,
    defaultPortfolioId: body.defaultPortfolioId,
  });

  const { encryptedPassword: _encryptedPassword, ...safe } = config!;
  void _encryptedPassword;
  return c.json(safe);
});

app.delete('/email-config', async (c) => {
  const user = c.get('user');
  await emailConfigQueries.delete(user.id);
  return c.json({ success: true });
});

app.get('/email-logs', async (c) => {
  const user = c.get('user');
  const logs = await emailConfigQueries.getLogs(user.id);
  return c.json(logs);
});

export default app;
