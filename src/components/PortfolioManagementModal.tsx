/**
 * Portfolio Management Modal
 * Task 8.2: Build portfolio creation/edit modals
 * Comprehensive modal for creating, editing, and managing portfolios
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Star, 
  StarOff, 
  Save, 
  X, 
  Settings
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { usePortfolios } from '../contexts/PortfolioContext';
import { useNotifications } from '../hooks/useNotifications';
import { SupabaseService } from '../services';
import type { Portfolio } from '../lib/database/types';

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 70vh;
  overflow: hidden;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1rem;

  [data-theme="dark"] & {
    border-color: #4b5563;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  font-weight: ${props => props.$active ? '600' : '400'};
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #3b82f6;
  }

  [data-theme="dark"] & {
    color: ${props => props.$active ? '#60a5fa' : '#9ca3af'};
    
    &:hover {
      color: #60a5fa;
    }
  }
`;

const PortfolioList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const PortfolioCard = styled.div<{ $isDefault: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid ${props => props.$isDefault ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  background: ${props => props.$isDefault ? '#f0f9ff' : 'white'};
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  [data-theme="dark"] & {
    background: ${props => props.$isDefault ? '#1e3a8a' : '#374151'};
    border-color: ${props => props.$isDefault ? '#60a5fa' : '#4b5563'};
  }
`;

const PortfolioIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
`;

const PortfolioInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PortfolioName = styled.h4`
  margin: 0;
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const PortfolioDetails = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const PortfolioActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &.default {
    color: #f59e0b;
    border-color: #f59e0b;
    
    &:hover {
      background: #fef3c7;
    }
  }

  &.edit {
    color: #3b82f6;
    
    &:hover {
      border-color: #3b82f6;
      background: #eff6ff;
    }
  }

  &.delete {
    color: #dc2626;
    
    &:hover {
      border-color: #dc2626;
      background: #fef2f2;
    }
  }

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;

    &:hover {
      background: #6b7280;
    }
  }
`;

const FormContainer = styled.div`
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

  [data-theme="dark"] & {
    color: #f3f4f6;
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

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;
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

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;

  [data-theme="dark"] & {
    background: #4b5563;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

type TabType = 'manage' | 'create' | 'edit';

interface PortfolioFormData {
  name: string;
  description: string;
  currency: string;
  isDefault: boolean;
}

interface PortfolioManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
  editPortfolioId?: string;
}

const PortfolioManagementModal: React.FC<PortfolioManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'manage',
  editPortfolioId
}) => {
  const { portfolios, activePortfolio, refreshPortfolios } = usePortfolios();
  const { success, error } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [formData, setFormData] = useState<PortfolioFormData>({
    name: '',
    description: '',
    currency: 'USD',
    isDefault: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(initialTab);
      setEditingPortfolio(null);
      setFormData({
        name: '',
        description: '',
        currency: 'USD',
        isDefault: false
      });
      setFormErrors({});
    }
  }, [isOpen, initialTab]);

  // Load portfolio for editing
  useEffect(() => {
    if (editPortfolioId && portfolios.length > 0) {
      const portfolio = portfolios.find(p => p.id === editPortfolioId);
      if (portfolio) {
        setEditingPortfolio(portfolio);
        setFormData({
          name: portfolio.name,
          description: portfolio.description || '',
          currency: portfolio.currency,
          isDefault: portfolio.is_default
        });
        setActiveTab('edit');
      }
    }
  }, [editPortfolioId, portfolios]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Portfolio name is required';
    }

    if (formData.name.length > 100) {
      errors.name = 'Portfolio name must be 100 characters or less';
    }

    if (formData.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePortfolio = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await SupabaseService.portfolio.createPortfolio(
        formData.name.trim(),
        formData.description.trim(),
        formData.currency
      );

      if (result.success && result.data) {
        success('Portfolio Created', `Successfully created "${formData.name}"`);
        
        // Set as default if requested
        if (formData.isDefault) {
          await SupabaseService.portfolio.setDefaultPortfolio(result.data.id);
        }
        
        await refreshPortfolios();
        setActiveTab('manage');
        setFormData({
          name: '',
          description: '',
          currency: 'USD',
          isDefault: false
        });
      } else {
        error('Creation Failed', result.error || 'Failed to create portfolio');
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPortfolio = async () => {
    if (!editingPortfolio || !validateForm()) return;

    setLoading(true);
    try {
      const result = await SupabaseService.portfolio.updatePortfolio(
        editingPortfolio.id,
        {
          name: formData.name.trim(),
          description: formData.description.trim(),
          currency: formData.currency
        }
      );

      if (result.success) {
        // Set as default if requested
        if (formData.isDefault && !editingPortfolio.is_default) {
          await SupabaseService.portfolio.setDefaultPortfolio(editingPortfolio.id);
        }

        success('Portfolio Updated', `Successfully updated "${formData.name}"`);
        await refreshPortfolios();
        setActiveTab('manage');
        setEditingPortfolio(null);
      } else {
        error('Update Failed', result.error || 'Failed to update portfolio');
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePortfolio = async (portfolio: Portfolio) => {
    if (portfolio.id === activePortfolio?.id) {
      error('Cannot Delete', 'Cannot delete the currently active portfolio');
      return;
    }

    if (portfolio.is_default) {
      error('Cannot Delete', 'Cannot delete the default portfolio. Set another portfolio as default first.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      // TODO: Implement delete portfolio method in SupabaseService
      const result = { success: false, error: 'Delete portfolio not implemented yet' };

      if (result.success) {
        success('Portfolio Deleted', `Successfully deleted "${portfolio.name}"`);
        await refreshPortfolios();
      } else {
        error('Deletion Failed', result.error || 'Failed to delete portfolio');
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (portfolio: Portfolio) => {
    setLoading(true);
    try {
      const result = await SupabaseService.portfolio.setDefaultPortfolio(portfolio.id);

      if (result.success) {
        success('Default Set', `"${portfolio.name}" is now the default portfolio`);
        await refreshPortfolios();
      } else {
        error('Failed to Set Default', result.error || 'Unknown error');
      }
    } catch (err) {
      error('Unexpected Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const startEditPortfolio = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setFormData({
      name: portfolio.name,
      description: portfolio.description || '',
      currency: portfolio.currency,
      isDefault: portfolio.is_default
    });
    setActiveTab('edit');
  };

  const getPortfolioInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalPortfolios = portfolios.length;
  const defaultPortfolio = portfolios.find(p => p.is_default);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Portfolio Management"
      size="lg"
    >
      <ModalContent>
        <TabContainer>
          <Tab
            $active={activeTab === 'manage'}
            onClick={() => setActiveTab('manage')}
          >
            <Settings size={16} style={{ marginRight: '0.5rem' }} />
            Manage
          </Tab>
          <Tab
            $active={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Create
          </Tab>
          {activeTab === 'edit' && (
            <Tab $active={true} onClick={() => {}}>
              <Edit3 size={16} style={{ marginRight: '0.5rem' }} />
              Edit Portfolio
            </Tab>
          )}
        </TabContainer>

        {activeTab === 'manage' && (
          <>
            <StatsContainer>
              <StatCard>
                <StatValue>{totalPortfolios}</StatValue>
                <StatLabel>Total Portfolios</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{defaultPortfolio?.name.slice(0, 10) || 'None'}</StatValue>
                <StatLabel>Default Portfolio</StatLabel>
              </StatCard>
            </StatsContainer>

            <PortfolioList>
              {portfolios.map((portfolio) => (
                <PortfolioCard
                  key={portfolio.id}
                  $isDefault={portfolio.is_default}
                >
                  <PortfolioIcon>
                    {getPortfolioInitials(portfolio.name)}
                  </PortfolioIcon>
                  <PortfolioInfo>
                    <PortfolioName>
                      {portfolio.name}
                      {portfolio.is_default && ' (Default)'}
                    </PortfolioName>
                    <PortfolioDetails>
                      {portfolio.currency}
                      {portfolio.description && ` • ${portfolio.description}`}
                      {portfolio.created_at && ` • Created ${new Date(portfolio.created_at).toLocaleDateString()}`}
                    </PortfolioDetails>
                  </PortfolioInfo>
                  <PortfolioActions>
                    <ActionButton
                      className={portfolio.is_default ? 'default' : ''}
                      onClick={() => handleSetDefault(portfolio)}
                      disabled={portfolio.is_default || loading}
                      title={portfolio.is_default ? 'Default portfolio' : 'Set as default'}
                    >
                      {portfolio.is_default ? <Star size={14} /> : <StarOff size={14} />}
                    </ActionButton>
                    <ActionButton
                      className="edit"
                      onClick={() => startEditPortfolio(portfolio)}
                      disabled={loading}
                      title="Edit portfolio"
                    >
                      <Edit3 size={14} />
                    </ActionButton>
                    <ActionButton
                      className="delete"
                      onClick={() => handleDeletePortfolio(portfolio)}
                      disabled={loading || portfolio.is_default || portfolio.id === activePortfolio?.id}
                      title="Delete portfolio"
                    >
                      <Trash2 size={14} />
                    </ActionButton>
                  </PortfolioActions>
                </PortfolioCard>
              ))}
            </PortfolioList>
          </>
        )}

        {(activeTab === 'create' || activeTab === 'edit') && (
          <FormContainer>
            <FormGroup>
              <Label htmlFor="portfolio-name">
                Portfolio Name *
              </Label>
              <Input
                id="portfolio-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter portfolio name"
                disabled={loading}
                error={formErrors.name}
              />
              {formErrors.name && <ErrorMessage>{formErrors.name}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="portfolio-description">Description</Label>
              <TextArea
                id="portfolio-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for your portfolio"
                disabled={loading}
              />
              {formErrors.description && <ErrorMessage>{formErrors.description}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="portfolio-currency">Base Currency</Label>
              <Select
                id="portfolio-currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  id="portfolio-default"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  disabled={loading}
                />
                <Label htmlFor="portfolio-default">
                  Set as default portfolio
                </Label>
              </CheckboxContainer>
            </FormGroup>

            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => setActiveTab('manage')}
                disabled={loading}
              >
                <X size={16} />
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={activeTab === 'create' ? handleCreatePortfolio : handleEditPortfolio}
                disabled={loading}
              >
                <Save size={16} />
                {loading ? 'Saving...' : activeTab === 'create' ? 'Create Portfolio' : 'Update Portfolio'}
              </Button>
            </ButtonGroup>
          </FormContainer>
        )}
      </ModalContent>
    </Modal>
  );
};

export default PortfolioManagementModal;