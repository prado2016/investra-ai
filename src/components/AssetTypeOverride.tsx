import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import type { 
  AssetType
} from '../utils/assetCategorization';
import { 
  categorizeAssetWithOverride, 
  setAssetTypeOverride, 
  removeAssetTypeOverride
} from '../utils/assetCategorization';

const Container = styled.div`
  background: ${props => props.theme?.colors?.surface || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  margin: 0;
  color: ${props => props.theme?.colors?.text?.primary || '#333'};
  font-size: 1.1rem;
`;

const StatusBadge = styled.span<{ type: 'auto' | 'manual' | 'warning' }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.type) {
      case 'manual':
        return `
          background-color: #10b981;
          color: white;
        `;
      case 'warning':
        return `
          background-color: #f59e0b;
          color: white;
        `;
      default:
        return `
          background-color: #6b7280;
          color: white;
        `;
    }
  }}
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const Label = styled.span`
  font-weight: 500;
  color: ${props => props.theme?.colors?.text?.primary || '#333'};
`;

const Value = styled.span`
  color: ${props => props.theme?.colors?.text?.secondary || '#666'};
`;

const ConfidenceBar = styled.div<{ confidence: number }>`
  width: 60px;
  height: 8px;
  background-color: ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 4px;
  overflow: hidden;
  
  &:after {
    content: '';
    display: block;
    width: ${props => props.confidence * 100}%;
    height: 100%;
    background-color: ${props => {
      if (props.confidence >= 0.8) return '#10b981';
      if (props.confidence >= 0.6) return '#f59e0b';
      return '#ef4444';
    }};
  }
`;

const FormSection = styled.div`
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  padding-top: 1rem;
  margin-top: 1rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
`;

const FormGroup = styled.div`
  flex: 1;
`;

const FormLabel = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: ${props => props.theme?.colors?.text?.primary || '#333'};
  font-size: 0.875rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme?.colors?.border || '#d1d5db'};
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme?.colors?.surface || '#ffffff'};
  color: ${props => props.theme?.colors?.text?.primary || '#333'};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#007bff'};
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#007bff'}20;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme?.colors?.border || '#d1d5db'};
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme?.colors?.surface || '#ffffff'};
  color: ${props => props.theme?.colors?.text?.primary || '#333'};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#007bff'};
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primary || '#007bff'}20;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: ${props.theme?.colors?.primary || '#007bff'};
          color: white;
          &:hover { opacity: 0.9; }
        `;
      case 'danger':
        return `
          background-color: #ef4444;
          color: white;
          &:hover { opacity: 0.9; }
        `;
      default:
        return `
          background-color: ${props.theme?.colors?.border || '#e5e7eb'};
          color: ${props.theme?.colors?.text?.primary || '#333'};
          &:hover { opacity: 0.8; }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MessageBox = styled.div<{ type: 'info' | 'warning' | 'error' | 'success' }>`
  padding: 0.75rem;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-size: 0.875rem;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background-color: #d1fae5;
          color: #047857;
          border: 1px solid #a7f3d0;
        `;
      case 'warning':
        return `
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        `;
      case 'error':
        return `
          background-color: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        `;
      default:
        return `
          background-color: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        `;
    }
  }}
