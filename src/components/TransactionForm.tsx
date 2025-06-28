
import React, { useState, useEffect } from 'react';
import { Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { InputField, SelectField } from './FormFields';
import { PriceInput } from './PriceInput';
import { useForm } from '../hooks/useForm';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import type { Transaction, TransactionType } from '../types/portfolio';
import SymbolInput from './SymbolInput';

interface TransactionFormData {
  portfolioId: string;
  assetSymbol: string;
  type: TransactionType;
  date: string;
  quantity: string;
  price: string;
  notes: string;
  [key: string]: unknown;
}

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSave: (transaction: Omit<Transaction, 'id' | 'assetId' | 'createdAt' | 'updatedAt'>) => Promise<boolean> | boolean;
  onCancel?: () => void;
  loading?: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  onSave,
  loading = false
}) => {
  const { portfolios, activePortfolio, loading: portfoliosLoading } = useSupabasePortfolios();
  const [isMinimized, setIsMinimized] = useState(false);

  const initialValues: TransactionFormData = {
    portfolioId: initialData?.portfolioId || activePortfolio?.id || '',
    assetSymbol: '',
    type: initialData?.type || 'buy',
    date: (() => {
      if (initialData?.date) {
        const dateValue = initialData.date;
        if (dateValue instanceof Date) {
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        const dateStr = String(dateValue);
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        return dateStr;
      }
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    quantity: initialData?.quantity?.toString() || '',
    price: initialData?.price?.toString() || '',
    notes: initialData?.notes || ''
  };

  const form = useForm({
    initialValues,
    validationSchema: {
      portfolioId: {
        required: 'Portfolio is required'
      },
      assetSymbol: {
        required: 'Symbol is required'
      },
      type: {
        required: 'Transaction type is required'
      },
      date: {
        required: 'Date is required',
        custom: (value) => {
          const date = new Date(value as string | number | Date);
          const today = new Date();
          if (date > today) {
            return 'Date cannot be in the future';
          }
          return true;
        }
      },
      quantity: {
        required: 'Quantity is required',
        positive: 'Quantity must be greater than 0',
        number: true
      },
      price: {
        required: 'Price is required',
        positive: 'Price must be greater than 0',
        number: true
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      const transaction: Omit<Transaction, 'id' | 'assetId' | 'createdAt' | 'updatedAt'> = {
        portfolioId: values.portfolioId,
        assetSymbol: values.assetSymbol,
        type: values.type,
        date: (() => {
          const [year, month, day] = values.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        })(),
        quantity: parseFloat(values.quantity) || 0,
        price: parseFloat(values.price) || 0,
        notes: values.notes.trim() || undefined,
      };

      return await onSave(transaction);
    }
  });

  useEffect(() => {
    if (!form.values.portfolioId && portfolios.length > 0 && !initialData?.portfolioId) {
      const defaultPortfolio = activePortfolio || portfolios[0];
      form.setValue('portfolioId', defaultPortfolio.id);
    }
  }, [portfolios, activePortfolio, form.values.portfolioId, initialData?.portfolioId, form]);

  const transactionTypeOptions = [
    { value: 'buy', label: 'Buy' },
    { value: 'sell', label: 'Sell' }
  ];

  if (!portfoliosLoading && portfolios.length === 0) {
    return null;
  }

  return (
    <div className="enhanced-form-section">
      <div className="enhanced-section-header" style={{ cursor: 'pointer' }} onClick={() => setIsMinimized(!isMinimized)}>
        <div className="enhanced-section-header-content">
          <div className="enhanced-section-text">
            <h2 className="enhanced-section-title">Add Transaction</h2>
            <p className="enhanced-section-subtitle">
              Enter transaction details to add to your portfolio
            </p>
          </div>
          {isMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      </div>
      
      {!isMinimized && (
        <div className="enhanced-form-wrapper">
          <form className="form-container" onSubmit={form.handleSubmit}>
            <div className="horizontal-fields-container">
              <SelectField
                id="portfolioId"
                name="portfolioId"
                label="Portfolio"
                value={form.values.portfolioId}
                onChange={(e) => form.setValue('portfolioId', e.target.value)}
                options={portfolios.map(p => ({ value: p.id, label: p.name }))}
                error={form.touched.portfolioId ? form.errors.portfolioId?.message : ''}
                disabled={portfoliosLoading || portfolios.length === 0}
                required
              />
              <SymbolInput
                id="assetSymbol"
                name="assetSymbol"
                label="Symbol"
                value={form.values.assetSymbol}
                onChange={(value) => form.setValue('assetSymbol', value)}
                onBlur={() => form.setFieldTouched('assetSymbol')}
                error={form.touched.assetSymbol ? form.errors.assetSymbol?.message : ''}
                required
                disabled={form.isSubmitting || loading}
              />
            </div>

            <div className="horizontal-fields-container">
              <SelectField
                id="type"
                name="type"
                label="Transaction Type"
                value={form.values.type}
                onChange={(e) => form.setValue('type', e.target.value as TransactionType)}
                onBlur={() => form.setFieldTouched('type')}
                options={transactionTypeOptions}
                error={form.touched.type ? form.errors.type?.message : ''}
                required
                disabled={form.isSubmitting || loading}
              />
              <InputField
                id="date"
                name="date"
                label="Date"
                type="date"
                value={form.values.date}
                onChange={(value) => form.setValue('date', value)}
                onBlur={() => form.setFieldTouched('date')}
                error={form.touched.date ? form.errors.date?.message : ''}
                required
                disabled={form.isSubmitting || loading}
                max={(() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })()}
              />
            </div>

            <div className="horizontal-fields-container">
              <PriceInput
                id="quantity"
                name="quantity"
                label="Quantity"
                value={form.values.quantity}
                onChange={(value) => form.setValue('quantity', value)}
                onBlur={() => form.setFieldTouched('quantity')}
                error={form.touched.quantity ? form.errors.quantity?.message : ''}
                required
                disabled={form.isSubmitting || loading}
              />
              <PriceInput
                id="price"
                name="price"
                label="Price"
                value={form.values.price}
                onChange={(value) => form.setValue('price', value)}
                onBlur={() => form.setFieldTouched('price')}
                error={form.touched.price ? form.errors.price?.message : ''}
                required
                disabled={form.isSubmitting || loading}
              />
            </div>

            <div className="horizontal-fields-container">
              <InputField
                id="notes"
                name="notes"
                label="Notes"
                type="textarea"
                placeholder="Additional notes about this transaction"
                value={form.values.notes}
                onChange={(value) => form.setValue('notes', value)}
                onBlur={() => form.setFieldTouched('notes')}
                error={form.touched.notes ? form.errors.notes?.message : ''}
                disabled={form.isSubmitting || loading}
              />
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={form.isSubmitting || loading || !form.isValid}
                style={{ 
                  width: '100%', 
                  minHeight: 'var(--input-height)',
                  alignSelf: 'flex-end'
                }}
              >
                {(form.isSubmitting || loading) && (
                  <Loader size={16} className="loading-spinner" />
                )}
                {initialData ? 'Update Transaction' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TransactionForm;
