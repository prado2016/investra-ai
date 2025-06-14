import React from 'react';
import styled from 'styled-components';
import { PositionsTable } from '../components/PositionsTable';
import { useSupabasePositions } from '../hooks/useSupabasePositions';
import { usePageTitle } from '../hooks/usePageTitle';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
`;

const PositionsPage: React.FC = () => {
  const { positions, loading, error, refreshPositions, recalculatePositions } = useSupabasePositions();
  
  // Set page title
  usePageTitle('Positions', { subtitle: 'Open Holdings' });

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Open Positions</PageTitle>
        <PageSubtitle>
          Track your current holdings and real-time performance
        </PageSubtitle>
      </PageHeader>
      
      <PositionsTable
        positions={positions}
        loading={loading}
        error={error || undefined}
        onRefresh={refreshPositions}
        onRecalculate={recalculatePositions}
      />
    </PageContainer>
  );
};

export default PositionsPage;
