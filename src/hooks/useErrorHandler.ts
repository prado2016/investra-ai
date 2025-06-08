import React from 'react';

// Hook for manually triggering error boundaries (useful for testing)
export const useErrorHandler = () => {
  return React.useCallback((error: Error) => {
    throw error;
  }, []);
};
