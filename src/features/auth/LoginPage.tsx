import { useState } from 'react';
import { Input } from '../../components/Input.js';
import { Button } from '../../components/Button.js';
import { Alert } from '../../components/Alert.js';
import { useAuthStore } from '../../stores/authStore.js';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import type { Portfolio, User } from '../../types/index.js';

type Mode = 'signin' | 'signup';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuthStore();
  const { setPortfolios } = usePortfolioStore();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await api.post('/auth/sign-up/email', { email, password, name });
      }
      const res = await api.post<{ user: User }>('/auth/sign-in/email', { email, password });
      setUser(res.user);
      const portfolios = await api.get<Portfolio[]>('/portfolios');
      setPortfolios(portfolios);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Investra</h1>
          <p className="mt-1 text-sm text-zinc-500">Portfolio tracking, locally</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-zinc-900">
            {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
          </h2>

          {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <Button type="submit" loading={loading} className="w-full justify-center">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
