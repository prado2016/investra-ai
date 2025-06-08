import React from 'react';
import styled from 'styled-components';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
}

const StyledCard = styled.div<{
  $variant: CardProps['variant'];
  $padding: CardProps['padding'];
  $hoverable: boolean;
  $clickable: boolean;
}>`
  border-radius: 8px;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.$variant) {
      case 'outlined':
        return `
          background-color: ${props.theme.colors.surface};
          border: 1px solid ${props.theme.colors.border};
        `;
      case 'elevated':
        return `
          background-color: ${props.theme.colors.surface};
          box-shadow: 0 4px 6px ${props.theme.colors.shadow};
          border: 1px solid transparent;
        `;
      case 'filled':
        return `
          background-color: ${props.theme.colors.border};
          border: 1px solid transparent;
        `;
      default:
        return `
          background-color: ${props.theme.colors.surface};
          box-shadow: 0 2px 4px ${props.theme.colors.shadow};
          border: 1px solid ${props.theme.colors.border};
        `;
    }
  }}
  
  ${props => {
    switch (props.$padding) {
      case 'none':
        return 'padding: 0;';
      case 'sm':
        return 'padding: 0.75rem;';
      case 'lg':
        return 'padding: 2rem;';
      default:
        return 'padding: 1.5rem;';
    }
  }}
  
  ${props => props.$clickable && `
    cursor: pointer;
    user-select: none;
  `}
  
  ${props => (props.$hoverable || props.$clickable) && `
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px ${props.theme.colors.shadow};
    }
  `}
  
  ${props => props.$clickable && `
    &:active {
      transform: translateY(0);
    }
  `}
`;

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  ...props
}) => {
  return (
    <StyledCard
      $variant={variant}
      $padding={padding}
      $hoverable={hoverable}
      $clickable={clickable}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card;