`;

interface AssetTypeOverrideComponentProps {
  symbol: string;
  name?: string;
  onOverrideChange?: (hasOverride: boolean, assetType: AssetType | null) => void;
  className?: string;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stock/Equity',
  etf: 'ETF (Exchange Traded Fund)',
  reit: 'REIT (Real Estate Investment Trust)',
  crypto: 'Cryptocurrency',
  forex: 'Forex/Currency Pair',
  option: 'Option Contract'
};

const AssetTypeOverrideComponent: React.FC<AssetTypeOverrideComponentProps> = ({
  symbol,
  name,
  onOverrideChange,
  className
}) => {
  const [categorization, setCategorization] = useState(categorizeAssetWithOverride(symbol, name));
  const [selectedType, setSelectedType] = useState<AssetType | ''>('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);

  useEffect(() => {
    const result = categorizeAssetWithOverride(symbol, name);
    setCategorization(result);
    setSelectedType(result.hasOverride ? result.assetType || '' : '');
  }, [symbol, name]);

  const handleSetOverride = () => {
    if (!selectedType) {
      setMessage({ text: 'Please select an asset type', type: 'error' });
      return;
    }

    const success = setAssetTypeOverride(symbol, selectedType as AssetType, reason || undefined);
    
    if (success) {
      setMessage({ text: 'Asset type override applied successfully', type: 'success' });
      const newCategorization = categorizeAssetWithOverride(symbol, name);
      setCategorization(newCategorization);
      onOverrideChange?.(true, selectedType as AssetType);
    } else {
      setMessage({ text: 'Failed to set override', type: 'error' });
    }
  };

  const handleRemoveOverride = () => {
    const success = removeAssetTypeOverride(symbol);
    
    if (success) {
      setMessage({ text: 'Override removed successfully', type: 'success' });
      const newCategorization = categorizeAssetWithOverride(symbol, name);
      setCategorization(newCategorization);
      setSelectedType('');
      setReason('');
      onOverrideChange?.(false, newCategorization.assetType);
    } else {
      setMessage({ text: 'Failed to remove override', type: 'error' });
    }
  };

  return (
    <Container className={className}>
      <Header>
        <Title>Asset Classification</Title>
        <StatusBadge type={categorization.hasOverride ? 'manual' : categorization.confidence < 0.7 ? 'warning' : 'auto'}>
          {categorization.hasOverride ? 'Manual' : 'Automatic'}
        </StatusBadge>
      </Header>

      <InfoRow>
        <Label>Symbol:</Label>
        <Value>{categorization.parsedTicker.originalSymbol}</Value>
      </InfoRow>

      <InfoRow>
        <Label>Detected Type:</Label>
        <Value>
          {categorization.assetType ? ASSET_TYPE_LABELS[categorization.assetType] : 'Unknown'}
        </Value>
      </InfoRow>

      <InfoRow>
        <Label>Confidence:</Label>
        <ConfidenceBar confidence={categorization.confidence} />
      </InfoRow>

      {categorization.parsedTicker.exchange && (
        <InfoRow>
          <Label>Exchange:</Label>
          <Value>{categorization.parsedTicker.exchange}</Value>
        </InfoRow>
      )}

      {categorization.hasOverride && categorization.override && (
        <MessageBox type="info">
          Override applied on {categorization.override.timestamp.toLocaleDateString()}
          {categorization.override.reason && ` - ${categorization.override.reason}`}
        </MessageBox>
      )}

      {categorization.warnings && categorization.warnings.length > 0 && (
        <MessageBox type="warning">
          {categorization.warnings.join('; ')}
        </MessageBox>
      )}

      <FormSection>
        <FormRow>
          <FormGroup>
            <FormLabel>Override Asset Type</FormLabel>
            <Select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value as AssetType | '')}
            >
              <option value="">Select asset type...</option>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FormGroup>
          
          <FormGroup>
            <FormLabel>Reason (Optional)</FormLabel>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why override the automatic detection?"
            />
          </FormGroup>
          
          <div>
            <Button 
              variant="primary" 
              onClick={handleSetOverride}
              disabled={!selectedType}
            >
              Apply Override
            </Button>
          </div>
        </FormRow>

        {categorization.hasOverride && (
          <FormRow>
            <div style={{ flex: 1 }} />
            <Button variant="danger" onClick={handleRemoveOverride}>
              Remove Override
            </Button>
          </FormRow>
        )}

        {message && (
          <MessageBox type={message.type}>
            {message.text}
          </MessageBox>
        )}
      </FormSection>
    </Container>
  );
};

export default AssetTypeOverrideComponent;
