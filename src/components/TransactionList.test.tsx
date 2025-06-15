import React from 'react';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TransactionList, { TransactionWithAsset } from './TransactionList';
import * as assetCategorization from '../utils/assetCategorization';

// Mock CompanyLogo component
vi.mock('./CompanyLogo', () => ({ default: () => <div data-testid="company-logo-mock">Logo</div> }));

// Spy on parseOptionSymbol
let parseOptionSymbolSpy: any;


const mockTransactions: TransactionWithAsset[] = [
  {
    id: '1',
    portfolio_id: 'portfolio1',
    position_id: null,
    asset_id: 'asset1',
    transaction_type: 'buy',
    quantity: 10,
    price: 100,
    total_amount: 1000,
    fees: 0,
    transaction_date: '2024-01-15',
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Bought SPY option',
    external_id: null,
    broker_name: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    asset: {
      id: 'asset1',
      symbol: 'SPY250117C00400000',
      name: 'SPY Option Jan 2025 Call $400',
      asset_type: 'option',
      exchange: null,
      currency: 'USD',
      sector: null,
      industry: null,
      market_cap: null,
      shares_outstanding: null,
      last_updated: '2024-01-15T10:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
    },
  },
  {
    id: '2',
    portfolio_id: 'portfolio1',
    position_id: null,
    asset_id: 'asset2',
    transaction_type: 'buy',
    quantity: 5,
    price: 250,
    total_amount: 1250,
    fees: 0,
    transaction_date: '2024-02-20',
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Bought MSFT stock',
    external_id: null,
    broker_name: null,
    created_at: '2024-02-20T11:00:00Z',
    updated_at: '2024-02-20T11:00:00Z',
    asset: {
      id: 'asset2',
      symbol: 'MSFT',
      name: 'Microsoft Corp',
      asset_type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Software',
      market_cap: null,
      shares_outstanding: null,
      last_updated: '2024-02-20T11:00:00Z',
      created_at: '2024-02-20T11:00:00Z',
    },
  },
  {
    id: '3',
    portfolio_id: 'portfolio1',
    position_id: null,
    asset_id: 'asset3',
    transaction_type: 'sell',
    quantity: 1,
    price: 50.5,
    total_amount: 50.5,
    fees: 0,
    transaction_date: '2024-03-10',
    settlement_date: null,
    exchange_rate: 1,
    currency: 'USD',
    notes: 'Sold AAPL option',
    external_id: null,
    broker_name: null,
    created_at: '2024-03-10T14:30:00Z',
    updated_at: '2024-03-10T14:30:00Z',
    asset: {
      id: 'asset3',
      symbol: 'AAPL231215P00150000',
      name: 'AAPL Option Dec 2023 Put $150',
      asset_type: 'option',
      exchange: null,
      currency: 'USD',
      sector: null,
      industry: null,
      market_cap: null,
      shares_outstanding: null,
      last_updated: '2024-03-10T14:30:00Z',
      created_at: '2024-03-10T14:30:00Z',
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

    // Verify option transaction (SPY) - symbol and option details are rendered separately
    const spySymbolElement = screen.getByText('SPY');
    expect(spySymbolElement).toBeInTheDocument();
    
    const spyOptionDetails = screen.getByText('Jan 17 $400 CALL');
    expect(spyOptionDetails).toBeInTheDocument();

    // Check AssetTypeBadge for SPY option - find option badge
    const spyOptionBadge = screen.getAllByText('option').find(badge => 
      badge.closest('.sc-dTdQuR')?.textContent?.includes('SPY')
    );
    expect(spyOptionBadge).toBeInTheDocument();
    expect(spyOptionBadge?.tagName).toBe('SPAN');

    // Verify option transaction (AAPL) - symbol and option details are rendered separately
    const aaplSymbolElement = screen.getByText('AAPL');
    expect(aaplSymbolElement).toBeInTheDocument();
    
    const aaplOptionDetails = screen.getByText('Dec 15 $150 PUT');
    expect(aaplOptionDetails).toBeInTheDocument();

    // Check AssetTypeBadge for AAPL option - find option badge
    const aaplOptionBadge = screen.getAllByText('option').find(badge => 
      badge.closest('.sc-dTdQuR')?.textContent?.includes('AAPL')
    );
    expect(aaplOptionBadge).toBeInTheDocument();
    expect(aaplOptionBadge?.tagName).toBe('SPAN');

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

    // Ensure parseOptionSymbolSpy was called for option assets with correct symbols
    expect(parseOptionSymbolSpy).toHaveBeenCalledWith('SPY250117C00400000');
    expect(parseOptionSymbolSpy).toHaveBeenCalledWith('AAPL231215P00150000');
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

  it('filters transactions by symbol correctly', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        loading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Initially all transactions should be visible
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    // Find the symbol filter input
    const symbolFilterInput = screen.getByPlaceholderText('Filter by Symbol...');
    expect(symbolFilterInput).toBeInTheDocument();

    // Filter by 'MSFT' - should only show MSFT transaction
    fireEvent.change(symbolFilterInput, { target: { value: 'MSFT' } });
    
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.queryByText('SPY')).not.toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

    // Filter by 'spy' (case insensitive) - should only show SPY transaction
    fireEvent.change(symbolFilterInput, { target: { value: 'spy' } });
    
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

    // Clear filter - should show all transactions again
    fireEvent.change(symbolFilterInput, { target: { value: '' } });
    
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    // Filter by partial match 'A' - should show AAPL
    fireEvent.change(symbolFilterInput, { target: { value: 'A' } });
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('SPY')).not.toBeInTheDocument();
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
  });

});
