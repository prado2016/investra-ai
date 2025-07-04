import React from 'react';
import styled from 'styled-components';
import { parseDatabaseDate } from '../utils/formatting';
import type { EnhancedTransaction } from '../services/analytics/dailyPLService';

const PanelContainer = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
`;

const PanelTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #b45309;
  margin: 0 0 1rem 0;
`;

const TransactionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #4b5563;
`;

interface OrphanTransactionsPanelProps {
  transactions: EnhancedTransaction[];
}

const OrphanTransactionsPanel: React.FC<OrphanTransactionsPanelProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <PanelContainer>
      <PanelTitle>Unmatched Sell Transactions</PanelTitle>
      <p>The following sell transactions could not be matched with a corresponding buy transaction. This may be due to incomplete transaction history or short selling. The realized P/L for these transactions has not been calculated.</p>
      <TransactionTable>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Symbol</Th>
            <Th>Quantity</Th>
            <Th>Price</Th>
            <Th>Total</Th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <Td>{parseDatabaseDate(t.transaction_date).toLocaleDateString()}</Td>
              <Td>{t.asset.symbol}</Td>
              <Td>{t.quantity}</Td>
              <Td>${t.price.toFixed(2)}</Td>
              <Td>${t.total_amount.toFixed(2)}</Td>
            </tr>
          ))}
        </tbody>
      </TransactionTable>
    </PanelContainer>
  );
};

export default OrphanTransactionsPanel;
