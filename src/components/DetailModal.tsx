import React from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  &:hover {
    color: #334155;
  }
`;

interface DetailModalProps {
  metric: string;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ metric, onClose }) => {
  // This is where you'd fetch or display detailed data based on the 'metric' prop
  // For now, it's just a placeholder.
  const getModalTitle = (metricKey: string) => {
    switch (metricKey) {
      case 'totalDailyPL': return 'Total Daily Profit & Loss Details';
      case 'totalReturn': return 'Total Return Details';
      case 'realizedPL': return 'Realized Profit & Loss Details';
      case 'unrealizedPL': return 'Unrealized Profit & Loss Details';
      case 'dividendIncome': return 'Dividend Income Details';
      case 'tradingFees': return 'Trading Fees Details';
      case 'tradeVolume': return 'Trade Volume Details';
      case 'netCashFlow': return 'Net Cash Flow Details';
      case 'netDeposits': return 'Net Deposits Details';
      case 'timeWeightedReturnRate': return 'Time-Weighted Return Rate Details';
      default: return 'Metric Details';
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{getModalTitle(metric)}</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </ModalHeader>
        <div>
          <p>Details for {metric} will be displayed here.</p>
          <p>This could include charts, tables, and historical data.</p>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DetailModal;
