import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { Dashboard } from './features/dashboard/Dashboard.js';
import { TransactionsPage } from './features/transactions/TransactionsPage.js';
import { PositionsPage } from './features/positions/PositionsPage.js';
import { ImportPage } from './features/import/ImportPage.js';
import { SettingsPage } from './features/settings/SettingsPage.js';
import { useAuthStore } from './stores/authStore.js';
import { usePortfolioStore } from './stores/portfolioStore.js';
import { api } from './lib/apiClient.js';
import { PageSpinner } from './components/Spinner.js';
import type { Portfolio, User } from './types/index.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { setPortfolios } = usePortfolioStore();

  useEffect(() => {
    api.get<{ user: User } | null>('/auth/get-session')
      .then(async (data) => {
        setUser(data?.user ?? null);
        if (data?.user) {
          const portfolios = await api.get<Portfolio[]>('/portfolios');
          setPortfolios(portfolios);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser, setLoading, setPortfolios]);

  if (loading) return <div className="flex h-screen items-center justify-center"><PageSpinner /></div>;
  if (!user) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="positions" element={<PositionsPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
