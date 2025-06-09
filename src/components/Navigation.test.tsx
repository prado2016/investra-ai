import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../components/Navigation';

const NavigationWithRouter = () => (
  <BrowserRouter>
    <Navigation />
  </BrowserRouter>
);

describe('Navigation Component', () => {
  it('should render all navigation links', () => {
    render(<NavigationWithRouter />);
    
    // Use getAllByText and check the length instead of expecting single elements
    const dashboardElements = screen.getAllByText('Dashboard');
    expect(dashboardElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should have correct navigation links', () => {
    render(<NavigationWithRouter />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /positions/i })).toHaveAttribute('href', '/positions');
    expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute('href', '/transactions');
    expect(screen.getByRole('link', { name: /summary/i })).toHaveAttribute('href', '/summary');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
