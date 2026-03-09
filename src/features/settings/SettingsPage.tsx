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

const emptyEmailForm = {
  imapHost: '',
  imapPort: '993',
  emailAddress: '',
  password: '',
};

export function SettingsPage() {
  const qc = useQueryClient();
  const { portfolios, setPortfolios } = usePortfolioStore();
  const masterPortfolios = portfolios.filter((portfolio) => !portfolio.parentPortfolioId);

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

  const [emailForm, setEmailForm] = useState(emptyEmailForm);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const saveEmail = useMutation({
    mutationFn: () => api.put('/settings/email-config', { ...emailForm, imapPort: parseInt(emailForm.imapPort) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-config'] });
      setEmailForm(emptyEmailForm);
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
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Master Portfolios</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Create top-level portfolios here. Email sync will add detected broker accounts as child accounts under the selected master portfolio.
        </p>
        <div className="space-y-2 mb-4">
          {masterPortfolios.map((portfolio) => {
            const childAccounts = portfolios.filter((item) => item.parentPortfolioId === portfolio.id);

            return (
              <div key={portfolio.id} className="rounded-lg border border-zinc-100 bg-zinc-50">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-zinc-900">{portfolio.name}</span>
                    <p className="text-xs text-zinc-500">
                      {childAccounts.length === 0 ? 'No child accounts yet' : `${childAccounts.length} child account${childAccounts.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete "${portfolio.name}"?`)) deletePortfolio.mutate(portfolio.id); }}
                    className="text-zinc-400 hover:text-red-600 transition-colors"
                    title={childAccounts.length > 0 ? 'Delete child accounts first' : 'Delete portfolio'}
                    disabled={childAccounts.length > 0 || deletePortfolio.isPending}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {childAccounts.length > 0 && (
                  <div className="border-t border-zinc-100 px-3 py-2">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Accounts</p>
                    <div className="space-y-1">
                      {childAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                          <span className="text-sm text-zinc-700">{account.name}</span>
                          <button
                            onClick={() => { if (confirm(`Delete account "${account.name}"?`)) deletePortfolio.mutate(account.id); }}
                            className="text-zinc-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); createPortfolio.mutate(); }}
          className="flex gap-2"
        >
          <Input
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            placeholder="New master portfolio name"
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
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEmailForm({
                    imapHost: emailConfig.imapHost,
                    imapPort: String(emailConfig.imapPort),
                    emailAddress: emailConfig.emailAddress,
                    password: '',
                  });
                  setEmailModalOpen(true);
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => { if (confirm('Remove email config?')) deleteEmail.mutate(); }}>
                Remove
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => { setEmailForm(emptyEmailForm); setEmailModalOpen(true); }}>
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
      <Modal
        open={emailModalOpen}
        onClose={() => {
          setEmailForm(emptyEmailForm);
          setEmailModalOpen(false);
        }}
        title="Email Configuration"
      >
        <form onSubmit={(e) => { e.preventDefault(); saveEmail.mutate(); }} className="space-y-4">
          <Input label="IMAP Host" value={emailForm.imapHost} onChange={(e) => setEmailForm({ ...emailForm, imapHost: e.target.value })} placeholder="imap.gmail.com" required />
          <Input label="IMAP Port" type="number" value={emailForm.imapPort} onChange={(e) => setEmailForm({ ...emailForm, imapPort: e.target.value })} />
          <Input label="Email Address" type="email" value={emailForm.emailAddress} onChange={(e) => setEmailForm({ ...emailForm, emailAddress: e.target.value })} required />
          <Input
            label="Password / App Password"
            type="password"
            value={emailForm.password}
            onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
            placeholder={emailConfig ? 'Leave blank to keep the current password' : '••••••••'}
            required={!emailConfig}
          />
          {saveEmail.error && <Alert variant="error">{saveEmail.error.message}</Alert>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEmailForm(emptyEmailForm);
                setEmailModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saveEmail.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
