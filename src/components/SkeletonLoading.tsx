import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { background-color: #e0e0e0; }
  50% { background-color: #f0f0f0; }
  100% { background-color: #e0e0e0; }
`;

const SkeletonCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  height: 180px; /* Approximate height of a summary box */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const SkeletonLine = styled.div<{ width: string; height: string; margin?: string }>`
  background-color: #e0e0e0;
  width: ${props => props.width};
  height: ${props => props.height};
  border-radius: 4px;
  animation: ${pulse} 1.5s infinite ease-in-out;
  margin: ${props => props.margin || '0'};
`;

const SkeletonSummaryBox: React.FC = () => (
  <SkeletonCard>
    <div>
      <SkeletonLine width="60%" height="20px" margin="0 0 10px 0" />
      <SkeletonLine width="80%" height="30px" />
    </div>
    <SkeletonLine width="40%" height="15px" />
  </SkeletonCard>
);

interface SkeletonGridProps {
  count: number;
}

export const SkeletonSummaryGrid: React.FC<SkeletonGridProps> = ({ count }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  }}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonSummaryBox key={index} />
    ))}
  </div>
);

export default SkeletonSummaryBox;