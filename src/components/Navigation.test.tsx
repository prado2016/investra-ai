import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import Navigation from '../components/Navigation';

describe('Navigation Component', () => {
  it('should render all navigation links', () => {
    render(<Navigation />);
    
    // Use getAllByText since the navigation items appear in both desktop and mobile nav
    const dashboardElements = screen.getAllByText('Dashboard');
    expect(dashboardElements.length).toBeGreaterThan(0);
    
    const positionsElements = screen.getAllByText('Positions');
    expect(positionsElements.length).toBeGreaterThan(0);
    
    const transactionsElements = screen.getAllByText('Transactions');
    expect(transactionsElements.length).toBeGreaterThan(0);
    
    const summaryElements = screen.getAllByText('Summary');
    expect(summaryElements.length).toBeGreaterThan(0);
    
    const settingsElements = screen.getAllByText('Settings');
    expect(settingsElements.length).toBeGreaterThan(0);
  });

  it('should have correct navigation links', () => {
    render(<Navigation />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /positions/i })).toHaveAttribute('href', '/positions');
    expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute('href', '/transactions');
    expect(screen.getByRole('link', { name: /summary/i })).toHaveAttribute('href', '/summary');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
