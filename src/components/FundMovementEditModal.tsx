import React from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import FundMovementForm from './FundMovementForm';
import type { FundMovementWithMetadata } from './FundMovementList';
import type { FundMovement } from '../types/portfolio';

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
  max-width: 800px;
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

const InfoText = styled.p`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0 0 var(--space-4) 0;
`;

const FormWrapper = styled.div`
  .enhanced-form-section {
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    padding: 0;
  }
  
  .enhanced-section-header {
    display: none;
  }
  
  .enhanced-form-wrapper {
    padding: 0;
  }
`;

interface FundMovementEditModalProps {
  fundMovement: FundMovementWithMetadata;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  loading?: boolean;
}

export const FundMovementEditModal: React.FC<FundMovementEditModalProps> = ({
  fundMovement,
  isOpen,
  onClose,
  onSave,
  loading = false
}) => {
  const handleSave = async (fundMovementData: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const success = await onSave(fundMovementData);
      if (success) {
        onClose();
      }
      return success;
    } catch (error) {
      console.error('Failed to save fund movement:', error);
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Edit Fund Movement</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <InfoText>
          Editing {fundMovement.type} fund movement from {fundMovement.date.toLocaleDateString()}
        </InfoText>

        <FormWrapper>
          <FundMovementForm
            initialData={fundMovement}
            onSave={handleSave}
            loading={loading}
          />
        </FormWrapper>
      </ModalContent>
    </ModalOverlay>
  );
};

export default FundMovementEditModal;
