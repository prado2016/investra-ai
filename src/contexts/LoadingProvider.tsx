import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { FullScreenLoading } from '../components/LoadingComponents';
import { LoadingContext, type LoadingContextType } from './LoadingContext';

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');
  const [subMessage, setSubMessage] = useState<string | undefined>();

  const setLoading = (loading: boolean, msg = 'Loading...', subMsg?: string) => {
    setIsLoading(loading);
    setMessage(msg);
    setSubMessage(subMsg);
  };

  const withLoading = async <T,>(
    operation: () => Promise<T>,
    msg = 'Loading...',
    subMsg?: string
  ): Promise<T> => {
    try {
      setLoading(true, msg, subMsg);
      const result = await operation();
      return result;
    } finally {
      setLoading(false);
    }
  };

  const value: LoadingContextType = {
    isLoading,
    message,
    subMessage,
    setLoading,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <FullScreenLoading
        isLoading={isLoading}
        message={message}
        subMessage={subMessage}
      />
    </LoadingContext.Provider>
  );
};

export function useLoading() {
  const context = React.useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export default LoadingProvider;
