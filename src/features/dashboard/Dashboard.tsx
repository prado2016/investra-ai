import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import { enrichPositions, calcPortfolioSummary } from '../../utils/pl.js';
import { formatCurrency, formatPercent } from '../../utils/format.js';
import { PageSpinner } from '../../components/Spinner.js';
import type { Position, QuoteMap } from '../../types/index.js';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
  icon: React.ReactNode;
}

function MetricCard({ label, value, sub, positive, icon }: MetricCardProps) {
  const subColor = positive === null || positive === undefined
    ? 'text-zinc-500'
    : positive ? 'text-green-600' : 'text-red-600';
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="text-zinc-400">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {sub && <p className={`mt-1 text-xs font-medium ${subColor}`}>{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const { activePortfolioId } = usePortfolioStore();

  const { data: positions = [], isLoading: loadingPos } = useQuery({
    queryKey: ['positions', activePortfolioId],
    queryFn: () => api.get<Position[]>(`/positions?portfolioId=${activePortfolioId}`),
    enabled: !!activePortfolioId,
  });

  const symbols = positions.map((p) => p.symbol);
  const { data: quotes = {} } = useQuery({
    queryKey: ['quotes', symbols.join(',')],
    queryFn: () => api.get<QuoteMap>(`/market/quotes?symbols=${symbols.join(',')}`),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
  });

  if (!activePortfolioId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-zinc-500">No portfolio selected. Create one in Settings.</p>
      </div>
    );
  }

  if (loadingPos) return <PageSpinner />;

  const enriched = enrichPositions(positions, quotes);
  const summary = calcPortfolioSummary(enriched);

  const topPositions = [...enriched]
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
    .slice(0, 5);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Dashboard</h1>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(summary.totalValue)}
          icon={<DollarSign size={18} />}
        />
        <MetricCard
          label="Unrealized P&L"
          value={formatCurrency(summary.unrealizedPl)}
          sub={formatPercent(summary.unrealizedPlPercent)}
          positive={summary.unrealizedPl >= 0 ? true : false}
          icon={summary.unrealizedPl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        />
        <MetricCard
          label="Realized P&L"
          value={formatCurrency(summary.realizedPl)}
          positive={summary.realizedPl >= 0 ? true : false}
          icon={<BarChart2 size={18} />}
        />
        <MetricCard
          label="Daily Change"
          value={formatCurrency(summary.dailyChange)}
          sub={formatPercent(summary.dailyChangePercent)}
          positive={summary.dailyChange >= 0 ? true : false}
          icon={summary.dailyChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        />
      </div>

      {/* Top positions */}
      {topPositions.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Top Holdings</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                <th className="px-5 py-3 text-left font-medium">Symbol</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Value</th>
                <th className="px-5 py-3 text-right font-medium">P&L</th>
                <th className="px-5 py-3 text-right font-medium">Day</th>
              </tr>
            </thead>
            <tbody>
              {topPositions.map((p) => (
                <tr key={p.assetId} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{p.symbol}</p>
                    <p className="text-xs text-zinc-500">{p.quantity} shares</p>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-700">
                    {p.currentPrice ? formatCurrency(p.currentPrice) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-900">
                    {p.marketValue ? formatCurrency(p.marketValue) : '—'}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${(p.unrealizedPl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.unrealizedPl !== undefined ? formatCurrency(p.unrealizedPl) : '—'}
                  </td>
                  <td className={`px-5 py-3 text-right ${(p.dailyChangePercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.dailyChangePercent !== undefined ? formatPercent(p.dailyChangePercent) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {topPositions.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-zinc-500">No positions yet. Add transactions to get started.</p>
        </div>
      )}
    </div>
  );
}
