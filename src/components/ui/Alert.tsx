import React from 'react';
import styled from 'styled-components';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
  closable?: boolean;
  icon?: React.ReactNode;
  showIcon?: boolean;
}

const AlertContainer = styled.div<{ $variant: AlertProps['variant'] }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid;
  
  ${props => {
    const theme = props.theme;
    switch (props.$variant) {
      case 'success':
        return `
          background-color: #f0fdf4;
          border-color: #22c55e;
          color: #166534;
        `;
      case 'warning':
        return `
          background-color: #fffbeb;
          border-color: #f59e0b;
          color: #92400e;
        `;
      case 'error':
        return `
          background-color: #fef2f2;
          border-color: #ef4444;
          color: #b91c1c;
        `;
      default:
        return `
          background-color: #eff6ff;
          border-color: #3b82f6;
          color: #1e40af;
        `;
    }
  }}
`;

const IconWrapper = styled.div`
  flex-shrink: 0;
  margin-top: 0.125rem;
  
  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`;

const Message = styled.div`
  font-size: 0.875rem;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  margin: -0.25rem -0.25rem -0.25rem 0;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const getDefaultIcon = (variant: AlertProps['variant']) => {
  switch (variant) {
    case 'success':
      return <CheckCircle />;
    case 'warning':
      return <AlertCircle />;
    case 'error':
      return <XCircle />;
    default:
      return <Info />;
  }
};

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  onClose,
  closable = false,
  icon,
  showIcon = true,
  ...props
}) => {
  return (
    <AlertContainer $variant={variant} {...props}>
      {showIcon && (
        <IconWrapper>
          {icon || getDefaultIcon(variant)}
        </IconWrapper>
      )}
      
      <Content>
        {title && <Title>{title}</Title>}
        <Message>{children}</Message>
      </Content>
      
      {(closable || onClose) && (
        <CloseButton onClick={onClose}>
          <X />
        </CloseButton>
      )}
    </AlertContainer>
  );
};

export default Alert;
