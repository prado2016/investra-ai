                    import React from 'react';
import { Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatting';
import type { FundMovement } from '../types/portfolio';

// Use FundMovement directly since no additional metadata is needed currently
// If additional fields are needed in the future, uncomment and extend:
// export interface FundMovementWithMetadata extends FundMovement {
//   additionalField?: string;
// }
export type FundMovementWithMetadata = FundMovement;

interface FundMovementListProps {
  fundMovements: FundMovementWithMetadata[];
  loading?: boolean;
  error?: string | null;
  onEdit?: (movement: FundMovementWithMetadata) => void;
  onDelete?: (movementId: string) => void;
}

const FundMovementList: React.FC<FundMovementListProps> = ({
  fundMovements,
  loading = false,
  error,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <RefreshCw className="loading-icon" size={20} />
          <span>Loading fund movements...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading fund movements: {error}</p>
      </div>
    );
  }

  if (fundMovements.length === 0) {
    return (
      <div className="empty-container">
        <p>No fund movements found</p>
      </div>
    );
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="movement-type-icon deposit" size={16} />;
      case 'withdraw':
        return <ArrowUpCircle className="movement-type-icon withdraw" size={16} />;
      case 'transfer':
        return <ArrowLeftRight className="movement-type-icon transfer" size={16} />;
      case 'conversion':
        return <RefreshCw className="movement-type-icon conversion" size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="fund-movement-list">
      <div className="fund-movement-container">
        <div className="fund-movement-grid transaction-header-grid">
          <div>Type</div>
          <div>Account</div>
          <div>Status</div>
          <div>Date</div>
          <div>Amount</div>
          <div>Actions</div>
        </div>

        <div className="fund-movement-items">
          {fundMovements.map((movement) => (
            <div key={movement.id} className="fund-movement-row transaction-grid">
              <div className="transaction-type-cell">
                <div className="movement-type">
                  {getMovementIcon(movement.type)}
                  <span className="movement-type-text">{movement.type}</span>
                </div>
              </div>

              <div className="account-cell">
                <div className="account-info">
                  {movement.type === 'conversion' && movement.account && (
                    <div>{movement.account}</div>
                  )}
                  {movement.type === 'transfer' && (
                    <div>
                      {movement.fromAccount} → {movement.toAccount}
                    </div>
                  )}
                  {movement.type === 'withdraw' && movement.fromAccount && (
                    <div>From: {movement.fromAccount}</div>
                  )}
                  {movement.type === 'deposit' && movement.toAccount && (
                    <div>To: {movement.toAccount}</div>
                  )}
                </div>
              </div>

              <div className="status-cell">
                <span className={`status-badge ${movement.status}`}>
                  {movement.status}
                </span>
              </div>

              <div className="date-cell">
                {formatDate(movement.date)}
              </div>

              <div className="amount-cell">
                {movement.type === 'conversion' ? (
                  <div className="conversion-amounts">
                    <div className="original-amount">
                      {formatCurrency(movement.originalAmount || 0, movement.originalCurrency || 'USD')}
                    </div>
                    <div className="converted-amount">
                      {formatCurrency(movement.convertedAmount || 0, movement.convertedCurrency || 'USD')}
                    </div>
                    {movement.exchangeRate && (
                      <div className="exchange-rate">
                        Rate: {movement.exchangeRate.toFixed(6)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`transaction-amount ${movement.type === 'withdraw' ? 'negative' : 'positive'}`}>
                    {formatCurrency(movement.amount, movement.currency)}
                  </div>
                )}
                {movement.fees && movement.fees > 0 && (
                  <div className="fees-info">
                    Fees: {formatCurrency(movement.fees, movement.currency)}
                  </div>
                )}
              </div>

              <div className="actions-cell">
                <div className="transaction-actions">
                  {onEdit && (
                    <button
                      className="action-btn edit-btn"
                      onClick={() => onEdit(movement)}
                      title="Edit fund movement"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="action-btn delete-btn"
                      onClick={() => onDelete(movement.id)}
                      title="Delete fund movement"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {movement.notes && (
                <div className="transaction-notes">
                  <span className="notes-label">Notes:</span>
                  <span className="notes-text">{movement.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FundMovementList;
