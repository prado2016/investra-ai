import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionList, { TransactionWithAsset } from './TransactionList';
import { parseOptionSymbol } from '../utils/assetCategorization';

// Mock CompanyLogo component
jest.mock('./CompanyLogo', () => () => <div data-testid="company-logo-mock">Logo</div>);

// Mock parseOptionSymbol from the actual implementation path
// We will spy on this to ensure it's called for options
jest.mock('../utils/assetCategorization', () => ({
  ...jest.requireActual('../utils/assetCategorization'), // Import and retain default behavior
  parseOptionSymbol: jest.fn(jest.requireActual('../utils/assetCategorization').parseOptionSymbol),
}));


const mockTransactions: TransactionWithAsset[] = [
  {
    id: '1',
    user_id: 'user1',
    portfolio_id: 'portfolio1',
    asset_id: 'asset1',
    transaction_type: 'buy',
    quantity: 10,
    price: 100,
    total_amount: 1000,
    transaction_date: '2024-01-15T10:00:00Z',
    currency: 'USD',
    notes: 'Bought SPY option',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    asset: {
      id: 'asset1',
      symbol: 'SPY250117C00400000',
      name: 'SPY Option Jan 2025 Call $400',
      asset_type: 'option',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      user_id: 'user1',
    },
  },
  {
    id: '2',
    user_id: 'user1',
    portfolio_id: 'portfolio1',
    asset_id: 'asset2',
    transaction_type: 'buy',
    quantity: 5,
    price: 250,
    total_amount: 1250,
    transaction_date: '2024-02-20T11:00:00Z',
    currency: 'USD',
    notes: 'Bought MSFT stock',
    created_at: '2024-02-20T11:00:00Z',
    updated_at: '2024-02-20T11:00:00Z',
    asset: {
      id: 'asset2',
      symbol: 'MSFT',
      name: 'Microsoft Corp',
      asset_type: 'stock',
      exchange: 'NASDAQ',
      created_at: '2024-02-20T11:00:00Z',
      updated_at: '2024-02-20T11:00:00Z',
      user_id: 'user1',
    },
  },
  {
    id: '3', // Test with a different option format
    user_id: 'user1',
    portfolio_id: 'portfolio1',
    asset_id: 'asset3',
    transaction_type: 'sell',
    quantity: 1,
    price: 50.5,
    total_amount: 50.5,
    transaction_date: '2024-03-10T14:30:00Z',
    currency: 'USD',
    notes: 'Sold AAPL option',
    created_at: '2024-03-10T14:30:00Z',
    updated_at: '2024-03-10T14:30:00Z',
    asset: {
      id: 'asset3',
      symbol: 'AAPL231215P00150000',
      name: 'AAPL Option Dec 2023 Put $150',
      asset_type: 'option',
      created_at: '2024-03-10T14:30:00Z',
      updated_at: '2024-03-10T14:30:00Z',
      user_id: 'user1',
    },
  },
];

describe('TransactionList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    (parseOptionSymbol as jest.Mock).mockClear();
  });

  it('renders transactions and displays option and stock symbols correctly', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Verify option transaction (SPY)
    // Expected format: "UNDERLYING originalSymbolInLowercase"
    const optionSymbolElementSPY = screen.getByText('SPY spy250117c00400000');
    expect(optionSymbolElementSPY).toBeInTheDocument();
    expect(parseOptionSymbol).toHaveBeenCalledWith('SPY250117C00400000');

    // Check AssetTypeBadge for SPY option
    const optionRowSPY = optionSymbolElementSPY.closest('div[class*="TableRow"]'); // Find parent TableRow
    expect(optionRowSPY).not.toBeNull();
    if (optionRowSPY) {
      const assetTypeBadgeOptionSPY = optionRowSPY.querySelector('span[class*="AssetTypeBadge"]');
      expect(assetTypeBadgeOptionSPY).toHaveTextContent('option');
    }


    // Verify option transaction (AAPL)
    const optionSymbolElementAAPL = screen.getByText('AAPL aapl231215p00150000');
    expect(optionSymbolElementAAPL).toBeInTheDocument();
    expect(parseOptionSymbol).toHaveBeenCalledWith('AAPL231215P00150000');

    const optionRowAAPL = optionSymbolElementAAPL.closest('div[class*="TableRow"]');
     expect(optionRowAAPL).not.toBeNull();
    if (optionRowAAPL) {
      const assetTypeBadgeOptionAAPL = optionRowAAPL.querySelector('span[class*="AssetTypeBadge"]');
      expect(assetTypeBadgeOptionAAPL).toHaveTextContent('option');
    }

    // Verify stock transaction (MSFT)
    const stockSymbolElement = screen.getByText('MSFT');
    expect(stockSymbolElement).toBeInTheDocument();

    // Check AssetTypeBadge for MSFT stock
    const stockRow = stockSymbolElement.closest('div[class*="TableRow"]');
    expect(stockRow).not.toBeNull();
    if (stockRow) {
      const assetTypeBadgeStock = stockRow.querySelector('span[class*="AssetTypeBadge"]');
      expect(assetTypeBadgeStock).toHaveTextContent('stock');
    }

    // Ensure parseOptionSymbol was called for option assets and not for stock
    expect(parseOptionSymbol).toHaveBeenCalledTimes(2); // Called for SPY and AAPL options
  });

  it('displays "N/A" for missing asset symbol', () => {
    const transactionWithoutAssetSymbol: TransactionWithAsset[] = [
      {
        ...mockTransactions[0],
        asset: {
          ...mockTransactions[0].asset,
          symbol: '', // Empty symbol
        },
      },
    ];
    render(
      <TransactionList
        transactions={transactionWithoutAssetSymbol}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays original symbol if asset type is not "option"', () => {
    const cryptoTransaction: TransactionWithAsset[] = [
      {
        ...mockTransactions[0],
        asset: {
          ...mockTransactions[0].asset,
          asset_type: 'crypto',
          symbol: 'BTC-USD',
          name: 'Bitcoin USD'
        },
      },
    ];
    render(
      <TransactionList
        transactions={cryptoTransaction}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('BTC-USD')).toBeInTheDocument();
    const cryptoRow = screen.getByText('BTC-USD').closest('div[class*="TableRow"]');
    expect(cryptoRow).not.toBeNull();
    if (cryptoRow) {
      const assetTypeBadgeCrypto = cryptoRow.querySelector('span[class*="AssetTypeBadge"]');
      expect(assetTypeBadgeCrypto).toHaveTextContent('crypto');
    }
    expect(parseOptionSymbol).not.toHaveBeenCalledWith('BTC-USD');
  });

  it('displays original symbol if asset is option but parseOptionSymbol returns null', () => {
    (parseOptionSymbol as jest.Mock).mockReturnValueOnce(null); // Force parsing to fail for one option
    const optionWithFailedParsing: TransactionWithAsset[] = [
      {
        ...mockTransactions[0], // This is an option
        asset: {
            ...mockTransactions[0].asset,
            symbol: "INVALIDOPT" // Use a symbol that would normally be parsed but we mock the failure
        }
      },
    ];
    render(
      <TransactionList
        transactions={optionWithFailedParsing}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // Expect the original (albeit invalid for parsing here) symbol to be displayed
    expect(screen.getByText('INVALIDOPT')).toBeInTheDocument();
    expect(parseOptionSymbol).toHaveBeenCalledWith('INVALIDOPT');
  });

});
