import { useContext } from 'react';
import { LoadingContext, LoadingContextType } from '../contexts/LoadingContext';

export const useGlobalLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
};
