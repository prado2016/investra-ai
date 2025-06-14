import React, { createContext, useContext, useState, useEffect } from 'react';

interface DebugSettings {
  showDebugPanel: boolean;
  showConnectionHealth: boolean;
  showEmergencyReload: boolean;
  showCircuitBreakerReset: boolean;
  showApiMonitoring: boolean;
  showPortfolioDebug: boolean;
  largerLogText: boolean;
}

interface DebugContextType {
  settings: DebugSettings;
  updateSetting: (key: keyof DebugSettings, value: boolean) => void;
  resetToDefaults: () => void;
}

const defaultSettings: DebugSettings = {
  showDebugPanel: false,
  showConnectionHealth: false,
  showEmergencyReload: false,
  showCircuitBreakerReset: false,
  showApiMonitoring: false,
  showPortfolioDebug: false,
  largerLogText: false
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const useDebugSettings = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebugSettings must be used within a DebugProvider');
  }
  return context;
};

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DebugSettings>(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('debugSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('debugSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof DebugSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return (
    <DebugContext.Provider value={{ settings, updateSetting, resetToDefaults }}>
      {children}
    </DebugContext.Provider>
  );
};
