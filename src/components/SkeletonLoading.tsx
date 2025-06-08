import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const SkeletonBase = styled.div<{ $width?: string; $height?: string; $radius?: string }>`
  background: linear-gradient(
    90deg,
    ${props => props.theme?.colors?.border || '#e5e7eb'} 25%,
    ${props => props.theme?.colors?.surface || '#f9fafb'} 50%,
    ${props => props.theme?.colors?.border || '#e5e7eb'} 75%
  );
  background-size: 200% 100%;
  ${css`animation: ${shimmer} 1.5s infinite;`}
  border-radius: ${props => props.$radius || '4px'};
  height: ${props => props.$height || '1rem'};
  width: ${props => props.$width || '100%'};
`;

// Table skeleton
const TableSkeletonContainer = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const TableHeader = styled.div`
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const TableBody = styled.div`
  padding: 0;
`;

const TableRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  gap: 1rem;
  border-bottom: 1px solid #f3f4f6;
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div<{ flex?: number }>`
  flex: ${props => props.flex || 1};
`;

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 6,
  hasHeader = true
}) => {
  return (
    <TableSkeletonContainer>
      {hasHeader && (
        <TableHeader>
          <SkeletonBase $width="200px" $height="1.25rem" />
        </TableHeader>
      )}
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex} flex={colIndex === 0 ? 2 : 1}>
                <SkeletonBase 
                  $width={colIndex === 0 ? '80%' : colIndex === columns - 1 ? '60%' : '90%'}
                  $height="0.875rem"
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </TableSkeletonContainer>
  );
};

// Card skeleton
const CardContainer = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

interface CardSkeletonProps {
  hasHeader?: boolean;
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  hasHeader = true,
  lines = 3
}) => {
  return (
    <CardContainer>
      {hasHeader && (
        <CardHeader>
          <SkeletonBase $width="150px" $height="1.25rem" />
          <SkeletonBase $width="80px" $height="1rem" />
        </CardHeader>
      )}
      <CardContent>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBase
            key={index}
            $width={index === lines - 1 ? '60%' : index === 0 ? '90%' : '75%'}
            $height="1rem"
          />
        ))}
      </CardContent>
    </CardContainer>
  );
};

// Chart skeleton
const ChartContainer = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
`;

const ChartArea = styled.div`
  height: 250px;
  display: flex;
  align-items: end;
  gap: 0.5rem;
  padding: 1rem 0;
`;

const ChartBar = styled(SkeletonBase)<{ $barHeight: string }>`
  height: ${props => props.$barHeight};
  width: 100%;
  flex: 1;
`;

export const ChartSkeleton: React.FC = () => {
  const barHeights = ['60%', '80%', '40%', '90%', '70%', '50%', '85%', '65%'];
  
  return (
    <ChartContainer>
      <ChartHeader>
        <SkeletonBase $width="180px" $height="1.25rem" />
        <SkeletonBase $width="100px" $height="1rem" />
      </ChartHeader>
      <ChartArea>
        {barHeights.map((height, index) => (
          <ChartBar key={index} $barHeight={height} />
        ))}
      </ChartArea>
    </ChartContainer>
  );
};

// Form skeleton
const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

interface FormSkeletonProps {
  fields?: number;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ fields = 6 }) => {
  return (
    <FormContainer>
      {Array.from({ length: fields }).map((_, index) => (
        <FormGroup key={index}>
          <SkeletonBase $width="120px" $height="0.875rem" />
          <SkeletonBase $width="100%" $height="2.5rem" $radius="6px" />
        </FormGroup>
      ))}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
        <SkeletonBase $width="150px" $height="2.5rem" $radius="6px" />
        <SkeletonBase $width="100px" $height="2.5rem" $radius="6px" />
      </div>
    </FormContainer>
  );
};

export { SkeletonBase };
