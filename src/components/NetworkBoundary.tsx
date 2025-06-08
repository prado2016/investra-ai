import React from 'react';
import { useNetwork } from '../hooks/useNetwork';
import { OfflinePage } from '../pages/OfflinePage';

interface NetworkBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<Record<string, unknown>>;
  showOfflinePageWhenNoData?: boolean;
}

export const NetworkBoundary: React.FC<NetworkBoundaryProps> = ({
  children,
  fallback: FallbackComponent = OfflinePage,
  showOfflinePageWhenNoData = false
}) => {
  const network = useNetwork();

  // Only show offline page if specifically requested when there's no cached data
  if (!network.isOnline && showOfflinePageWhenNoData) {
    return <FallbackComponent />;
  }

  // Otherwise, render children and let individual components handle their own network states
  return <>{children}</>;
};

export default NetworkBoundary;
