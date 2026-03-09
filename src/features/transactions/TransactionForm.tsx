import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal.js';
import { Input } from '../../components/Input.js';
import { Select } from '../../components/Select.js';
import { Button } from '../../components/Button.js';
import { api } from '../../lib/apiClient.js';
import { today } from '../../utils/format.js';
import type { Transaction, NewTransactionPayload, SymbolSearchResult } from '../../types/index.js';

const TX_TYPES = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'split', label: 'Split' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  editing: Transaction | null;
  portfolioId: string;
}

export function TransactionForm({ open, onClose, editing, portfolioId }: Props) {
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [type, setType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const symbolRef = useRef<HTMLInputElement>(null);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['symbol-search', symbolSearch],
    queryFn: () => api.get<SymbolSearchResult[]>(`/market/search?q=${encodeURIComponent(symbolSearch)}`),
    enabled: symbolSearch.length >= 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (editing) {
      setSymbol(editing.symbol);
      setType(editing.type);
      setQuantity(String(editing.quantity));
      setPrice(String(editing.price));
      setFees(String(editing.fees));
      setDate(editing.date);
      setNotes(editing.notes ?? '');
    } else {
      setSymbol(''); setType('buy'); setQuantity(''); setPrice(''); setFees('0'); setDate(today()); setNotes('');
    }
  }, [editing, open]);

  const createMutation = useMutation({
    mutationFn: (data: NewTransactionPayload) => api.post<Transaction>('/transactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['positions', portfolioId] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<NewTransactionPayload>) => api.patch<Transaction>(`/transactions/${editing!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['positions', portfolioId] });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error?.message ?? updateMutation.error?.message;

  function submit(e: FormEvent) {
    e.preventDefault();
    const payload: NewTransactionPayload = {
      portfolioId,
      symbol: symbol.toUpperCase(),
      type: type as NewTransactionPayload['type'],
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      fees: parseFloat(fees) || 0,
      date,
      notes: notes || undefined,
    };
    if (editing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  function selectSymbol(s: SymbolSearchResult) {
    setSymbol(s.symbol);
    setShowDropdown(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Transaction' : 'Add Transaction'}>
      <form onSubmit={submit} className="space-y-4">
        {/* Symbol */}
        <div className="relative">
          <Input
            ref={symbolRef}
            label="Symbol"
            value={symbol}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setSymbol(v);
              setSymbolSearch(v);
              setShowDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="AAPL"
            required
          />
          {showDropdown && searchResults.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md">
              {searchResults.map((r) => (
                <li
                  key={r.symbol}
                  onMouseDown={() => selectSymbol(r)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium">{r.symbol}</span>
                  <span className="ml-2 text-zinc-500">{r.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={TX_TYPES}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Quantity"
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
            required
          />
          <Input
            label="Price"
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150.00"
            required
          />
          <Input
            label="Fees"
            type="number"
            step="any"
            min="0"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            placeholder="0"
          />
        </div>

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isPending}>{editing ? 'Save changes' : 'Add transaction'}</Button>
        </div>
      </form>
    </Modal>
  );
}
