import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Upload, Settings, LogOut, ChevronDown } from 'lucide-react';
import { usePortfolioStore } from '../stores/portfolioStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../lib/apiClient.js';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/positions', label: 'Positions', icon: TrendingUp },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout() {
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { user, setUser } = useAuthStore();
  const masterPortfolios = portfolios.filter((portfolio) => !portfolio.parentPortfolioId);

  async function signOut() {
    await api.post('/auth/sign-out', {});
    setUser(null);
  }

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-zinc-200 bg-white">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-zinc-200 px-5">
          <span className="text-base font-semibold text-zinc-900">Investra</span>
        </div>

        {/* Portfolio selector */}
        <div className="border-b border-zinc-200 px-3 py-3">
          <div className="relative">
            <select
              value={activePortfolioId ?? ''}
              onChange={(e) => setActivePortfolio(e.target.value)}
              className="w-full appearance-none rounded-md border border-zinc-200 bg-zinc-50 py-2 pl-3 pr-8 text-sm text-zinc-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
            >
              {masterPortfolios.flatMap((masterPortfolio) => {
                const childAccounts = portfolios.filter((portfolio) => portfolio.parentPortfolioId === masterPortfolio.id);
                return [
                  <option key={masterPortfolio.id} value={masterPortfolio.id}>{masterPortfolio.name}</option>,
                  ...childAccounts.map((account) => (
                    <option key={account.id} value={account.id}>- {account.name}</option>
                  )),
                ];
              })}
              {portfolios.length === 0 && <option value="">No portfolios</option>}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-2.5 text-zinc-400" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-0.5
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-zinc-200 px-3 py-3">
          <div className="flex items-center justify-between rounded-md px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{user?.name}</p>
              <p className="truncate text-xs text-zinc-500">{user?.email}</p>
            </div>
            <button onClick={signOut} title="Sign out" className="text-zinc-400 hover:text-zinc-600 transition-colors ml-2">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
