import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Button } from '../../components/Button.js';
import { Alert } from '../../components/Alert.js';
import { Select } from '../../components/Select.js';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import type { SyncResult } from '../../types/index.js';

export function EmailImport() {
  const { portfolios, activePortfolioId } = usePortfolioStore();
  const [portfolioId, setPortfolioId] = useState(activePortfolioId ?? '');
  const qc = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: () => api.post<SyncResult>('/import/email-sync', { portfolioId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['positions', portfolioId] });
    },
  });

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
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
          disabled={!portfolioId}
        >
          Sync emails
        </Button>
      </div>

      {syncMutation.data && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Sync Result</h2>
          <Alert variant="success">
            Processed {syncMutation.data.processed} emails · Created {syncMutation.data.created} transactions
            {syncMutation.data.failed > 0 && ` · ${syncMutation.data.failed} failed`}
          </Alert>
          {syncMutation.data.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {syncMutation.data.errors.map((e, i) => (
                <Alert key={i} variant="warning">{e}</Alert>
              ))}
            </div>
          )}
        </div>
      )}

      {syncMutation.error && (
        <Alert variant="error">{syncMutation.error.message}</Alert>
      )}
    </div>
  );
}
