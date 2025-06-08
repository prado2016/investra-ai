import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export interface UseNetworkOptions {
  checkInterval?: number; // ms
  slowConnectionThreshold?: number; // Mbps
}

/**
 * Hook to monitor network status and connection quality
 */
export const useNetwork = (options: UseNetworkOptions = {}) => {
  const { 
    checkInterval = 5000, 
    slowConnectionThreshold = 1 
  } = options;

  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    effectiveType: null,
    downlink: null,
    rtt: null
  }));

  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Get connection info from navigator.connection if available
  const getConnectionInfo = useCallback((): Partial<NetworkStatus> => {
    const navigatorWithConnection = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        addEventListener?: (event: string, handler: () => void) => void;
        removeEventListener?: (event: string, handler: () => void) => void;
      };
      mozConnection?: { effectiveType?: string; downlink?: number; rtt?: number };
      webkitConnection?: { effectiveType?: string; downlink?: number; rtt?: number };
    };
    
    const connection = navigatorWithConnection.connection || 
                      navigatorWithConnection.mozConnection || 
                      navigatorWithConnection.webkitConnection;

    if (!connection) {
      return {
        isSlowConnection: false,
        effectiveType: null,
        downlink: null,
        rtt: null
      };
    }

    const downlink = connection.downlink || 0;
    const isSlowConnection = downlink < slowConnectionThreshold;

    return {
      isSlowConnection,
      effectiveType: connection.effectiveType || null,
      downlink,
      rtt: connection.rtt || null
    };
  }, [slowConnectionThreshold]);

  // Update network status
  const updateStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    const connectionInfo = getConnectionInfo();

    setStatus(prev => ({
      ...prev,
      isOnline,
      ...connectionInfo
    }));

    if (isOnline && !status.isOnline) {
      setLastOnlineTime(new Date());
      setReconnectAttempts(0);
    }
  }, [getConnectionInfo, status.isOnline]);

  // Test actual connectivity (not just navigator.onLine)
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource
      await fetch('/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch {
      try {
        // Fallback: try to reach a reliable external service
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  // Attempt to reconnect
  const attemptReconnect = useCallback(async (): Promise<boolean> => {
    setReconnectAttempts(prev => prev + 1);
    
    try {
      const isConnected = await testConnectivity();
      
      if (isConnected) {
        setStatus(prev => ({ ...prev, isOnline: true }));
        setLastOnlineTime(new Date());
        setReconnectAttempts(0);
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }, [testConnectivity]);

  // Set up event listeners
  useEffect(() => {
    const handleOnline = () => {
      updateStatus();
    };

    const handleOffline = () => {
      updateStatus();
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const navigatorWithConnection = navigator as Navigator & {
      connection?: {
        addEventListener?: (event: string, handler: () => void) => void;
        removeEventListener?: (event: string, handler: () => void) => void;
      };
    };
    const connection = navigatorWithConnection.connection;
    if (connection) {
      connection.addEventListener?.('change', updateStatus);
    }

    // Periodic connectivity check
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        testConnectivity().then(isConnected => {
          if (isConnected !== status.isOnline) {
            updateStatus();
          }
        });
      }
    }, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener?.('change', updateStatus);
      }
      
      clearInterval(interval);
    };
  }, [updateStatus, testConnectivity, checkInterval, status.isOnline]);

  // Initial status check
  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  return {
    ...status,
    lastOnlineTime,
    reconnectAttempts,
    attemptReconnect,
    testConnectivity
  };
};

export default useNetwork;
