import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Button } from '../../components/Button.js';
import { Alert } from '../../components/Alert.js';
import { Select } from '../../components/Select.js';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import { parseCsv } from '../../utils/csvParser.js';

export function CsvImport() {
  const { portfolios, activePortfolioId } = usePortfolioStore();
  const [portfolioId, setPortfolioId] = useState(activePortfolioId ?? '');
  const [preview, setPreview] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [fileName, setFileName] = useState('');
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: () => api.post<{ created: number; errors: string[] }>('/import/csv', { portfolioId, rows: preview!.rows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['positions', portfolioId] });
    },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    importMutation.reset();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPreview(parseCsv(text));
    };
    reader.readAsText(file);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Upload CSV</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Required columns: <code className="rounded bg-zinc-100 px-1">symbol, type, quantity, price, date</code>.
          Optional: <code className="rounded bg-zinc-100 px-1">fees, notes</code>.
        </p>

        <Select
          label="Import into portfolio"
          value={portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
          options={portfolios.map((p) => ({ value: p.id, label: p.name }))}
          className="mb-4"
        />

        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-colors"
        >
          <Upload size={24} className="mb-2 text-zinc-400" />
          <p className="text-sm text-zinc-600">{fileName || 'Click to upload CSV'}</p>
          <p className="mt-1 text-xs text-zinc-400">Supports most broker CSV exports</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Preview</h2>

          {preview.errors.length > 0 && (
            <div className="mb-3 space-y-1">
              {preview.errors.map((e, i) => <Alert key={i} variant="warning">{e}</Alert>)}
            </div>
          )}

          <p className="mb-3 text-sm text-zinc-600">{preview.rows.length} transactions ready to import.</p>

          {importMutation.data && (
            <Alert variant="success">
              Imported {importMutation.data.created} transactions.
              {importMutation.data.errors.length > 0 && ` (${importMutation.data.errors.length} errors)`}
            </Alert>
          )}

          {importMutation.error && (
            <Alert variant="error">{importMutation.error.message}</Alert>
          )}

          {!importMutation.isSuccess && preview.rows.length > 0 && (
            <Button
              onClick={() => importMutation.mutate()}
              loading={importMutation.isPending}
              className="mt-3"
            >
              Import {preview.rows.length} transactions
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
