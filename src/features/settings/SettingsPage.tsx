import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button.js';
import { Input } from '../../components/Input.js';
import { Alert } from '../../components/Alert.js';
import { Modal } from '../../components/Modal.js';
import { usePortfolioStore } from '../../stores/portfolioStore.js';
import { api } from '../../lib/apiClient.js';
import type { EmailConfig, Portfolio } from '../../types/index.js';

export function SettingsPage() {
  const qc = useQueryClient();
  const { portfolios, setPortfolios } = usePortfolioStore();

  // Portfolio management
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const createPortfolio = useMutation({
    mutationFn: () => api.post<Portfolio>('/portfolios', { name: newPortfolioName }),
    onSuccess: async () => {
      const updated = await api.get<Portfolio[]>('/portfolios');
      setPortfolios(updated);
      setNewPortfolioName('');
    },
  });
  const deletePortfolio = useMutation({
    mutationFn: (id: string) => api.delete(`/portfolios/${id}`),
    onSuccess: async () => {
      const updated = await api.get<Portfolio[]>('/portfolios');
      setPortfolios(updated);
    },
  });

  // Email config
  const { data: emailConfig } = useQuery({
    queryKey: ['email-config'],
    queryFn: () => api.get<EmailConfig | null>('/settings/email-config'),
  });

  const [emailForm, setEmailForm] = useState({ imapHost: '', imapPort: '993', emailAddress: '', password: '' });
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const saveEmail = useMutation({
    mutationFn: () => api.put('/settings/email-config', { ...emailForm, imapPort: parseInt(emailForm.imapPort) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-config'] });
      setEmailModalOpen(false);
    },
  });
  const deleteEmail = useMutation({
    mutationFn: () => api.delete('/settings/email-config'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-config'] }),
  });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>

      {/* Portfolios */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Portfolios</h2>
        <div className="space-y-2 mb-4">
          {portfolios.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <span className="text-sm text-zinc-900">{p.name}</span>
              <button
                onClick={() => { if (confirm(`Delete "${p.name}"?`)) deletePortfolio.mutate(p.id); }}
                className="text-zinc-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); createPortfolio.mutate(); }}
          className="flex gap-2"
        >
          <Input
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            placeholder="New portfolio name"
            className="flex-1"
          />
          <Button type="submit" size="sm" loading={createPortfolio.isPending}>
            <Plus size={14} />
            Add
          </Button>
        </form>
      </section>

      {/* Email Config */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Email Sync (IMAP)</h2>
          {emailConfig ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setEmailForm({ ...emailForm, imapHost: emailConfig.imapHost, imapPort: String(emailConfig.imapPort), emailAddress: emailConfig.emailAddress }); setEmailModalOpen(true); }}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => { if (confirm('Remove email config?')) deleteEmail.mutate(); }}>
                Remove
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setEmailModalOpen(true)}>
              <Plus size={14} /> Configure
            </Button>
          )}
        </div>
        {emailConfig ? (
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 text-sm text-zinc-700">
            <p>{emailConfig.emailAddress}</p>
            <p className="text-xs text-zinc-500">{emailConfig.imapHost}:{emailConfig.imapPort}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No email configured. Set up IMAP to auto-import broker confirmations.</p>
        )}
      </section>

      {/* Email config modal */}
      <Modal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Email Configuration">
        <form onSubmit={(e) => { e.preventDefault(); saveEmail.mutate(); }} className="space-y-4">
          <Input label="IMAP Host" value={emailForm.imapHost} onChange={(e) => setEmailForm({ ...emailForm, imapHost: e.target.value })} placeholder="imap.gmail.com" required />
          <Input label="IMAP Port" type="number" value={emailForm.imapPort} onChange={(e) => setEmailForm({ ...emailForm, imapPort: e.target.value })} />
          <Input label="Email Address" type="email" value={emailForm.emailAddress} onChange={(e) => setEmailForm({ ...emailForm, emailAddress: e.target.value })} required />
          <Input label="Password / App Password" type="password" value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} placeholder="••••••••" required />
          {saveEmail.error && <Alert variant="error">{saveEmail.error.message}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveEmail.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
