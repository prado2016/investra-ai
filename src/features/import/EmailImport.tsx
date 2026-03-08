import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/Button.js';
import { Alert } from '../../components/Alert.js';
import { Select } from '../../components/Select.js';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import type { SyncTask } from '../../types/index.js';

export function EmailImport() {
  const { portfolios, activePortfolioId } = usePortfolioStore();
  const [portfolioId, setPortfolioId] = useState(activePortfolioId ?? '');
  const [syncTask, setSyncTask] = useState<SyncTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const qc = useQueryClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = syncTask?.status === 'connecting' || syncTask?.status === 'syncing';

  // Poll for sync status updates
  const startPolling = useCallback(() => {
    // Don't double-start
    if (pollRef.current) return;

    const poll = async () => {
      try {
        const task = await api.get<SyncTask | null>('/import/email-sync/status');
        if (task) {
          setSyncTask(task);
          if (task.status === 'done' || task.status === 'error') {
            // Stop polling when sync finishes
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            // Invalidate queries when sync completes with new data
            if (task.status === 'done' && task.created > 0) {
              qc.invalidateQueries({ queryKey: ['transactions'] });
              qc.invalidateQueries({ queryKey: ['positions'] });
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    // Poll immediately, then every 1.5s
    poll();
    pollRef.current = setInterval(poll, 1500);
  }, [qc]);

  // Check for existing sync status on mount
  useEffect(() => {
    api.get<SyncTask | null>('/import/email-sync/status')
      .then((task) => {
        if (task) {
          setSyncTask(task);
          // If a sync is already active, start polling for updates
          if (task.status === 'connecting' || task.status === 'syncing') {
            startPolling();
          }
        }
      })
      .catch(() => {}); // ignore if endpoint not available

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [startPolling]);

  const startSync = async () => {
    setError(null);
    setStarting(true);
    try {
      await api.post('/import/email-sync', { portfolioId });
      // Sync started — poll for progress updates
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    } finally {
      setStarting(false);
    }
  };

  const progressPercent = syncTask && syncTask.total > 0
    ? Math.round((syncTask.processed / syncTask.total) * 100)
    : 0;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-start gap-3">
          <Mail size={20} className="mt-0.5 text-zinc-400 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Email Sync</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Connect your broker email in Settings first. Then sync here to auto-import trade confirmations.
            </p>
          </div>
        </div>

        <Select
          label="Import into portfolio"
          value={portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
          options={portfolios.map((p) => ({ value: p.id, label: p.name }))}
          className="mb-4"
        />

        <Button
          onClick={startSync}
          loading={starting}
          disabled={!portfolioId || isActive}
        >
          {isActive ? 'Syncing...' : 'Sync emails'}
        </Button>
      </div>

      {/* Progress bar during sync */}
      {isActive && syncTask && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              {syncTask.status === 'connecting' ? 'Connecting to mailbox...' : 'Syncing emails'}
            </h2>
          </div>

          {syncTask.status === 'syncing' && syncTask.total > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-600">
                <span>Processing {syncTask.processed} of {syncTask.total} emails...</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {(syncTask.created > 0 || syncTask.failed > 0) && (
                <p className="mt-2 text-xs text-zinc-500">
                  {syncTask.created} transactions created
                  {syncTask.failed > 0 && ` · ${syncTask.failed} failed`}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Completed sync result */}
      {syncTask?.status === 'done' && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Sync Complete</h2>
            {syncTask.completedAt && (
              <span className="ml-auto text-xs text-zinc-400">
                {new Date(syncTask.completedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <Alert variant="success">
            Processed {syncTask.processed} emails · Created {syncTask.created} transactions
            {syncTask.failed > 0 && ` · ${syncTask.failed} failed`}
          </Alert>
          {syncTask.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {syncTask.errors.map((e, i) => (
                <Alert key={i} variant="warning">{e}</Alert>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {syncTask?.status === 'error' && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-red-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Sync Failed</h2>
          </div>
          {syncTask.errors.map((e, i) => (
            <Alert key={i} variant="error">{e}</Alert>
          ))}
        </div>
      )}

      {error && !syncTask && (
        <Alert variant="error">{error}</Alert>
      )}
    </div>
  );
}
