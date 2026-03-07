import type { Context, Next } from 'hono';
import { auth } from '../auth.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', session.user as AuthUser);
  await next();
}
