import React, { useState } from 'react';
import styled from 'styled-components';
import { X, Save } from 'lucide-react';
import type { UnifiedTransactionEntry } from '../types/unifiedEntry';
import { formatCurrency } from '../utils/formatting';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-primary);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-primary);
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const Label = styled.label`
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
`;

const Input = styled.input`
  padding: var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.15);
  }
`;

const Select = styled.select`
  padding: var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.15);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-primary);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  ${({ variant = 'secondary' }) => {
    if (variant === 'primary') {
      return `
        background: var(--color-primary-600);
        color: white;
        border: 1px solid var(--color-primary-600);
        
        &:hover {
          background: var(--color-primary-700);
          border-color: var(--color-primary-700);
        }
        
        &:disabled {
          background: var(--color-gray-400);
          border-color: var(--color-gray-400);
          cursor: not-allowed;
        }
      `;
    } else {
      return `
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-primary);
        
        &:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-secondary);
        }
      `;
    }
  }}
`;

const InfoText = styled.p`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0 0 var(--space-4) 0;
`;

const SectionTitle = styled.h3`
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: var(--space-6) 0 var(--space-3) 0;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-secondary);
  
  &:first-of-type {
    margin-top: 0;
  }
`;

interface TransactionEditModalProps {
  transaction: UnifiedTransactionEntry;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    transaction_type: string;
    quantity: number;
    price: number;
    transaction_date: string;
    fees?: number;
    currency?: string;
    notes?: string;
    settlement_date?: string;
    exchange_rate?: number;
    broker_name?: string;
    external_id?: string;
  }) => Promise<void>;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    transaction_type: transaction.transactionType || 'buy',
    quantity: transaction.quantity?.toString() || '',
    price: transaction.price?.toString() || '',
    transaction_date: transaction.date.toISOString().split('T')[0] || '',
    fees: transaction.fees?.toString() || '0',
    currency: transaction.currency || 'USD',
    notes: transaction.notes || '',
    settlement_date: transaction.settlementDate?.split('T')[0] || '',
    exchange_rate: '1',
    broker_name: transaction.brokerName || '',
    external_id: transaction.externalId || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.quantity || !formData.price || !formData.transaction_date) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        transaction_type: formData.transaction_type,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        transaction_date: formData.transaction_date,
        fees: formData.fees ? parseFloat(formData.fees) : 0,
        currency: formData.currency,
        notes: formData.notes || undefined,
        settlement_date: formData.settlement_date || undefined,
        exchange_rate: formData.exchange_rate ? parseFloat(formData.exchange_rate) : 1,
        broker_name: formData.broker_name || undefined,
        external_id: formData.external_id || undefined
      });
      onClose();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      alert('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-set price to 0 when option_expired is selected
  React.useEffect(() => {
    if (formData.transaction_type === 'option_expired' && formData.price !== '0') {
      setFormData(prev => ({ ...prev, price: '0' }));
    }
  }, [formData.transaction_type, formData.price]);

  // Calculate total amount
  const totalAmount = parseFloat(formData.quantity || '0') * parseFloat(formData.price || '0');

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Edit Transaction</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <InfoText>
          Editing {transaction.asset?.symbol || 'Unknown'} transaction
        </InfoText>

        <Form onSubmit={handleSubmit}>
          <SectionTitle>Basic Transaction Details</SectionTitle>
          
          <FieldGroup>
            <Label>Transaction Type *</Label>
            <Select 
              value={formData.transaction_type}
              onChange={(e) => handleChange('transaction_type', e.target.value)}
              required
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="dividend">Dividend</option>
              {transaction.asset?.assetType === 'option' && (
                <option value="option_expired">Option Expired</option>
              )}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Quantity *</Label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </FieldGroup>

          <FieldGroup>
            <Label>Price per Share {formData.transaction_type !== 'option_expired' ? '*' : ''}</Label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder={formData.transaction_type === 'option_expired' ? '0.00 (auto-set)' : 'Enter price (e.g., 108.6099)'}
              required={formData.transaction_type !== 'option_expired'}
              disabled={formData.transaction_type === 'option_expired'}
            />
          </FieldGroup>

          <FieldGroup>
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => handleChange('transaction_date', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </FieldGroup>

          <SectionTitle>Financial Details</SectionTitle>
          
          <FieldGroup>
            <Label>Fees</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.fees}
              onChange={(e) => handleChange('fees', e.target.value)}
              placeholder="Enter transaction fees (e.g., 1.50)"
            />
          </FieldGroup>

          <FieldGroup>
            <Label>Currency</Label>
            <Select
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="CHF">CHF</option>
              <option value="CNY">CNY</option>
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Settlement Date</Label>
            <Input
              type="date"
              value={formData.settlement_date}
              onChange={(e) => handleChange('settlement_date', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </FieldGroup>

          <FieldGroup>
            <Label>Exchange Rate</Label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={formData.exchange_rate}
              onChange={(e) => handleChange('exchange_rate', e.target.value)}
              placeholder="Exchange rate (e.g., 1.0 for same currency)"
            />
          </FieldGroup>

          <FieldGroup>
            <Label>Broker Name</Label>
            <Input
              type="text"
              value={formData.broker_name}
              onChange={(e) => handleChange('broker_name', e.target.value)}
              placeholder="Enter broker name (e.g., Fidelity, TD Ameritrade)"
            />
          </FieldGroup>

          <SectionTitle>Additional Information</SectionTitle>
          
          <FieldGroup>
            <Label>External ID</Label>
            <Input
              type="text"
              value={formData.external_id}
              onChange={(e) => handleChange('external_id', e.target.value)}
              placeholder="External reference ID or order number"
            />
          </FieldGroup>

          <FieldGroup>
            <Label>Notes</Label>
            <Input
              type="text"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this transaction"
            />
          </FieldGroup>

          {totalAmount > 0 && (
            <InfoText>
              Total Amount: {formatCurrency(totalAmount, formData.currency || 'USD')}
            </InfoText>
          )}

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TransactionEditModal;
