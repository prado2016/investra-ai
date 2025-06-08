import React from 'react';
import styled from 'styled-components';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const StyledButton = styled.button<{
  $variant: ButtonProps['variant'];
  $size: ButtonProps['size'];
  $isLoading: boolean;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  user-select: none;
  
  ${props => props.$fullWidth && 'width: 100%;'}
  
  /* Size variants */
  ${props => {
    switch (props.$size) {
      case 'sm':
        return `
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
        `;
      case 'lg':
        return `
          padding: 0.75rem 1.5rem;
          font-size: 1.125rem;
          line-height: 1.75rem;
        `;
      default:
        return `
          padding: 0.5rem 1rem;
          font-size: 1rem;
          line-height: 1.5rem;
        `;
    }
  }}
  
  /* Color variants */
  ${props => {
    const theme = props.theme;
    switch (props.$variant) {
      case 'primary':
        return `
          background-color: ${theme.colors.primary};
          color: white;
          border-color: ${theme.colors.primary};
          
          &:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px ${theme.colors.shadow};
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      case 'secondary':
        return `
          background-color: ${theme.colors.secondary};
          color: white;
          border-color: ${theme.colors.secondary};
          
          &:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px ${theme.colors.shadow};
          }
        `;
      case 'outline':
        return `
          background-color: transparent;
          color: ${theme.colors.primary};
          border-color: ${theme.colors.primary};
          
          &:hover:not(:disabled) {
            background-color: ${theme.colors.primary};
            color: white;
            transform: translateY(-1px);
          }
        `;
      case 'ghost':
        return `
          background-color: transparent;
          color: ${theme.colors.text.primary};
          border-color: transparent;
          
          &:hover:not(:disabled) {
            background-color: ${theme.colors.border};
            transform: translateY(-1px);
          }
        `;
      case 'danger':
        return `
          background-color: ${theme.colors.error};
          color: white;
          border-color: ${theme.colors.error};
          
          &:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px ${theme.colors.shadow};
          }
        `;
      case 'success':
        return `
          background-color: ${theme.colors.success};
          color: white;
          border-color: ${theme.colors.success};
          
          &:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px ${theme.colors.shadow};
          }
        `;
      default:
        return `
          background-color: ${theme.colors.surface};
          color: ${theme.colors.text.primary};
          border-color: ${theme.colors.border};
          
          &:hover:not(:disabled) {
            border-color: ${theme.colors.primary};
            transform: translateY(-1px);
            box-shadow: 0 2px 4px ${theme.colors.shadow};
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
  
  ${props => props.$isLoading && `
    pointer-events: none;
    
    &:after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}
`;

const IconWrapper = styled.span<{ $isLoading: boolean }>`
  display: inline-flex;
  align-items: center;
  opacity: ${props => props.$isLoading ? 0 : 1};
  transition: opacity 0.2s ease;
`;

const ContentWrapper = styled.span<{ $isLoading: boolean }>`
  opacity: ${props => props.$isLoading ? 0 : 1};
  transition: opacity 0.2s ease;
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $isLoading={isLoading}
      $fullWidth={fullWidth}
      disabled={disabled || isLoading}
      {...props}
    >
      {leftIcon && (
        <IconWrapper $isLoading={isLoading}>
          {leftIcon}
        </IconWrapper>
      )}
      
      <ContentWrapper $isLoading={isLoading}>
        {children}
      </ContentWrapper>
      
      {rightIcon && (
        <IconWrapper $isLoading={isLoading}>
          {rightIcon}
        </IconWrapper>
      )}
    </StyledButton>
  );
};

export default Button;
