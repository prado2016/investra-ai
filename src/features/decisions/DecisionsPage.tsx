import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCcw, Play, Clock3, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { PageSpinner } from '../../components/Spinner.js';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { formatDate } from '../../utils/format.js';
import type { DecisionEvent, DecisionInsight, DecisionRun, DecisionSyncResult } from '../../types/index.js';

function prettifyLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function statusTone(status: DecisionRun['status']) {
  switch (status) {
    case 'complete':
      return 'bg-green-50 text-green-700';
    case 'syncing':
      return 'bg-blue-50 text-blue-700';
    case 'accepted':
      return 'bg-indigo-50 text-indigo-700';
    case 'partial_error':
      return 'bg-amber-50 text-amber-700';
    case 'failed':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="text-zinc-400">{icon}</div>
      <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export function DecisionsPage() {
  const queryClient = useQueryClient();
  const { activePortfolioId, activePortfolio } = usePortfolioStore();
  const portfolio = activePortfolio();
  const isMasterPortfolio = Boolean(portfolio && !portfolio.parentPortfolioId);

  const { data: runs = [], isLoading: loadingRuns } = useQuery({
    queryKey: ['decision-runs', activePortfolioId],
    queryFn: () => api.get<DecisionRun[]>(`/decisions/runs?portfolioId=${activePortfolioId}`),
    enabled: !!activePortfolioId && isMasterPortfolio,
  });

  const latestRun = runs[0];

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['decision-events', latestRun?.id],
    queryFn: () => api.get<DecisionEvent[]>(`/decisions/runs/${latestRun?.id}/events`),
    enabled: !!latestRun?.id,
  });

  const { data: insights = [], isLoading: loadingInsights } = useQuery({
    queryKey: ['decision-insights', latestRun?.id],
    queryFn: () => api.get<DecisionInsight[]>(`/decisions/runs/${latestRun?.id}/insights`),
    enabled: !!latestRun?.id,
  });

  const createRun = useMutation({
    mutationFn: () => api.post<DecisionRun>('/decisions/runs', {
      portfolioId: activePortfolioId,
      idempotencyKey: crypto.randomUUID(),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['decision-runs', activePortfolioId] });
    },
  });

  const syncRun = useMutation({
    mutationFn: (runId: string) => api.post<DecisionSyncResult>(`/decisions/runs/${runId}/sync`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['decision-runs', activePortfolioId] });
      if (latestRun?.id) {
        await queryClient.invalidateQueries({ queryKey: ['decision-events', latestRun.id] });
        await queryClient.invalidateQueries({ queryKey: ['decision-insights', latestRun.id] });
      }
    },
  });

  if (!activePortfolioId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-zinc-500">No portfolio selected. Create one in Settings.</p>
      </div>
    );
  }

  if (!isMasterPortfolio) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900">Decisions</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-zinc-900">Select a master portfolio to run analysis.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Child accounts inherit into the master view, but decision runs are created only at the master portfolio level.
          </p>
        </div>
      </div>
    );
  }

  if (loadingRuns) return <PageSpinner />;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Decisions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Read-only autonomous desk analysis for the selected master portfolio.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createRun.mutate()}
            disabled={createRun.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={15} />
            {createRun.isPending ? 'Starting...' : 'Run Analysis'}
          </button>
          {latestRun && (
            <button
              onClick={() => syncRun.mutate(latestRun.id)}
              disabled={syncRun.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={15} />
              {syncRun.isPending ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {(createRun.error || syncRun.error) && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(createRun.error instanceof Error ? createRun.error.message : null)
            ?? (syncRun.error instanceof Error ? syncRun.error.message : 'Decision request failed')}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Portfolio"
          value={portfolio?.name ?? '—'}
          icon={<ShieldCheck size={18} />}
        />
        <MetricCard
          label="Runs"
          value={String(runs.length)}
          icon={<Clock3 size={18} />}
        />
        <MetricCard
          label="Latest Status"
          value={latestRun ? prettifyLabel(latestRun.status) : 'No runs'}
          icon={<RefreshCcw size={18} />}
        />
        <MetricCard
          label="Events"
          value={String(events.length)}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {latestRun && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Latest run</p>
              <p className="mt-1 text-sm text-zinc-500">
                Requested {formatDate(latestRun.requestedAt)}.
                {latestRun.externalSessionId ? ` Desk session ${latestRun.externalSessionId}.` : ' Awaiting desk session.'}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(latestRun.status)}`}>
              {prettifyLabel(latestRun.status)}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Snapshot hash</dt>
              <dd className="font-mono text-zinc-900">{latestRun.snapshotHash.slice(0, 16)}...</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Schema version</dt>
              <dd className="text-zinc-900">{latestRun.schemaVersion}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Accounts in snapshot</dt>
              <dd className="text-zinc-900">{latestRun.snapshot?.accounts.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Positions in snapshot</dt>
              <dd className="text-zinc-900">{latestRun.snapshot?.positions.length ?? 0}</dd>
            </div>
          </dl>

          {latestRun.errorMessage && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {latestRun.errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Insights</h2>
          </div>

          {(loadingInsights || loadingEvents) && <PageSpinner />}

          {!loadingInsights && latestRun && insights.length === 0 && (
            <div className="px-5 py-8 text-sm text-zinc-500">
              No derived insights yet. Refresh the run after the desk starts emitting structured analysis events.
            </div>
          )}

          {!loadingInsights && insights.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {insights.map((insight) => (
                <div key={insight.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900">{insight.headline}</p>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                      {prettifyLabel(insight.insightType)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">{insight.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                    {insight.symbol && <span>Symbol: {insight.symbol}</span>}
                    {insight.accountId && <span>Account: {insight.accountId}</span>}
                    {insight.recommendedAction && <span>Action: {insight.recommendedAction}</span>}
                    {insight.confidence !== null && insight.confidence !== undefined && <span>Confidence: {insight.confidence}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!latestRun && (
            <div className="px-5 py-8 text-sm text-zinc-500">
              No decision runs yet. Start with a read-only analysis from the selected master portfolio.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Event Timeline</h2>
          </div>

          {!loadingEvents && latestRun && events.length === 0 && (
            <div className="px-5 py-8 text-sm text-zinc-500">
              No events ingested yet. Use Refresh after the desk has accepted the run.
            </div>
          )}

          {!loadingEvents && events.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {events.map((event) => (
                <div key={event.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{event.eventType}</p>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                      {event.source}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(event.createdAt)} · event {event.eventId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                    {event.instrument && <span>Instrument: {event.instrument}</span>}
                    {event.action && <span>Action: {event.action}</span>}
                    {event.side && <span>Side: {event.side}</span>}
                    {event.cycleId && <span>Cycle: {event.cycleId}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
