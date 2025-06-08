import React from 'react';
import styled from 'styled-components';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'underlined';
  fullWidth?: boolean;
}

const InputContainer = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
`;

const InputWrapper = styled.div<{ 
  $hasError: boolean; 
  $variant: InputProps['variant'];
}>`
  position: relative;
  display: flex;
  align-items: center;
  
  ${props => {
    switch (props.$variant) {
      case 'filled':
        return `
          background-color: ${props.theme.colors.border};
          border-radius: 8px 8px 0 0;
          border-bottom: 2px solid ${props.$hasError ? props.theme.colors.error : props.theme.colors.border};
          
          &:focus-within {
            border-bottom-color: ${props.theme.colors.primary};
          }
        `;
      case 'underlined':
        return `
          background-color: transparent;
          border-bottom: 1px solid ${props.$hasError ? props.theme.colors.error : props.theme.colors.border};
          
          &:focus-within {
            border-bottom: 2px solid ${props.theme.colors.primary};
          }
        `;
      default:
        return `
          border: 1px solid ${props.$hasError ? props.theme.colors.error : props.theme.colors.border};
          border-radius: 6px;
          background-color: ${props.theme.colors.surface};
          
          &:focus-within {
            border-color: ${props.theme.colors.primary};
            box-shadow: 0 0 0 3px ${props.theme.colors.primary}20;
          }
        `;
    }
  }}
  
  transition: all 0.2s ease;
`;

const StyledInput = styled.input<{ 
  $hasLeftIcon: boolean; 
  $hasRightIcon: boolean;
  $variant: InputProps['variant'];
}>`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  font-size: 1rem;
  
  ${props => {
    const leftPadding = props.$hasLeftIcon ? '2.5rem' : '0.75rem';
    const rightPadding = props.$hasRightIcon ? '2.5rem' : '0.75rem';
    
    switch (props.$variant) {
      case 'filled':
        return `
          padding: 1rem ${rightPadding} 0.5rem ${leftPadding};
        `;
      case 'underlined':
        return `
          padding: 0.5rem ${rightPadding} 0.5rem ${leftPadding};
        `;
      default:
        return `
          padding: 0.75rem ${rightPadding} 0.75rem ${leftPadding};
        `;
    }
  }}
  
  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const IconWrapper = styled.div<{ $position: 'left' | 'right' }>`
  position: absolute;
  ${props => props.$position}: 0.75rem;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text.muted};
  pointer-events: none;
  
  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const HelperText = styled.div<{ $isError: boolean }>`
  font-size: 0.75rem;
  margin-top: 0.25rem;
  color: ${props => props.$isError ? props.theme.colors.error : props.theme.colors.text.secondary};
`;

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  fullWidth = false,
  className,
  ...props
}) => {
  return (
    <InputContainer $fullWidth={fullWidth} className={className}>
      {label && <Label>{label}</Label>}
      
      <InputWrapper $hasError={!!error} $variant={variant}>
        {leftIcon && (
          <IconWrapper $position="left">
            {leftIcon}
          </IconWrapper>
        )}
        
        <StyledInput
          $hasLeftIcon={!!leftIcon}
          $hasRightIcon={!!rightIcon}
          $variant={variant}
          {...props}
        />
        
        {rightIcon && (
          <IconWrapper $position="right">
            {rightIcon}
          </IconWrapper>
        )}
      </InputWrapper>
      
      {(error || helperText) && (
        <HelperText $isError={!!error}>
          {error || helperText}
        </HelperText>
      )}
    </InputContainer>
  );
};

export default Input;
