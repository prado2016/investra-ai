import React, { useState } from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import { SupabaseService } from '../services';
import { useNotifications } from '../hooks/useNotifications';

const FormContainer = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const FormTitle = styled.h3`
  color: #1e293b;
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
  
  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
  
  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
  
  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const RequiredIndicator = styled.span`
  color: #dc2626;
`;

interface PortfolioCreationFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

const PortfolioCreationForm: React.FC<PortfolioCreationFormProps> = ({ 
  onSuccess, 
  compact = false 
}) => {
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const { success, error } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!portfolioName.trim()) {
      error('Validation Error', 'Portfolio name is required');
      return;
    }

    setLoading(true);
    
    try {
      const result = await SupabaseService.portfolio.createPortfolio(
        portfolioName.trim(),
        portfolioDescription.trim(),
        currency
      );

      if (result.success && result.data) {
        success('Portfolio Created!', `Successfully created portfolio "${result.data.name}"`);
        setPortfolioName('');
        setPortfolioDescription('');
        setCurrency('USD');
        onSuccess?.();
      } else {
        error('Creation Failed', result.error || 'Failed to create portfolio');
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>
        <Plus size={20} />
        Create New Portfolio
      </FormTitle>
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="portfolio-name">
            Portfolio Name <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="portfolio-name"
            type="text"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            placeholder="Enter portfolio name"
            disabled={loading}
            required
          />
        </FormGroup>

        {!compact && (
          <FormGroup>
            <Label htmlFor="portfolio-description">Description</Label>
            <TextArea
              id="portfolio-description"
              value={portfolioDescription}
              onChange={(e) => setPortfolioDescription(e.target.value)}
              placeholder="Optional description for your portfolio"
              disabled={loading}
            />
          </FormGroup>
        )}

        <FormGroup>
          <Label htmlFor="portfolio-currency">Base Currency</Label>
          <Select
            id="portfolio-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="JPY">JPY - Japanese Yen</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="CHF">CHF - Swiss Franc</option>
            <option value="CNY">CNY - Chinese Yuan</option>
          </Select>
        </FormGroup>

        <SubmitButton type="submit" disabled={loading}>
          <Plus size={16} />
          {loading ? 'Creating Portfolio...' : 'Create Portfolio'}
        </SubmitButton>
      </Form>
    </FormContainer>
  );
};

export default PortfolioCreationForm;
