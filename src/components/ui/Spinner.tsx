import React from 'react';
import styled, { keyframes, css } from 'styled-components';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const StyledSpinner = styled.div<{
  $size: SpinnerProps['size'];
  $color?: string;
}>`
  border-radius: 50%;
  border: 2px solid transparent;
  border-top: 2px solid;
  border-color: ${props => props.$color || props.theme.colors.primary} transparent transparent transparent;
  ${css`animation: ${spin} 1s linear infinite;`}
  
  ${props => {
    switch (props.$size) {
      case 'sm':
        return `
          width: 1rem;
          height: 1rem;
        `;
      case 'lg':
        return `
          width: 3rem;
          height: 3rem;
          border-width: 3px;
        `;
      default:
        return `
          width: 1.5rem;
          height: 1.5rem;
        `;
    }
  }}
`;

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  className
}) => {
  return (
    <StyledSpinner
      $size={size}
      $color={color}
      className={className}
    />
  );
};

export default Spinner;
