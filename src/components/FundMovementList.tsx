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

      <style jsx>{`
        .fund-movement-grid {
          grid-template-columns: 1fr 2fr 1fr 1fr 1.5fr 100px;
          gap: var(--space-4);
          align-items: center;
        }

        .fund-movement-row {
          border-left: 4px solid var(--color-primary-200);
        }

        .fund-movement-row:hover {
          border-left-color: var(--color-primary-500);
        }

        .movement-type-icon {
          margin-right: var(--space-2);
        }

        .movement-type-icon.deposit {
          color: var(--color-success-600);
        }

        .movement-type-icon.withdraw {
          color: var(--color-error-600);
        }

        .movement-type-icon.transfer {
          color: var(--color-primary-600);
        }

        .movement-type-icon.conversion {
          color: var(--color-warning-600);
        }

        .movement-type-text {
          font-weight: 500;
          text-transform: capitalize;
        }

        .account-info {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.3;
          max-width: 200px;
          word-wrap: break-word;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.completed {
          background-color: var(--color-success-100);
          color: var(--color-success-800);
        }

        .status-badge.pending {
          background-color: var(--color-warning-100);
          color: var(--color-warning-800);
        }

        .status-badge.failed {
          background-color: var(--color-error-100);
          color: var(--color-error-800);
        }

        .status-badge.cancelled {
          background-color: var(--color-neutral-100);
          color: var(--color-neutral-800);
        }

        .conversion-amounts {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .original-amount {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .converted-amount {
          font-weight: 600;
          color: var(--color-primary-700);
        }

        .exchange-rate {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }

        .fees-info {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin-top: 2px;
        }

        .transaction-amount.negative {
          color: var(--color-error-600);
        }

        .transaction-amount.positive {
          color: var(--color-success-600);
        }

        @media (max-width: 768px) {
          .fund-movement-grid {
            grid-template-columns: 1fr;
            gap: var(--space-2);
          }

          .fund-movement-row {
            padding: var(--space-4);
          }

          .transaction-header-grid {
            display: none;
          }

          .transaction-grid > div {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-2) 0;
            border-bottom: 1px solid var(--color-border);
          }

          .transaction-grid > div:before {
            content: attr(data-label);
            font-weight: 600;
            color: var(--color-text-secondary);
            font-size: 0.875rem;
          }

          .transaction-type-cell:before {
            content: "Type";
          }

          .account-cell:before {
            content: "Account";
          }

          .status-cell:before {
            content: "Status";
          }

          .date-cell:before {
            content: "Date";
          }

          .amount-cell:before {
            content: "Amount";
          }

          .actions-cell:before {
            content: "Actions";
          }
        }
      `}</style>
    </div>
  );
};

export default FundMovementList;
