import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/test-utils';
import { PositionsTable } from '../components/PositionsTable';
import type { Position } from '../types/portfolio';

// Mock the hooks
vi.mock('../hooks/useYahooFinance', () => ({
  useQuotes: vi.fn(() => ({
    data: [],
    loading: false,
    refetch: vi.fn(),
    retryState: { isRetrying: false, currentAttempt: 0 }
  }))
}));

vi.mock('../hooks/useNotify', () => ({
  useNotify: vi.fn(() => ({
    success: vi.fn(),
    apiError: vi.fn()
  }))
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(() => ({
    isOnline: true
  }))
}));

describe('PositionsTable Component', () => {
  const mockPositions: Position[] = [
    {
      id: '1',
      assetSymbol: 'AAPL',
      assetType: 'stock',
      quantity: 100,
      averageCostBasis: 150.25,
      totalCostBasis: 15025,
      currentMarketValue: 16000,
      unrealizedPL: 975,
      unrealizedPLPercent: 6.49,
      currency: 'USD',
      lastUpdated: new Date('2024-01-15')
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should render positions table with data', () => {
    render(
      <PositionsTable 
        positions={mockPositions}
        loading={false}
      />
    );

    expect(screen.getByText('Open Positions')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // quantity
    expect(screen.getByText('$150.25')).toBeInTheDocument(); // avg cost
  });

  it('should show loading state', () => {
    render(
      <PositionsTable 
        positions={[]}
        loading={true}
      />
    );

    expect(screen.getByText('Loading positions...')).toBeInTheDocument();
  });

  it('should show empty state when no positions', () => {
    render(
      <PositionsTable 
        positions={[]}
        loading={false}
      />
    );

    expect(screen.getByText('No Positions Found')).toBeInTheDocument();
    expect(screen.getByText('You have no open positions. Start by adding some trades!')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    const mockRefresh = vi.fn();
    
    render(
      <PositionsTable 
        positions={mockPositions}
        loading={false}
        onRefresh={mockRefresh}
      />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should filter positions by search term', async () => {
    const multiplePositions = [
      ...mockPositions,
      {
        id: '2',
        assetSymbol: 'TSLA',
        assetType: 'stock' as const,
        quantity: 50,
        averageCostBasis: 800,
        totalCostBasis: 40000,
        currentMarketValue: 42000,
        unrealizedPL: 2000,
        unrealizedPLPercent: 5,
        currency: 'USD' as const,
        lastUpdated: new Date('2024-01-15')
      }
    ];

    render(
      <PositionsTable 
        positions={multiplePositions}
        loading={false}
      />
    );

    const filterInput = screen.getByPlaceholderText(/filter by symbol/i);
    fireEvent.change(filterInput, { target: { value: 'AAPL' } });

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument();
  });
});
