
import React, { useState, useEffect } from 'react';
import { Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { InputField, SelectField } from './FormFields';
import { PriceInput } from './PriceInput';
import { useForm } from '../hooks/useForm';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import type { Transaction, TransactionType, Currency, AssetType, OptionStrategyType, FundMovementType, FundMovementStatus } from '../types/portfolio';
import SymbolInput from './SymbolInput';

interface TransactionFormData {
  portfolioId: string;
  entryType: 'asset_transaction' | 'fund_movement'; // New field to distinguish between types
  assetSymbol: string;
  type: TransactionType | FundMovementType;
  date: string;
  quantity: string;
  price: string;
  amount: string; // For fund movements
  notes: string;
  currency: Currency;
  assetType: AssetType;
  totalAmount: string;
  strategyType: OptionStrategyType | '';
  status: FundMovementStatus; // For fund movements
  account: string; // For fund movements
  fromAccount: string; // For transfers
  toAccount: string; // For transfers
  [key: string]: unknown;
}

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSave: (data: any) => Promise<boolean> | boolean;
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
    entryType: 'asset_transaction', // Default to asset transaction
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
    amount: '', // For fund movements
    notes: initialData?.notes || '',
    currency: initialData?.currency || 'USD', // Default to USD
    assetType: initialData?.assetType || 'stock', // Default to stock
    totalAmount: initialData?.totalAmount?.toString() || '',
    strategyType: initialData?.strategyType || '',
    status: 'completed', // Default status for fund movements
    account: '', // For fund movements
    fromAccount: '', // For transfers
    toAccount: '' // For transfers
  };

  const getValidationSchema = (entryType: string) => {
    const baseSchema = {
      portfolioId: {
        required: 'Portfolio is required'
      },
      type: {
        required: entryType === 'asset_transaction' ? 'Transaction type is required' : 'Movement type is required'
      },
      date: {
        required: 'Date is required',
        custom: (value: unknown) => {
          const date = new Date(value as string | number | Date);
          const today = new Date();
          if (date > today) {
            return 'Date cannot be in the future';
          }
          return true;
        }
      }
    };

    if (entryType === 'asset_transaction') {
      return {
        ...baseSchema,
        assetSymbol: {
          required: 'Symbol is required'
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
      };
    } else {
      return {
        ...baseSchema,
        amount: {
          required: 'Amount is required',
          positive: 'Amount must be greater than 0',
          number: true
        }
      };
    }
  };

  const form = useForm({
    initialValues,
    validationSchema: getValidationSchema(initialValues.entryType),
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      return await onSave(values);
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
    { value: 'sell', label: 'Sell' },
    { value: 'dividend', label: 'Dividend' },
    { value: 'option_expired', label: 'Option Expired' },
    { value: 'short_option_expired', label: 'Short Option Expired' },
    { value: 'short_option_assigned', label: 'Short Option Assigned' }
  ];

  const fundMovementTypeOptions = [
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdraw', label: 'Withdraw' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'conversion', label: 'Currency Conversion' }
  ];

  const entryTypeOptions = [
    { value: 'asset_transaction', label: 'Asset Transaction' },
    { value: 'fund_movement', label: 'Fund Movement' }
  ];

  const strategyTypeOptions = [
    { value: '', label: 'Select Strategy (Optional)' },
    { value: 'covered_call', label: 'Covered Call' },
    { value: 'naked_call', label: 'Naked Call' },
    { value: 'cash_secured_put', label: 'Cash Secured Put' },
    { value: 'protective_put', label: 'Protective Put' },
    { value: 'long_call', label: 'Long Call' },
    { value: 'long_put', label: 'Long Put' },
    { value: 'collar', label: 'Collar' },
    { value: 'straddle', label: 'Straddle' },
    { value: 'strangle', label: 'Strangle' },
    { value: 'iron_condor', label: 'Iron Condor' },
    { value: 'butterfly', label: 'Butterfly' },
    { value: 'calendar_spread', label: 'Calendar Spread' }
  ];

  // Show strategy dropdown only for option transactions and specific transaction types
  const showStrategyField = form.values.assetType === 'option' && 
    ['sell', 'buy', 'option_expired', 'short_option_expired', 'short_option_assigned'].includes(form.values.type);

  if (!portfoliosLoading && portfolios.length === 0) {
    return null;
  }

  return (
    <div className="enhanced-form-section">
      <div className="enhanced-section-header" style={{ cursor: 'pointer' }} onClick={() => setIsMinimized(!isMinimized)}>
        <div className="enhanced-section-header-content">
          <div className="enhanced-section-text">
            <h2 className="enhanced-section-title">Add Transaction or Fund Movement</h2>
            <p className="enhanced-section-subtitle">
              Enter details for asset transactions or fund movements
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
                id="entryType"
                name="entryType"
                label="Entry Type"
                value={form.values.entryType}
                onChange={(e) => {
                  form.setValue('entryType', e.target.value);
                  // Reset type when switching entry types
                  if (e.target.value === 'asset_transaction') {
                    form.setValue('type', 'buy');
                  } else {
                    form.setValue('type', 'deposit');
                  }
                }}
                options={entryTypeOptions}
                required
              />
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
              {form.values.entryType === 'asset_transaction' && (
                <SymbolInput
                id="assetSymbol"
                name="assetSymbol"
                label="Symbol"
                value={form.values.assetSymbol}
                onChange={(value, metadata) => {
                  form.setValue('assetSymbol', value);
                  // Auto-fill asset type if AI provides it
                  if (metadata?.assetType) {
                    form.setValue('assetType', metadata.assetType);
                  }
                }}
                onBlur={() => form.setFieldTouched('assetSymbol')}
                error={form.touched.assetSymbol ? form.errors.assetSymbol?.message : ''}
                required
                disabled={form.isSubmitting || loading}
                enableAI={true}
                showAIButton={true}
                showSuggestions={true}
                showValidation={true}
                placeholder="Enter symbol or natural language (e.g., 'NVDL Jun 20 $61 CALL')"
                />
              )}
            </div>

            <div className="horizontal-fields-container">
              <SelectField
                id="type"
                name="type"
                label={form.values.entryType === 'asset_transaction' ? 'Transaction Type' : 'Movement Type'}
                value={form.values.type}
                onChange={(e) => form.setValue('type', e.target.value)}
                onBlur={() => form.setFieldTouched('type')}
                options={form.values.entryType === 'asset_transaction' ? transactionTypeOptions : fundMovementTypeOptions}
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

            {showStrategyField && (
              <div className="horizontal-fields-container">
                <SelectField
                  id="strategyType"
                  name="strategyType"
                  label="Option Strategy"
                  value={form.values.strategyType}
                  onChange={(e) => form.setValue('strategyType', e.target.value as OptionStrategyType | '')}
                  onBlur={() => form.setFieldTouched('strategyType')}
                  options={strategyTypeOptions}
                  error={form.touched.strategyType ? form.errors.strategyType?.message : ''}
                  disabled={form.isSubmitting || loading}
                />
              </div>
            )}

            {form.values.entryType === 'asset_transaction' ? (
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
            ) : (
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
                  onChange={(e) => form.setValue('currency', e.target.value)}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'CAD', label: 'CAD' },
                    { value: 'JPY', label: 'JPY' }
                  ]}
                  required
                  disabled={form.isSubmitting || loading}
                />
              </div>
            )}

            {form.values.entryType === 'fund_movement' && (form.values.type === 'transfer' || form.values.type === 'conversion') && (
              <div className="horizontal-fields-container">
                <InputField
                  id="fromAccount"
                  name="fromAccount"
                  label="From Account"
                  value={form.values.fromAccount}
                  onChange={(value) => form.setValue('fromAccount', value)}
                  onBlur={() => form.setFieldTouched('fromAccount')}
                  error={form.touched.fromAccount ? form.errors.fromAccount?.message : ''}
                  disabled={form.isSubmitting || loading}
                  placeholder={form.values.type === 'transfer' ? 'Source account' : 'From currency account'}
                />
                <InputField
                  id="toAccount"
                  name="toAccount"
                  label="To Account"
                  value={form.values.toAccount}
                  onChange={(value) => form.setValue('toAccount', value)}
                  onBlur={() => form.setFieldTouched('toAccount')}
                  error={form.touched.toAccount ? form.errors.toAccount?.message : ''}
                  disabled={form.isSubmitting || loading}
                  placeholder={form.values.type === 'transfer' ? 'Destination account' : 'To currency account'}
                />
              </div>
            )}

            {form.values.entryType === 'fund_movement' && (form.values.type === 'deposit' || form.values.type === 'withdraw') && (
              <div className="horizontal-fields-container">
                <InputField
                  id="account"
                  name="account"
                  label="Account"
                  value={form.values.account}
                  onChange={(value) => form.setValue('account', value)}
                  onBlur={() => form.setFieldTouched('account')}
                  error={form.touched.account ? form.errors.account?.message : ''}
                  disabled={form.isSubmitting || loading}
                  placeholder="Account name (e.g., TFSA, RRSP)"
                />
                <SelectField
                  id="status"
                  name="status"
                  label="Status"
                  value={form.values.status}
                  onChange={(e) => form.setValue('status', e.target.value)}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  required
                  disabled={form.isSubmitting || loading}
                />
              </div>
            )}

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
