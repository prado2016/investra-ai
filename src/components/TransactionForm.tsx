import React from 'react';
import { Loader } from 'lucide-react';
import { InputField, SelectField } from './FormFields';
import { PriceInput } from './PriceInput';
import { SymbolInput } from './SymbolInput';
import { useForm } from '../hooks/useForm';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import { detectAssetType } from '../utils/assetCategorization';
import type { Transaction, AssetType, TransactionType, Currency } from '../types/portfolio';
import type { SymbolLookupResult } from '../types/ai';

// Modern tooltip wrapper component
interface TooltipWrapperProps {
  children: React.ReactNode;
  tooltip: string;
  className?: string;
}

const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ 
  children, 
  tooltip, 
  className 
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 1200);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowTooltip(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`tooltip-wrapper ${className || ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div className={`tooltip ${showTooltip ? 'visible' : 'hidden'}`}>
        {tooltip}
      </div>
    </div>
  );
};

interface TransactionFormData {
  portfolioId: string;
  assetSymbol: string;
  assetType: AssetType;
  type: TransactionType;
  quantity: string;
  price: string;
  totalAmount: string;
  fees: string;
  currency: Currency;
  date: string;
  notes: string;
  [key: string]: unknown; // Index signature for compatibility
}

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSave: (transaction: Omit<Transaction, 'id' | 'assetId' | 'createdAt' | 'updatedAt'>) => Promise<boolean> | boolean;
  onCancel: () => void;
  loading?: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  onSave,
  onCancel,
  loading = false
}) => {
  const { portfolios, activePortfolio, loading: portfoliosLoading } = useSupabasePortfolios();
  
  const initialValues: TransactionFormData = {
    portfolioId: initialData?.portfolioId || '',
    assetSymbol: initialData?.assetSymbol || '',
    assetType: initialData?.assetType || 'stock',
    type: initialData?.type || 'buy',
    quantity: initialData?.quantity?.toString() || '',
    price: initialData?.price?.toString() || '',
    totalAmount: initialData?.totalAmount?.toString() || '',
    fees: initialData?.fees?.toString() || '',
    currency: initialData?.currency || 'USD',
    date: initialData?.date 
        ? (typeof initialData.date === 'string' 
            ? (initialData.date as string).split('T')[0] 
            : (initialData.date as Date).toISOString().split('T')[0]
          )
        : new Date().toISOString().split('T')[0],
    notes: initialData?.notes || ''
  };

  const form = useForm({
    initialValues,
    validationSchema: {
      portfolioId: {
        required: 'Portfolio is required'
      },
      assetSymbol: {
        required: 'Symbol is required',
        minLength: 1,
        maxLength: 200
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
      },
      totalAmount: {
        required: 'Total amount is required',
        positive: 'Total amount must be greater than 0',
        number: true
      },
      fees: {
        number: 'Fees must be a valid number',
        min: 0
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
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      const transaction: Omit<Transaction, 'id' | 'assetId' | 'createdAt' | 'updatedAt'> = {
        portfolioId: values.portfolioId,
        assetSymbol: values.assetSymbol.toUpperCase().trim(),
        assetType: values.assetType,
        type: values.type,
        quantity: parseFloat(values.quantity),
        price: parseFloat(values.price),
        totalAmount: parseFloat(values.totalAmount),
        fees: values.fees ? parseFloat(values.fees) : 0,
        currency: values.currency,
        date: new Date(values.date + 'T12:00:00.000Z'),
        notes: values.notes.trim() || undefined
      };

      return await onSave(transaction);
    }
  });

  // Auto-detect and set asset type when symbol changes
  const handleSymbolChange = (value: string, metadata?: SymbolLookupResult) => {
    // Set the symbol value
    form.setValue('assetSymbol', value);
    
    // Auto-detect asset type from AI metadata or symbol pattern
    let detectedType: AssetType | null = null;
    
    // First, try to use AI-detected asset type from metadata
    if (metadata?.assetType) {
      detectedType = metadata.assetType;
    } else if (value.trim()) {
      // Fallback to pattern-based detection
      detectedType = detectAssetType(value.trim().toUpperCase());
    }
    
    // Only auto-set if we detected 'stock' or 'option' as requested
    if (detectedType === 'stock' || detectedType === 'option') {
      // Only change if current asset type is different to avoid unnecessary updates
      if (form.values.assetType !== detectedType) {
        form.setValue('assetType', detectedType);
      }
    }
  };

  // Auto-calculate total amount when quantity or price changes
  React.useEffect(() => {
    const quantity = parseFloat(form.values.quantity);
    const price = parseFloat(form.values.price);
    
    if (!isNaN(quantity) && !isNaN(price) && quantity > 0 && price > 0) {
      const total = quantity * price;
      form.setValue('totalAmount', total.toFixed(2));
    }
  }, [form.values.quantity, form.values.price, form]);

  // Auto-select first portfolio when portfolios load and no portfolio is selected
  React.useEffect(() => {
    if (!form.values.portfolioId && portfolios.length > 0 && !initialData?.portfolioId) {
      const defaultPortfolio = activePortfolio || portfolios[0];
      form.setValue('portfolioId', defaultPortfolio.id);
    }
  }, [portfolios, activePortfolio, form.values.portfolioId, initialData?.portfolioId, form]);

  const transactionTypeOptions = [
    { value: 'buy', label: 'Buy' },
    { value: 'sell', label: 'Sell' },
    { value: 'dividend', label: 'Dividend' },
    { value: 'split', label: 'Stock Split' }
  ];

  const assetTypeOptions = [
    { value: 'stock', label: 'Stock' },
    { value: 'etf', label: 'ETF' },
    { value: 'option', label: 'Option' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'forex', label: 'Forex' },
    { value: 'reit', label: 'REIT' }
  ];

  // Show error if no portfolios are available
  if (!portfoliosLoading && portfolios.length === 0) {
    return (
      <div className="form-container">
        <div className="status-indicator neutral" style={{ 
          padding: 'var(--space-6)', 
          textAlign: 'center', 
          background: 'var(--color-warning-50)', 
          border: '1px solid var(--color-warning-200)', 
          borderRadius: 'var(--radius-lg)',
          margin: 'var(--space-4) 0'
        }}>
          <h3 style={{ color: 'var(--color-warning-700)', margin: '0 0 var(--space-4) 0' }}>
            No Portfolios Available
          </h3>
          <p style={{ color: 'var(--color-warning-700)', margin: '0 0 var(--space-4) 0' }}>
            You need to create a portfolio before adding transactions.
          </p>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onCancel}
          >
            Go Back to Create Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
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
        <TooltipWrapper tooltip="Enter stock symbol or use natural language like 'Apple stock' or 'AAPL'. AI will help validate and convert to proper symbol.">
          <SymbolInput
            id="assetSymbol"
            name="assetSymbol"
            label="Symbol"
            value={form.values.assetSymbol}
            onChange={handleSymbolChange}
            onBlur={() => form.setFieldTouched('assetSymbol')}
            error={form.touched.assetSymbol ? form.errors.assetSymbol?.message : ''}
            required
            disabled={form.isSubmitting || loading}
            enableAI={true}
            showAIButton={true}
            showSuggestions={true}
            showValidation={true}
            assetType={form.values.assetType}
          />
        </TooltipWrapper>
      </div>
      <div className="horizontal-fields-container">
        <SelectField
          id="assetType"
          name="assetType"
          label="Asset Type"
          value={form.values.assetType}
          onChange={(e) => form.setValue('assetType', e.target.value as AssetType)}
          onBlur={() => form.setFieldTouched('assetType')}
          options={assetTypeOptions}
          error={form.touched.assetType ? form.errors.assetType?.message : ''}
          required
          disabled={form.isSubmitting || loading}
        />
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
      </div>
      <div className="horizontal-fields-container">
        <InputField
          id="quantity"
          name="quantity"
          label="Quantity"
          type="number"
          placeholder="e.g., 100"
          value={form.values.quantity}
          onChange={(value) => form.setValue('quantity', value)}
          onBlur={() => form.setFieldTouched('quantity')}
          error={form.touched.quantity ? form.errors.quantity?.message : ''}
          required
          disabled={form.isSubmitting || loading}
          min={0}
          step={0.01}
        />
        <PriceInput
          id="price"
          name="price"
          label="Price per Share"
          value={form.values.price}
          onChange={(value) => form.setValue('price', value)}
          onBlur={() => form.setFieldTouched('price')}
          error={form.touched.price ? form.errors.price?.message : ''}
          required
          disabled={form.isSubmitting || loading}
          assetType={form.values.assetType}
        />
      </div>
      <div className="horizontal-fields-container">
        <PriceInput
          id="totalAmount"
          name="totalAmount"
          label="Total Amount"
          value={form.values.totalAmount}
          onChange={(value) => form.setValue('totalAmount', value)}
          onBlur={() => form.setFieldTouched('totalAmount')}
          error={form.touched.totalAmount ? form.errors.totalAmount?.message : ''}
          disabled
          required
        />
        <PriceInput
          id="fees"
          name="fees"
          label="Fees"
          value={form.values.fees}
          onChange={(value) => form.setValue('fees', value)}
          onBlur={() => form.setFieldTouched('fees')}
          error={form.touched.fees ? form.errors.fees?.message : ''}
          disabled={form.isSubmitting || loading}
        />
      </div>
      <div className="horizontal-fields-container">
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
          max={new Date().toISOString().split('T')[0]}
        />
        <InputField
          id="notes"
          name="notes"
          label="Notes"
          type="textarea"
          placeholder="e.g., Initial investment in tech stocks"
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
  );
};

export default TransactionForm;
