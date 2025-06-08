import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import ThemeToggle from '../components/ThemeToggle';

// Mock the theme context
const mockToggleTheme = vi.fn();
const mockTheme = { isDark: false, toggleTheme: mockToggleTheme };

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockTheme
}));

describe('ThemeToggle Component', () => {
  it('should render theme toggle component', () => {
    render(<ThemeToggle />);
    
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('🌙')).toBeInTheDocument();
  });

  it('should call toggleTheme when clicked', () => {
    render(<ThemeToggle />);
    
    const label = screen.getByText('Light Mode');
    fireEvent.click(label);
    
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('should display correct text for light theme', () => {
    render(<ThemeToggle />);
    
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });
});
