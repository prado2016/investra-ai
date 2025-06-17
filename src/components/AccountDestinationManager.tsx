import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { accountDestinationService, type AccountDestination } from '../services/accountDestinationService';

const Container = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 1rem;
  font-size: 1.2rem;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-size: 0.875rem;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 1rem;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DestinationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DestinationItem = styled.div<{ $isEditing?: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  ${props => props.$isEditing && `
    border-color: #007bff;
    box-shadow: 0 0 0 3px #007bff20;
  `}
`;

const DestinationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DestinationName = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const DestinationDetails = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const TypeBadge = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.$type) {
      case 'TFSA':
        return `background-color: #28a745; color: white;`;
      case 'RRSP':
        return `background-color: #17a2b8; color: white;`;
      case 'CASH':
        return `background-color: #ffc107; color: #212529;`;
      case 'CHECKING':
        return `background-color: #6f42c1; color: white;`;
      case 'SAVINGS':
        return `background-color: #20c997; color: white;`;
      case 'INVESTMENT':
        return `background-color: #fd7e14; color: white;`;
      default:
        return `background-color: #6c757d; color: white;`;
    }
  }}
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{ $variant?: 'edit' | 'delete' | 'save' | 'cancel' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.$variant) {
      case 'edit':
        return `
          background-color: #007bff;
          color: white;
          &:hover { background-color: #0056b3; }
        `;
      case 'delete':
        return `
          background-color: #dc3545;
          color: white;
          &:hover { background-color: #c82333; }
        `;
      case 'save':
        return `
          background-color: #28a745;
          color: white;
          &:hover { background-color: #218838; }
        `;
      case 'cancel':
        return `
          background-color: #6c757d;
          color: white;
          &:hover { background-color: #545b62; }
        `;
      default:
        return `
          background-color: #6c757d;
          color: white;
          &:hover { background-color: #545b62; }
        `;
    }
  }}
`;

const FormContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px #007bff20;
  }
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px #007bff20;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const SuccessMessage = styled.div`
  color: #28a745;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

interface AccountDestinationManagerProps {
  onUpdate?: () => void;
}

const AccountDestinationManager: React.FC<AccountDestinationManagerProps> = ({
  onUpdate
}) => {
  const [destinations, setDestinations] = useState<AccountDestination[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    type: 'OTHER' as AccountDestination['type']
  });

  // Edit form state
  const [editData, setEditData] = useState({
    name: '',
    displayName: '',
    type: 'OTHER' as AccountDestination['type']
  });

  useEffect(() => {
    loadDestinations();
    // Initialize service with defaults if needed
    accountDestinationService.initialize();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadDestinations = () => {
    const allDestinations = accountDestinationService.getAll();
    setDestinations(allDestinations);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.displayName.trim()) {
      showMessage('Name and display name are required', 'error');
      return;
    }

    try {
      await accountDestinationService.create(formData);
      loadDestinations();
      setFormData({ name: '', displayName: '', type: 'OTHER' });
      setShowAddForm(false);
      showMessage('Account destination added successfully', 'success');
      onUpdate?.();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to add account destination', 'error');
    }
  };

  const handleEditStart = (destination: AccountDestination) => {
    setEditingId(destination.id);
    setEditData({
      name: destination.name,
      displayName: destination.displayName,
      type: destination.type
    });
  };

  const handleEditSubmit = async () => {
    if (!editingId) return;

    if (!editData.name.trim() || !editData.displayName.trim()) {
      showMessage('Name and display name are required', 'error');
      return;
    }

    try {
      await accountDestinationService.update(editingId, editData);
      loadDestinations();
      setEditingId(null);
      showMessage('Account destination updated successfully', 'success');
      onUpdate?.();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to update account destination', 'error');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData({ name: '', displayName: '', type: 'OTHER' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await accountDestinationService.delete(id);
      loadDestinations();
      showMessage('Account destination deleted successfully', 'success');
      onUpdate?.();
    } catch {
      showMessage('Failed to delete account destination', 'error');
    }
  };

  const typeOptions = accountDestinationService.getAccountTypeOptions();

  return (
    <Container>
      <Title>Account Destination Management</Title>
      <Description>
        Manage account destinations for fund movements. These accounts will be available 
        when adding deposits, withdrawals, transfers, and currency conversions.
      </Description>

      <AddButton onClick={() => setShowAddForm(!showAddForm)}>
        <Plus size={16} />
        Add New Account
      </AddButton>

      {showAddForm && (
        <form onSubmit={handleAddSubmit}>
          <FormContainer>
            <FormField>
              <Label>Account Name</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., RBC Chequing Account"
                required
              />
            </FormField>
            
            <FormField>
              <Label>Display Name</Label>
              <Input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., RBC Chequing"
                required
              />
            </FormField>

            <FormField>
              <Label>Account Type</Label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountDestination['type'] })}
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <Actions>
              <ActionButton type="submit" $variant="save">
                <Save size={14} />
              </ActionButton>
              <ActionButton type="button" $variant="cancel" onClick={() => setShowAddForm(false)}>
                <X size={14} />
              </ActionButton>
            </Actions>
          </FormContainer>
        </form>
      )}

      {message && (
        message.type === 'success' ? (
          <SuccessMessage>{message.text}</SuccessMessage>
        ) : (
          <ErrorMessage>{message.text}</ErrorMessage>
        )
      )}

      <DestinationsList>
        {destinations.map((destination) => (
          <DestinationItem key={destination.id} $isEditing={editingId === destination.id}>
            {editingId === destination.id ? (
              <>
                <FormField style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Account name"
                  />
                </FormField>
                
                <FormField style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={editData.displayName}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    placeholder="Display name"
                  />
                </FormField>

                <FormField>
                  <Select
                    value={editData.type}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value as AccountDestination['type'] })}
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <Actions>
                  <ActionButton $variant="save" onClick={handleEditSubmit}>
                    <Save size={14} />
                  </ActionButton>
                  <ActionButton $variant="cancel" onClick={handleEditCancel}>
                    <X size={14} />
                  </ActionButton>
                </Actions>
              </>
            ) : (
              <>
                <DestinationInfo>
                  <DestinationName>{destination.displayName}</DestinationName>
                  <DestinationDetails>
                    {destination.name} • <TypeBadge $type={destination.type}>{destination.type}</TypeBadge>
                  </DestinationDetails>
                </DestinationInfo>

                <Actions>
                  <ActionButton 
                    $variant="edit" 
                    onClick={() => handleEditStart(destination)}
                    title="Edit account destination"
                  >
                    <Edit2 size={14} />
                  </ActionButton>
                  <ActionButton 
                    $variant="delete" 
                    onClick={() => handleDelete(destination.id, destination.displayName)}
                    title="Delete account destination"
                  >
                    <Trash2 size={14} />
                  </ActionButton>
                </Actions>
              </>
            )}
          </DestinationItem>
        ))}
        
        {destinations.length === 0 && (
          <DestinationItem>
            <DestinationInfo>
              <DestinationDetails style={{ textAlign: 'center', width: '100%' }}>
                No account destinations configured. Click "Add New Account" to get started.
              </DestinationDetails>
            </DestinationInfo>
          </DestinationItem>
        )}
      </DestinationsList>
    </Container>
  );
};

export default AccountDestinationManager;
