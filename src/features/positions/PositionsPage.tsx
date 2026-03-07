import { useQuery } from '@tanstack/react-query';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import { enrichPositions } from '../../utils/pl.js';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/format.js';
import { PageSpinner } from '../../components/Spinner.js';
import type { Position, QuoteMap } from '../../types/index.js';

export function PositionsPage() {
  const { activePortfolioId } = usePortfolioStore();

  const { data: positions = [], isLoading } = useQuery({
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
    return <div className="flex h-64 items-center justify-center"><p className="text-zinc-500">No portfolio selected.</p></div>;
  }

  if (isLoading) return <PageSpinner />;

  const enriched = enrichPositions(positions, quotes);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Positions</h1>
        <p className="text-sm text-zinc-500">{enriched.length} holdings</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        {enriched.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No open positions.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                <th className="px-5 py-3 text-left font-medium">Symbol</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
                <th className="px-5 py-3 text-right font-medium">Avg Cost</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Market Value</th>
                <th className="px-5 py-3 text-right font-medium">Unrealized P&L</th>
                <th className="px-5 py-3 text-right font-medium">Day Change</th>
                <th className="px-5 py-3 text-right font-medium">Realized P&L</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((p) => {
                const plPos = (p.unrealizedPl ?? 0) >= 0;
                const dayPos = (p.dailyChangePercent ?? 0) >= 0;
                return (
                  <tr key={p.assetId} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900">{p.symbol}</p>
                      <p className="text-xs text-zinc-500">{p.assetName}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-700">{formatNumber(p.quantity)}</td>
                    <td className="px-5 py-3 text-right text-zinc-700">{formatCurrency(p.avgCostBasis)}</td>
                    <td className="px-5 py-3 text-right text-zinc-700">
                      {p.currentPrice ? formatCurrency(p.currentPrice) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {p.marketValue ? formatCurrency(p.marketValue) : '—'}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${plPos ? 'text-green-600' : 'text-red-600'}`}>
                      <div>{p.unrealizedPl !== undefined ? formatCurrency(p.unrealizedPl) : '—'}</div>
                      {p.unrealizedPlPercent !== undefined && (
                        <div className="text-xs">{formatPercent(p.unrealizedPlPercent)}</div>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-right ${dayPos ? 'text-green-600' : 'text-red-600'}`}>
                      {p.dailyChangePercent !== undefined ? formatPercent(p.dailyChangePercent) : '—'}
                    </td>
                    <td className={`px-5 py-3 text-right ${p.realizedPl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(p.realizedPl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
