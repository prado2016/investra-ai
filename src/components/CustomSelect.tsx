import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';

const SelectContainer = styled.div`
  position: relative;
  width: 200px;
`;

const SelectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
`;

const SelectValue = styled.span`
  color: #374151;
`;

const SelectOptions = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin-top: 0.25rem;
  z-index: 10;
`;

const SelectOption = styled.div`
  padding: 0.5rem 1rem;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
`;

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <SelectContainer>
      <SelectHeader onClick={() => setIsOpen(!isOpen)}>
        <SelectValue>{selectedOption?.label}</SelectValue>
        <ChevronDown size={16} />
      </SelectHeader>
      {isOpen && (
        <SelectOptions>
          {options.map(option => (
            <SelectOption key={option.value} onClick={() => handleSelect(option.value)}>
              {option.label}
            </SelectOption>
          ))}
        </SelectOptions>
      )}
    </SelectContainer>
  );
};

export default CustomSelect;
