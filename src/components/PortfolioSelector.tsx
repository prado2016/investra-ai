/**
 * Portfolio Selector Component
 * Task 8.1: Multi-portfolio selector interface
 * Provides UI for selecting and managing multiple portfolios
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, Plus, Settings, Briefcase } from 'lucide-react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { Modal } from './ui/Modal';
import PortfolioCreationForm from './PortfolioCreationForm';
import type { Portfolio } from '../lib/database/types';

const SelectorContainer = styled.div`
  position: relative;
  display: inline-block;
  min-width: 200px;
`;

const SelectorButton = styled.button<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid ${props => props.$isOpen ? '#3b82f6' : '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.$isOpen ? '0 0 0 3px rgb(59 130 246 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)'};

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: ${props => props.$isOpen ? '#60a5fa' : '#4b5563'};
    color: #f3f4f6;

    &:hover {
      border-color: #6b7280;
    }
  }
`;

const CurrentPortfolio = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  text-align: left;
`;

const PortfolioIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #3b82f6;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
`;

const PortfolioInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const PortfolioName = styled.span`
  font-weight: 500;
  color: #111827;
  
  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const PortfolioCurrency = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  
  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ChevronIcon = styled(ChevronDown)<{ $isOpen: boolean }>`
  width: 16px;
  height: 16px;
  color: #6b7280;
  transition: transform 0.2s ease;
  transform: rotate(${props => props.$isOpen ? '180deg' : '0deg'});
  
  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  max-height: 300px;
  overflow-y: auto;
  display: ${props => props.$isOpen ? 'block' : 'none'};

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const PortfolioOption = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => props.$isActive ? '#f3f4f6' : 'transparent'};
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f9fafb;
  }

  &:first-child {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }

  &:last-child {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  [data-theme="dark"] & {
    background: ${props => props.$isActive ? '#4b5563' : 'transparent'};
    color: #f3f4f6;

    &:hover {
      background: #4b5563;
    }
  }
`;

const OptionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
`;

const OptionName = styled.span`
  font-weight: 500;
  color: #111827;
  
  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const OptionDetails = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  
  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const DropdownDivider = styled.hr`
  margin: 0.5rem 0;
  border: none;
  border-top: 1px solid #e5e7eb;
  
  [data-theme="dark"] & {
    border-color: #4b5563;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f3f4f6;
  }

  [data-theme="dark"] & {
    color: #60a5fa;

    &:hover {
      background: #4b5563;
    }
  }
`;

const LoadingState = styled.div`
  padding: 0.75rem 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  
  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ErrorState = styled.div`
  padding: 0.75rem 1rem;
  text-align: center;
  color: #dc2626;
  font-size: 0.875rem;
`;

interface PortfolioSelectorProps {
  className?: string;
  onPortfolioChange?: (portfolio: Portfolio) => void;
  showCreateButton?: boolean;
  showManageButton?: boolean;
  compact?: boolean;
}

const PortfolioSelector: React.FC<PortfolioSelectorProps> = ({
  className,
  onPortfolioChange,
  showCreateButton = true,
  showManageButton = false,
  compact = false
}) => {
  const { portfolios, activePortfolio, setActivePortfolio, loading, error, refreshPortfolios } = usePortfolios();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handlePortfolioSelect = (portfolio: Portfolio) => {
    setActivePortfolio(portfolio);
    onPortfolioChange?.(portfolio);
    setIsOpen(false);
  };

  const handleCreatePortfolio = () => {
    setShowCreateModal(true);
    setIsOpen(false);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    refreshPortfolios();
  };

  const getPortfolioInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPortfolioDetails = (portfolio: Portfolio): string => {
    const details = [];
    if (portfolio.currency) details.push(portfolio.currency);
    if (portfolio.is_default) details.push('Default');
    return details.join(' • ');
  };

  return (
    <>
      <SelectorContainer className={className}>
        <SelectorButton
          $isOpen={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <CurrentPortfolio>
            {activePortfolio ? (
              <>
                <PortfolioIcon>
                  {getPortfolioInitials(activePortfolio.name)}
                </PortfolioIcon>
                <PortfolioInfo>
                  <PortfolioName>{activePortfolio.name}</PortfolioName>
                  {!compact && (
                    <PortfolioCurrency>
                      {formatPortfolioDetails(activePortfolio)}
                    </PortfolioCurrency>
                  )}
                </PortfolioInfo>
              </>
            ) : (
              <>
                <PortfolioIcon>
                  <Briefcase size={12} />
                </PortfolioIcon>
                <PortfolioInfo>
                  <PortfolioName>Select Portfolio</PortfolioName>
                </PortfolioInfo>
              </>
            )}
          </CurrentPortfolio>
          <ChevronIcon $isOpen={isOpen} />
        </SelectorButton>

        <DropdownMenu $isOpen={isOpen}>
          {loading ? (
            <LoadingState>Loading portfolios...</LoadingState>
          ) : error ? (
            <ErrorState>Error: {error}</ErrorState>
          ) : portfolios.length === 0 ? (
            <LoadingState>No portfolios found</LoadingState>
          ) : (
            <>
              {portfolios.map((portfolio) => (
                <PortfolioOption
                  key={portfolio.id}
                  $isActive={activePortfolio?.id === portfolio.id}
                  onClick={() => handlePortfolioSelect(portfolio)}
                >
                  <PortfolioIcon>
                    {getPortfolioInitials(portfolio.name)}
                  </PortfolioIcon>
                  <OptionInfo>
                    <OptionName>{portfolio.name}</OptionName>
                    <OptionDetails>
                      {formatPortfolioDetails(portfolio)}
                      {portfolio.description && ` • ${portfolio.description}`}
                    </OptionDetails>
                  </OptionInfo>
                </PortfolioOption>
              ))}

              {(showCreateButton || showManageButton) && (
                <DropdownDivider />
              )}

              {showCreateButton && (
                <ActionButton onClick={handleCreatePortfolio}>
                  <Plus size={16} />
                  Create New Portfolio
                </ActionButton>
              )}

              {showManageButton && (
                <ActionButton onClick={() => setIsOpen(false)}>
                  <Settings size={16} />
                  Manage Portfolios
                </ActionButton>
              )}
            </>
          )}
        </DropdownMenu>
      </SelectorContainer>

      {/* Create Portfolio Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Portfolio"
        size="md"
      >
        <PortfolioCreationForm
          onSuccess={handleCreateSuccess}
          compact={true}
        />
      </Modal>
    </>
  );
};

export default PortfolioSelector;