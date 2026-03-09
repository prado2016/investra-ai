import { Hono } from 'hono';
import { emailConfigQueries } from '../db/queries/emailConfigs.js';
import type { AuthUser } from '../middleware/requireAuth.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/email-config', async (c) => {
  const user = c.get('user');
  const config = emailConfigQueries.getByUser(user.id);
  if (!config) return c.json(null);
  // Never return the password
  const safe = { ...config };
  delete safe.encryptedPassword;
  return c.json(safe);
});

app.put('/email-config', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    provider?: string;
    imapHost: string;
    imapPort?: number;
    emailAddress: string;
    password: string;
    defaultPortfolioId?: string;
  }>();

  if (!body.imapHost || !body.emailAddress || !body.password) {
    return c.json({ error: 'imapHost, emailAddress, and password are required' }, 400);
  }

  const config = await emailConfigQueries.upsert(user.id, {
    provider: body.provider,
    imapHost: body.imapHost,
    imapPort: body.imapPort,
    emailAddress: body.emailAddress,
    encryptedPassword: body.password, // TODO: encrypt at rest
    defaultPortfolioId: body.defaultPortfolioId,
  });

  const safe = { ...config! };
  delete safe.encryptedPassword;
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
