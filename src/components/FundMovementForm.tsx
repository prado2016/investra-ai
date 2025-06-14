import React, { useState, useEffect } from 'react';
import { Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { InputField, SelectField } from './FormFields';
import { PriceInput } from './PriceInput';
import { useForm } from '../hooks/useForm';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import type { FundMovement, FundMovementType, FundMovementStatus, Currency } from '../types/portfolio';

interface FundMovementFormData {
  portfolioId: string;
  type: FundMovementType;
  status: FundMovementStatus;
  date: string;
  amount: string;
  currency: Currency;
  fees: string;
  notes: string;
  
  // For conversions
  originalAmount: string;
  originalCurrency: Currency;
  convertedAmount: string;
  convertedCurrency: Currency;
  exchangeRate: string;
  exchangeFees: string;
  account: string;
  
  // For transfers, withdrawals, deposits
  fromAccount: string;
  toAccount: string;
  
  [key: string]: unknown;
}

interface FundMovementFormProps {
  initialData?: FundMovement | null;
  onSave: (fundMovement: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean> | boolean;
  onCancel?: () => void;
  loading?: boolean;
}

const FundMovementForm: React.FC<FundMovementFormProps> = ({
  initialData,
  onSave,
  onCancel: _, // Reserved for future functionality
  loading = false
}) => {
  const { portfolios, activePortfolio, loading: portfoliosLoading } = useSupabasePortfolios();
  const [isMinimized, setIsMinimized] = useState(false);
  
  const initialValues: FundMovementFormData = {
    portfolioId: initialData?.portfolioId || activePortfolio?.id || '',
    type: initialData?.type || 'deposit',
    status: initialData?.status || 'completed',
    date: (() => {
      if (initialData?.date) {
        const dateValue = initialData.date;
        if (dateValue instanceof Date) {
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        // Handle string dates (shouldn't happen with FundMovement type but added for safety)
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
    amount: initialData?.amount?.toString() || '',
    currency: initialData?.currency || 'USD',
    fees: initialData?.fees?.toString() || '',
    notes: initialData?.notes || '',
    
    // Conversion fields
    originalAmount: initialData?.originalAmount?.toString() || '',
    originalCurrency: initialData?.originalCurrency || 'CAD',
    convertedAmount: initialData?.convertedAmount?.toString() || '',
    convertedCurrency: initialData?.convertedCurrency || 'USD',
    exchangeRate: initialData?.exchangeRate?.toString() || '',
    exchangeFees: initialData?.exchangeFees?.toString() || '',
    account: initialData?.account || 'TFSA',
    
    // Transfer fields
    fromAccount: initialData?.fromAccount || 'TFSA',
    toAccount: initialData?.toAccount || 'RBC Signature No Limit Banking - Chequing 511'
  };

  const form = useForm({
    initialValues,
    validationSchema: {
      portfolioId: {
        required: 'Portfolio is required'
      },
      type: {
        required: 'Transaction type is required'
      },
      status: {
        required: 'Status is required'
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
      amount: {
        required: 'Amount is required',
        positive: 'Amount must be greater than 0',
        number: true
      },
      originalAmount: {
        requiredIf: (values) => values.type === 'conversion',
        positive: 'Original amount must be greater than 0',
        number: true
      },
      exchangeRate: {
        requiredIf: (values) => values.type === 'conversion',
        positive: 'Exchange rate must be greater than 0',
        number: true
      },
      fromAccount: {
        requiredIf: (values: Record<string, unknown>) => ['withdraw', 'transfer'].includes(values.type as string)
      },
      toAccount: {
        requiredIf: (values: Record<string, unknown>) => ['deposit', 'transfer', 'withdraw'].includes(values.type as string)
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      const fundMovement: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'> = {
        portfolioId: values.portfolioId,
        type: values.type,
        status: values.status,
        date: (() => {
          const [year, month, day] = values.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        })(),
        amount: parseFloat(values.amount),
        currency: values.currency,
        fees: values.fees ? parseFloat(values.fees) : undefined,
        notes: values.notes.trim() || undefined,
        
        // Conversion fields
        ...(values.type === 'conversion' && {
          originalAmount: parseFloat(values.originalAmount),
          originalCurrency: values.originalCurrency,
          convertedAmount: parseFloat(values.convertedAmount),
          convertedCurrency: values.convertedCurrency,
          exchangeRate: parseFloat(values.exchangeRate),
          exchangeFees: values.exchangeFees ? parseFloat(values.exchangeFees) : undefined,
          account: values.account
        }),
        
        // Transfer fields
        ...(['withdraw', 'transfer'].includes(values.type) && {
          fromAccount: values.fromAccount
        }),
        ...(['deposit', 'transfer', 'withdraw'].includes(values.type) && {
          toAccount: values.toAccount
        })
      };

      return await onSave(fundMovement);
    }
  });

  // Auto-calculate converted amount and fees when original amount or exchange rate changes
  useEffect(() => {
    if (form.values.type === 'conversion') {
      const originalAmount = parseFloat(form.values.originalAmount);
      const exchangeRate = parseFloat(form.values.exchangeRate);
      
      if (!isNaN(originalAmount) && !isNaN(exchangeRate) && originalAmount > 0 && exchangeRate > 0) {
        // Calculate real rate (user rate ÷ 0.99)
        const realRate = exchangeRate / 0.99;
        
        // Calculate converted amount using user-provided rate (which already includes 1% deduction)
        const convertedAmount = originalAmount * exchangeRate;
        
        // Calculate fee: (originalAmount × realRate) - convertedAmount
        const feeAmount = (originalAmount * realRate) - convertedAmount;
        
        // Set calculated values
        form.setValue('convertedAmount', convertedAmount.toFixed(2));
        form.setValue('amount', convertedAmount.toFixed(2));
        form.setValue('exchangeFees', feeAmount.toFixed(2));
      }
    }
  }, [form.values.originalAmount, form.values.exchangeRate, form.values.type, form]);

  // Auto-select first portfolio when portfolios load and no portfolio is selected
  useEffect(() => {
    if (!form.values.portfolioId && portfolios.length > 0 && !initialData?.portfolioId) {
      const defaultPortfolio = activePortfolio || portfolios[0];
      form.setValue('portfolioId', defaultPortfolio.id);
    }
  }, [portfolios, activePortfolio, form.values.portfolioId, initialData?.portfolioId, form]);

  const movementTypeOptions = [
    { value: 'conversion', label: 'Currency Conversion' },
    { value: 'withdraw', label: 'Withdrawal' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'transfer', label: 'Transfer' }
  ];

  const statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const accountOptions = [
    { value: 'TFSA', label: 'TFSA' },
    { value: 'RRSP', label: 'RRSP' },
    { value: 'RBC Signature No Limit Banking - Chequing 511', label: 'RBC Chequing 511' },
    { value: 'RBC Signature No Limit Banking - Savings', label: 'RBC Savings' },
    { value: 'Cash Account', label: 'Cash Account' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'CAD', label: 'CAD (C$)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'JPY', label: 'JPY (¥)' }
  ];

  if (!portfoliosLoading && portfolios.length === 0) {
    return null; // Don't show if no portfolios
  }

  return (
    <div className="enhanced-form-section">
      <div className="enhanced-section-header" style={{ cursor: 'pointer' }} onClick={() => setIsMinimized(!isMinimized)}>
        <div className="enhanced-section-header-content">
          <div className="enhanced-section-text">
            <h2 className="enhanced-section-title">Add Funds</h2>
            <p className="enhanced-section-subtitle">
              Track deposits, withdrawals, transfers, and currency conversions
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
              <SelectField
                id="type"
                name="type"
                label="Movement Type"
                value={form.values.type}
                onChange={(e) => form.setValue('type', e.target.value as FundMovementType)}
                onBlur={() => form.setFieldTouched('type')}
                options={movementTypeOptions}
                error={form.touched.type ? form.errors.type?.message : ''}
                required
                disabled={form.isSubmitting || loading}
              />
            </div>

            <div className="horizontal-fields-container">
              <SelectField
                id="status"
                name="status"
                label="Status"
                value={form.values.status}
                onChange={(e) => form.setValue('status', e.target.value as FundMovementStatus)}
                onBlur={() => form.setFieldTouched('status')}
                options={statusOptions}
                error={form.touched.status ? form.errors.status?.message : ''}
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

            {/* Conversion Fields */}
            {form.values.type === 'conversion' && (
              <>
                <div className="horizontal-fields-container">
                  <SelectField
                    id="account"
                    name="account"
                    label="Account"
                    value={form.values.account}
                    onChange={(e) => form.setValue('account', e.target.value)}
                    onBlur={() => form.setFieldTouched('account')}
                    options={accountOptions}
                    error={form.touched.account ? form.errors.account?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                  />
                </div>
                <div className="horizontal-fields-container">
                  <PriceInput
                    id="originalAmount"
                    name="originalAmount"
                    label="Original Amount"
                    value={form.values.originalAmount}
                    onChange={(value) => form.setValue('originalAmount', value)}
                    onBlur={() => form.setFieldTouched('originalAmount')}
                    error={form.touched.originalAmount ? form.errors.originalAmount?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                  />
                  <SelectField
                    id="originalCurrency"
                    name="originalCurrency"
                    label="Original Currency"
                    value={form.values.originalCurrency}
                    onChange={(e) => form.setValue('originalCurrency', e.target.value as Currency)}
                    onBlur={() => form.setFieldTouched('originalCurrency')}
                    options={currencyOptions}
                    error={form.touched.originalCurrency ? form.errors.originalCurrency?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                  />
                </div>
                <div className="horizontal-fields-container">
                  <InputField
                    id="exchangeRate"
                    name="exchangeRate"
                    label="Exchange Rate"
                    type="number"
                    placeholder="e.g., 0.710347"
                    value={form.values.exchangeRate}
                    onChange={(value) => form.setValue('exchangeRate', value)}
                    onBlur={() => form.setFieldTouched('exchangeRate')}
                    error={form.touched.exchangeRate ? form.errors.exchangeRate?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                    min={0}
                    step={0.000001}
                  />
                  <InputField
                    id="exchangeFees"
                    name="exchangeFees"
                    label="Exchange Fees (USD)"
                    type="number"
                    placeholder="Auto-calculated"
                    value={form.values.exchangeFees}
                    onChange={(value) => form.setValue('exchangeFees', value)}
                    onBlur={() => form.setFieldTouched('exchangeFees')}
                    error={form.touched.exchangeFees ? form.errors.exchangeFees?.message : ''}
                    disabled={true} // Auto-calculated field
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="horizontal-fields-container">
                  <PriceInput
                    id="convertedAmount"
                    name="convertedAmount"
                    label="Converted Amount"
                    value={form.values.convertedAmount}
                    onChange={(value) => form.setValue('convertedAmount', value)}
                    onBlur={() => form.setFieldTouched('convertedAmount')}
                    error={form.touched.convertedAmount ? form.errors.convertedAmount?.message : ''}
                    disabled
                    required
                  />
                  <SelectField
                    id="convertedCurrency"
                    name="convertedCurrency"
                    label="Converted Currency"
                    value={form.values.convertedCurrency}
                    onChange={(e) => form.setValue('convertedCurrency', e.target.value as Currency)}
                    onBlur={() => form.setFieldTouched('convertedCurrency')}
                    options={currencyOptions}
                    error={form.touched.convertedCurrency ? form.errors.convertedCurrency?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                  />
                </div>
              </>
            )}

            {/* Transfer/Withdraw/Deposit Fields */}
            {['withdraw', 'deposit', 'transfer'].includes(form.values.type) && (
              <>
                <div className="horizontal-fields-container">
                  {['withdraw', 'transfer'].includes(form.values.type) && (
                    <SelectField
                      id="fromAccount"
                      name="fromAccount"
                      label="From"
                      value={form.values.fromAccount}
                      onChange={(e) => form.setValue('fromAccount', e.target.value)}
                      onBlur={() => form.setFieldTouched('fromAccount')}
                      options={accountOptions}
                      error={form.touched.fromAccount ? form.errors.fromAccount?.message : ''}
                      required
                      disabled={form.isSubmitting || loading}
                    />
                  )}
                  {['deposit', 'transfer', 'withdraw'].includes(form.values.type) && (
                    <SelectField
                      id="toAccount"
                      name="toAccount"
                      label="To"
                      value={form.values.toAccount}
                      onChange={(e) => form.setValue('toAccount', e.target.value)}
                      onBlur={() => form.setFieldTouched('toAccount')}
                      options={accountOptions}
                      error={form.touched.toAccount ? form.errors.toAccount?.message : ''}
                      required
                      disabled={form.isSubmitting || loading}
                    />
                  )}
                </div>
                <div className="horizontal-fields-container">
                  <PriceInput
                    id="amount"
                    name="amount"
                    label="Amount"
                    value={form.values.amount}
                    onChange={(value) => form.setValue('amount', value)}
                    onBlur={() => form.setFieldTouched('amount')}
                    error={form.touched.amount ? form.errors.amount?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                  />
                  <SelectField
                    id="currency"
                    name="currency"
                    label="Currency"
                    value={form.values.currency}
                    onChange={(e) => form.setValue('currency', e.target.value as Currency)}
                    onBlur={() => form.setFieldTouched('currency')}
                    options={currencyOptions}
                    error={form.touched.currency ? form.errors.currency?.message : ''}
                    required
                    disabled={form.isSubmitting || loading}
                  />
                </div>
              </>
            )}

            <div className="horizontal-fields-container">
              <InputField
                id="notes"
                name="notes"
                label="Notes"
                type="textarea"
                placeholder="Additional notes about this fund movement"
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
                {initialData ? 'Update Fund Movement' : 'Add Fund Movement'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FundMovementForm;
