import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import ThemeToggle from '../components/ThemeToggle';

// Mock the theme context
const mockToggleTheme = vi.fn();
const mockTheme = { isDark: false, toggleTheme: mockToggleTheme };

vi.mock('../contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTheme: () => mockTheme
  };
});

describe('ThemeToggle Component', () => {
  it('should render theme toggle component', () => {
    render(<ThemeToggle />);
    
    // The mock theme has isDark: false, so it shows "switch to dark mode"
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByTitle(/switch to dark mode/i)).toBeInTheDocument();
  });

  it('should call toggleTheme when clicked', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(button);
    
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('should display correct aria-label for light theme', () => {
    render(<ThemeToggle />);
    
    // Mock theme has isDark: false, so it shows "switch to dark mode"
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });
});
