/**
 * SummaryBoxes Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SummaryBoxes } from './SummaryBoxes';

// Mock the hooks
jest.mock('../hooks/useSupabasePortfolios', () => ({
  useSupabasePortfolios: () => ({
    portfolios: [
      { id: 'portfolio-1', name: 'Main Portfolio', is_default: true },
      { id: 'portfolio-2', name: 'Trading Portfolio', is_default: false }
    ],
    activePortfolio: { id: 'portfolio-1', name: 'Main Portfolio', is_default: true },
    setActivePortfolio: jest.fn(),
    loading: false,
    error: null
  })
}));

jest.mock('../hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: () => ({
    metrics: {
      totalValue: 150000,
      totalPL: 15000,
      totalPLPercent: 11.25,
      dailyPL: 2500,
      dailyPLPercent: 1.69,
      positions: 12
    },
    isLoading: false,
    error: null
  })
}));

describe('SummaryBoxes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SummaryBoxes />);
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
  });

  it('displays portfolio metrics correctly', () => {
    render(<SummaryBoxes />);
    
    expect(screen.getByText('$150,000.00')).toBeInTheDocument();
    expect(screen.getByText('$15,000.00')).toBeInTheDocument();
    expect(screen.getByText('+11.25%')).toBeInTheDocument();
  });

  it('displays daily P&L correctly', () => {
    render(<SummaryBoxes />);
    
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('+1.69%')).toBeInTheDocument();
  });

  it('displays positions count', () => {
    render(<SummaryBoxes />);
    
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Active Positions')).toBeInTheDocument();
  });
});
