import React from 'react';
import styled from 'styled-components';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  outline?: boolean;
  dot?: boolean;
}

const StyledBadge = styled.span<{
  $variant: BadgeProps['variant'];
  $size: BadgeProps['size'];
  $outline: boolean;
  $dot: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: ${props => props.$dot ? '50%' : '9999px'};
  white-space: nowrap;
  user-select: none;
  
  ${props => {
    if (props.$dot) {
      return `
        width: 8px;
        height: 8px;
        min-width: 8px;
        min-height: 8px;
      `;
    }
    
    switch (props.$size) {
      case 'sm':
        return `
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          line-height: 1rem;
          min-height: 1.25rem;
        `;
      case 'lg':
        return `
          padding: 0.375rem 0.75rem;
          font-size: 1rem;
          line-height: 1.25rem;
          min-height: 2rem;
        `;
      default:
        return `
          padding: 0.25rem 0.625rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          min-height: 1.5rem;
        `;
    }
  }}
  
  ${props => {
    const theme = props.theme;
    let bgColor, textColor, borderColor;
    
    switch (props.$variant) {
      case 'primary':
        bgColor = theme.colors.primary;
        textColor = 'white';
        borderColor = theme.colors.primary;
        break;
      case 'success':
        bgColor = theme.colors.success;
        textColor = 'white';
        borderColor = theme.colors.success;
        break;
      case 'warning':
        bgColor = theme.colors.warning;
        textColor = 'white';
        borderColor = theme.colors.warning;
        break;
      case 'error':
        bgColor = theme.colors.error;
        textColor = 'white';
        borderColor = theme.colors.error;
        break;
      case 'info':
        bgColor = theme.colors.info;
        textColor = 'white';
        borderColor = theme.colors.info;
        break;
      default:
        bgColor = theme.colors.border;
        textColor = theme.colors.text.primary;
        borderColor = theme.colors.border;
        break;
    }
    
    if (props.$outline) {
      return `
        background-color: transparent;
        color: ${bgColor};
        border: 1px solid ${borderColor};
      `;
    }
    
    return `
      background-color: ${bgColor};
      color: ${textColor};
      border: 1px solid transparent;
    `;
  }}
`;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  outline = false,
  dot = false,
  ...props
}) => {
  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      $outline={outline}
      $dot={dot}
      {...props}
    >
      {!dot && children}
    </StyledBadge>
  );
};

export default Badge;
