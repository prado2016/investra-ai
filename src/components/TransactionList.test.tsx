import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionList, { TransactionWithAsset } from './TransactionList';
import * as assetCategorization from '../utils/assetCategorization';

// Mock CompanyLogo component
vi.mock('./CompanyLogo', () => ({ default: () => <div data-testid="company-logo-mock">Logo</div> }));

// Spy on parseOptionSymbol
let parseOptionSymbolSpy: ReturnType<typeof vi.spyOn>;


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
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    // Create the spy anew or restore if already created
    if (parseOptionSymbolSpy) {
      parseOptionSymbolSpy.mockRestore();
    }
    parseOptionSymbolSpy = vi.spyOn(assetCategorization, 'parseOptionSymbol');
  });

  afterEach(() => {
    cleanup(); // Clean up DOM after each test
    if (parseOptionSymbolSpy) {
      parseOptionSymbolSpy.mockRestore(); // Ensure spy is restored after all tests in describe block
    }
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
    expect(parseOptionSymbolSpy).toHaveBeenCalledWith('SPY250117C00400000');

    // Check AssetTypeBadge for SPY option
    const symbolTextElementSPY = optionSymbolElementSPY.parentElement;
    expect(symbolTextElementSPY).not.toBeNull();
    if (symbolTextElementSPY) {
      const assetTypeBadgeOptionSPY = within(symbolTextElementSPY).getByText('option');
      expect(assetTypeBadgeOptionSPY).toBeInTheDocument();
      expect(assetTypeBadgeOptionSPY.tagName).toBe('SPAN');
    }


    // Verify option transaction (AAPL)
    const optionSymbolElementAAPL = screen.getByText('AAPL aapl231215p00150000');
    expect(optionSymbolElementAAPL).toBeInTheDocument();
    expect(parseOptionSymbolSpy).toHaveBeenCalledWith('AAPL231215P00150000');

    const symbolTextElementAAPL = optionSymbolElementAAPL.parentElement;
    expect(symbolTextElementAAPL).not.toBeNull();
    if (symbolTextElementAAPL) {
      const assetTypeBadgeOptionAAPL = within(symbolTextElementAAPL).getByText('option');
      expect(assetTypeBadgeOptionAAPL).toBeInTheDocument();
      expect(assetTypeBadgeOptionAAPL.tagName).toBe('SPAN');
    }

    // Verify stock transaction (MSFT)
    const stockSymbolElement = screen.getByText('MSFT');
    expect(stockSymbolElement).toBeInTheDocument();

    // Check AssetTypeBadge for MSFT stock
    const symbolTextElementMSFT = stockSymbolElement.parentElement;
    expect(symbolTextElementMSFT).not.toBeNull();
    if (symbolTextElementMSFT) {
      const assetTypeBadgeStock = within(symbolTextElementMSFT).getByText('stock');
      expect(assetTypeBadgeStock).toBeInTheDocument();
      expect(assetTypeBadgeStock.tagName).toBe('SPAN');
    }

    // Ensure parseOptionSymbolSpy was called for option assets and not for stock
    expect(parseOptionSymbolSpy).toHaveBeenCalledTimes(2); // Called for SPY and AAPL options
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
    const symbolTextElementCrypto = screen.getByText('BTC-USD').parentElement;
    expect(symbolTextElementCrypto).not.toBeNull();
    if (symbolTextElementCrypto) {
      const assetTypeBadgeCrypto = within(symbolTextElementCrypto).getByText('crypto');
      expect(assetTypeBadgeCrypto).toBeInTheDocument();
      expect(assetTypeBadgeCrypto.tagName).toBe('SPAN');
    }
    expect(parseOptionSymbolSpy).not.toHaveBeenCalledWith('BTC-USD');
  });

  it('displays original symbol if asset is option but parseOptionSymbol returns null', () => {
    parseOptionSymbolSpy.mockReturnValueOnce(null); // Force parsing to fail for one option
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
    expect(parseOptionSymbolSpy).toHaveBeenCalledWith('INVALIDOPT');
  });

});
