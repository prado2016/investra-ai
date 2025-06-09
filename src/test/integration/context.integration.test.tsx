/**
 * Context Integration Tests
 * Tests the integration between React contexts and their consumers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { NotificationProvider } from '../../contexts/NotificationProvider';
import { LoadingProvider } from '../../contexts/LoadingProvider';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { useNotify } from '../../hooks/useNotify';
import { useGlobalLoading } from '../../hooks/useGlobalLoading';

// Test components that use multiple contexts
const TestNotificationComponent = () => {
  const notify = useNotify();
  
  return (
    <div>
      <button onClick={() => notify.success('Test success')}>
        Success Notification
      </button>
      <button onClick={() => notify.error('Test error')}>
        Error Notification
      </button>
      <button onClick={() => notify.warning('Test warning')}>
        Warning Notification
      </button>
    </div>
  );
};

const TestLoadingComponent = () => {
  const { isLoading, setLoading } = useGlobalLoading();
  
  return (
    <div>
      <div data-testid="loading-status">
        {isLoading ? 'Loading...' : 'Not Loading'}
      </div>
      <button onClick={() => setLoading(true)}>
        Start Loading
      </button>
      <button onClick={() => setLoading(false)}>
        Stop Loading
      </button>
    </div>
  );
};

const TestThemeComponent = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  
  return (
    <div>
      <div data-testid="theme-status">
        Current theme: {theme.mode}
      </div>
      <div data-testid="is-dark">
        Is dark: {isDark.toString()}
      </div>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

const IntegratedComponent = () => {
  const notify = useNotify();
  const { isLoading, setLoading } = useGlobalLoading();
  const { theme } = useTheme();
  
  const handleComplexAction = async () => {
    setLoading(true);
    notify.info(`Starting action in ${theme.mode} theme`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setLoading(false);
    notify.success('Action completed successfully');
  };
  
  return (
    <div>
      <div data-testid="integrated-status">
        Theme: {theme.mode}, Loading: {isLoading.toString()}
      </div>
      <button onClick={handleComplexAction}>
        Complex Action
      </button>
    </div>
  );
};

describe('Context Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Individual Context Functionality', () => {
    it('should handle notification context operations', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Act - Trigger different notification types
      fireEvent.click(screen.getByText('Success Notification'));
      fireEvent.click(screen.getByText('Error Notification'));
      fireEvent.click(screen.getByText('Warning Notification'));

      // Note: In a real app, notifications would be rendered somewhere
      // This test verifies the context doesn't throw errors
      expect(screen.getByText('Success Notification')).toBeInTheDocument();
    });

    it('should handle loading context state changes', async () => {
      render(
        <LoadingProvider>
          <TestLoadingComponent />
        </LoadingProvider>
      );

      // Assert - Initial state
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');

      // Act - Start loading
      fireEvent.click(screen.getByText('Start Loading'));

      // Assert - Loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading...');
      });

      // Act - Stop loading
      fireEvent.click(screen.getByText('Stop Loading'));

      // Assert - Back to not loading
      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      });
    });

    it('should handle theme context state changes', async () => {
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );

      // Assert - Initial theme (should be light by default)
      expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('Is dark: false');

      // Act - Toggle theme
      fireEvent.click(screen.getByText('Toggle Theme'));

      // Assert - Should be dark theme
      await waitFor(() => {
        expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: dark');
        expect(screen.getByTestId('is-dark')).toHaveTextContent('Is dark: true');
      });

      // Act - Toggle again
      fireEvent.click(screen.getByText('Toggle Theme'));

      // Assert - Back to light theme
      await waitFor(() => {
        expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: light');
        expect(screen.getByTestId('is-dark')).toHaveTextContent('Is dark: false');
      });
    });
  });

  describe('Multi-Context Integration', () => {
    it('should coordinate between all contexts in complex operations', async () => {
      render(
        <ThemeProvider>
          <LoadingProvider>
            <NotificationProvider>
              <IntegratedComponent />
            </NotificationProvider>
          </LoadingProvider>
        </ThemeProvider>
      );

      // Assert - Initial state
      expect(screen.getByTestId('integrated-status')).toHaveTextContent('Theme: light, Loading: false');

      // Act - Trigger complex action
      fireEvent.click(screen.getByText('Complex Action'));

      // Assert - Should show loading state briefly
      await waitFor(() => {
        expect(screen.getByTestId('integrated-status')).toHaveTextContent('Theme: light, Loading: true');
      });

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByTestId('integrated-status')).toHaveTextContent('Theme: light, Loading: false');
      });
    });

    it('should maintain context state across component re-renders', async () => {
      const { rerender } = render(
        <ThemeProvider>
          <LoadingProvider>
            <TestThemeComponent />
            <TestLoadingComponent />
          </LoadingProvider>
        </ThemeProvider>
      );

      // Act - Change states
      fireEvent.click(screen.getByText('Toggle Theme'));
      fireEvent.click(screen.getByText('Start Loading'));

      // Assert - Both states changed
      await waitFor(() => {
        expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: dark');
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading...');
      });

      // Act - Force re-render
      rerender(
        <ThemeProvider>
          <LoadingProvider>
            <TestThemeComponent />
            <TestLoadingComponent />
          </LoadingProvider>
        </ThemeProvider>
      );

      // Assert - States should persist
      expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: dark');
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading...');
    });
  });

  describe('Context Error Handling', () => {
    it('should handle context provider unmounting gracefully', async () => {
      const { unmount } = render(
        <ThemeProvider>
          <LoadingProvider>
            <NotificationProvider>
              <IntegratedComponent />
            </NotificationProvider>
          </LoadingProvider>
        </ThemeProvider>
      );

      // Verify component is working
      expect(screen.getByTestId('integrated-status')).toBeInTheDocument();

      // Act - Unmount providers
      unmount();

      // Should not throw any errors during cleanup
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should handle context hook usage outside provider', () => {
      // This test verifies our contexts handle missing providers gracefully
      const TestComponent = () => {
        try {
          const notify = useNotify();
          // Test that the hook is accessible
          expect(notify).toBeDefined();
          return <div>Should not reach here</div>;
        } catch {
          return <div>Context error handled</div>;
        }
      };

      // Render without provider - should handle gracefully or throw expected error
      expect(() => {
        render(<TestComponent />);
      }).toThrow(); // Expected to throw when used outside provider
    });
  });

  describe('Context Performance Integration', () => {
    it('should not cause unnecessary re-renders', async () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const { theme } = useTheme();
        const { isLoading } = useGlobalLoading();
        
        return (
          <div data-testid="render-count">
            Renders: {renderCount}, Theme: {theme.mode}, Loading: {isLoading.toString()}
          </div>
        );
      };

      render(
        <ThemeProvider>
          <LoadingProvider>
            <TestComponent />
          </LoadingProvider>
        </ThemeProvider>
      );

      // Assert - Initial render
      expect(screen.getByTestId('render-count')).toHaveTextContent('Renders: 1');

      // Act - Change unrelated state (if we had one)
      // For now, just verify the component doesn't re-render unnecessarily
      await waitFor(() => {
        expect(renderCount).toBe(1);
      });
    });
  });

  describe('Local Storage Integration', () => {
    it('should persist theme preference across browser sessions', async () => {
      // First session
      const { unmount } = render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );

      // Change theme
      fireEvent.click(screen.getByText('Toggle Theme'));
      
      await waitFor(() => {
        expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: dark');
      });

      unmount();

      // Second session - should remember theme
      render(
        <ThemeProvider>
          <TestThemeComponent />
        </ThemeProvider>
      );

      // Should start with dark theme
      await waitFor(() => {
        expect(screen.getByTestId('theme-status')).toHaveTextContent('Current theme: dark');
      });
    });
  });
});
