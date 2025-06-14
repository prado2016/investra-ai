import React, { useState } from 'react';
import styled from 'styled-components';
import { X, Save } from 'lucide-react';
import type { TransactionWithAsset } from './TransactionList';
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
  max-width: 500px;
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

interface TransactionEditModalProps {
  transaction: TransactionWithAsset;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    transaction_type: string;
    quantity: number;
    price: number;
    transaction_date: string;
  }) => Promise<void>;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    transaction_type: transaction.transaction_type || 'buy',
    quantity: transaction.quantity?.toString() || '',
    price: transaction.price?.toString() || '',
    transaction_date: transaction.transaction_date?.split('T')[0] || ''
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
        transaction_date: formData.transaction_date
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
            <Label>Price per Share *</Label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="Enter price (e.g., 108.6099)"
              required
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

          {totalAmount > 0 && (
            <InfoText>
              Total Amount: {formatCurrency(totalAmount, transaction.currency || 'USD')}
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
