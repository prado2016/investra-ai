import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

// Define the theme structure
export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    shadow: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}
// Light theme - Matching CSS variables
export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#D97706',
    secondary: '#4A5568',
    accent: '#F59E0B',
    background: '#ffffff',
    surface: '#ffffff',
    text: {
      primary: '#1A202C',
      secondary: '#4A5568',
      muted: '#A0AEC0',
    },
    border: '#E2E8F0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#10b981',
    warning: '#F59E0B',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// Dark theme - Matching CSS variables
export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#D97706',
    secondary: '#4A5568',
    accent: '#F59E0B',
    background: '#1a1410',
    surface: '#241e18',
    text: {
      primary: '#FEF3C7',
      secondary: '#FDE047',
      muted: '#EAB308',
    },
    border: '#CA8A04',
    shadow: 'rgba(202, 138, 4, 0.2)',
    success: '#10b981',
    warning: '#F59E0B',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// Theme context
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // If parsing fails, fall back to default
    }
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDark));
    // Update data-theme attribute for CSS variables
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
    isDark,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={theme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
