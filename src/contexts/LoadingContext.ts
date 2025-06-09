import { createContext } from 'react';

export interface LoadingContextType {
  isLoading: boolean;
  message: string;
  subMessage?: string;
  setLoading: (loading: boolean, message?: string, subMessage?: string) => void;
  withLoading: <T>(
    operation: () => Promise<T>,
    message?: string,
    subMessage?: string
  ) => Promise<T>;
}

export const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Re-export LoadingProvider for convenience
export { LoadingProvider } from './LoadingProvider';
