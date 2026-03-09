import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import { Button } from '../../components/Button.js';
import { Badge } from '../../components/Badge.js';
import { PageSpinner } from '../../components/Spinner.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { TransactionForm } from './TransactionForm.js';
import type { Transaction } from '../../types/index.js';

const typeBadge: Record<string, 'green' | 'red' | 'indigo' | 'zinc'> = {
  buy: 'green', sell: 'red', dividend: 'indigo', split: 'zinc',
  transfer_in: 'green', transfer_out: 'red',
};

export function TransactionsPage() {
  const { activePortfolioId } = usePortfolioStore();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', activePortfolioId],
    queryFn: () => api.get<Transaction[]>(`/transactions?portfolioId=${activePortfolioId}`),
    enabled: !!activePortfolioId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', activePortfolioId] });
      qc.invalidateQueries({ queryKey: ['positions', activePortfolioId] });
    },
  });

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(tx: Transaction) { setEditing(tx); setFormOpen(true); }
  function onFormDone() { setFormOpen(false); setEditing(null); }
  const showAccountColumn = new Set(transactions.map((transaction) => transaction.portfolioId)).size > 1;

  if (!activePortfolioId) {
    return <div className="flex h-64 items-center justify-center"><p className="text-zinc-500">No portfolio selected.</p></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Transactions</h1>
        <Button onClick={openAdd} size="sm">
          <Plus size={15} />
          Add Transaction
        </Button>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="rounded-xl border border-zinc-200 bg-white">
          {transactions.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              No transactions yet. Add your first one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Symbol</th>
                  {showAccountColumn && <th className="px-5 py-3 text-left font-medium">Account</th>}
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Qty</th>
                  <th className="px-5 py-3 text-right font-medium">Price</th>
                  <th className="px-5 py-3 text-right font-medium">Fees</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Source</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-5 py-3 text-zinc-600">{formatDate(tx.date)}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{tx.symbol}</td>
                    {showAccountColumn && <td className="px-5 py-3 text-zinc-600">{tx.portfolioName}</td>}
                    <td className="px-5 py-3">
                      <Badge variant={typeBadge[tx.type] ?? 'zinc'}>{tx.type}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-700">{tx.quantity}</td>
                    <td className="px-5 py-3 text-right text-zinc-700">{formatCurrency(tx.price)}</td>
                    <td className="px-5 py-3 text-right text-zinc-500">{formatCurrency(tx.fees)}</td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(tx.quantity * tx.price + (tx.type === 'buy' ? tx.fees : -tx.fees))}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant="zinc">{tx.source}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(tx)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this transaction?')) deleteMutation.mutate(tx.id); }}
                          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onClose={onFormDone}
        editing={editing}
        portfolioId={activePortfolioId}
      />
    </div>
  );
}
