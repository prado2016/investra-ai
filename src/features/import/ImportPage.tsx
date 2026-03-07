import { useState } from 'react';
import { CsvImport } from './CsvImport.js';
import { EmailImport } from './EmailImport.js';

type Tab = 'csv' | 'email';

export function ImportPage() {
  const [tab, setTab] = useState<Tab>('csv');

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Import</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 w-fit">
        {(['csv', 'email'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize
              ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {t === 'csv' ? 'CSV File' : 'Email Sync'}
          </button>
        ))}
      </div>

      {tab === 'csv' ? <CsvImport /> : <EmailImport />}
    </div>
  );
}
