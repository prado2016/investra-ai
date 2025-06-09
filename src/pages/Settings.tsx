import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthProvider';
import { useDataManagement } from '../hooks/useStorage';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import { usePageTitle } from '../hooks/usePageTitle';
import { SupabaseService } from '../services/supabaseService';
import ThemeToggle from '../components/ThemeToggle';
import ApiKeySettings from '../components/SimpleApiKeySettings';
import GeminiTestComponent from '../components/GeminiTestComponent';
// import AIServicesTest from '../components/AIServicesTest';
// import AISymbolLookupAPITest from '../components/AISymbolLookupAPITest';
// import AISymbolInputTest from '../components/AISymbolInputTest';
import type { CostBasisMethod } from '../utils/plCalculations';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background-color: ${props => props.theme.colors.background};
  min-height: 100vh;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 2rem;
`;

const Section = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px ${props => props.theme.colors.shadow};
  border: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 1rem;
  font-size: 1.3rem;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background-color: #007bff;
          color: white;
          &:hover { background-color: #0056b3; }
        `;
      case 'danger':
        return `
          background-color: #dc3545;
          color: white;
          &:hover { background-color: #c82333; }
        `;
      default:
        return `
          background-color: #6c757d;
          color: white;
          &:hover { background-color: #545b62; }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  max-width: 400px;
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  font-weight: 500;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        `;
      case 'error':
        return `
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        `;
      default:
        return `
          background-color: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        `;
    }
  }}
`;

const StorageInfo = styled.div`
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text.primary};
`;

const Select = styled.select`
  width: 100%;
  max-width: 300px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 1rem;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-weight: normal;
  margin-bottom: 0.5rem;
  cursor: pointer;
  
  &:hover {
    color: #007bff;
  }
`;

const Settings: React.FC = () => {
  const { signOut, user } = useAuth();
  const { importData, clearAllData, getStorageInfo } = useDataManagement();
  const { portfolios } = useSupabasePortfolios();
  
  // Set page title
  usePageTitle('Settings', { subtitle: 'App Configuration' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // P&L calculation preferences
  const [costBasisMethod, setCostBasisMethod] = useState<CostBasisMethod>(() => {
    return (localStorage.getItem('costBasisMethod') as CostBasisMethod) || 'FIFO';
  });
  const [baseCurrency, setBaseCurrency] = useState(() => {
    return localStorage.getItem('baseCurrency') || 'USD';
  });
  const [includeTaxImplications, setIncludeTaxImplications] = useState(() => {
    return localStorage.getItem('includeTaxImplications') === 'true';
  });

  // Timezone Configuration
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  // Common timezones for the dropdown
  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Europe/London', label: 'GMT (London)' },
    { value: 'Europe/Paris', label: 'CET (Paris)' },
    { value: 'Europe/Berlin', label: 'CET (Berlin)' },
    { value: 'Europe/Zurich', label: 'CET (Zurich)' },
    { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
    { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
    { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
    { value: 'Asia/Singapore', label: 'SGT (Singapore)' },
    { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
    { value: 'Australia/Melbourne', label: 'AEST (Melbourne)' },
  ];

  const [storageInfo, setStorageInfo] = useState(() => ({
    used: 0,
    available: 0,
    percentage: 0,
    positionsCount: 0,
    transactionsCount: 0,
    portfoliosCount: 0,
    cacheSize: 0
  }));

  useEffect(() => {
    // Update storage info when portfolios change
    setStorageInfo({
      used: 0, // Not applicable for Supabase
      available: 0, // Not applicable for Supabase
      percentage: 0, // Not applicable for Supabase
      positionsCount: 0, // TODO: Get positions count from Supabase
      transactionsCount: 0, // Will be fetched during export
      portfoliosCount: portfolios?.length || 0,
      cacheSize: getStorageInfo().cacheSize // Keep localStorage cache info
    });
  }, [portfolios, getStorageInfo]);

  const handleLogout = async () => {
    console.log('🔓 Logout button clicked');
    setIsLoading(true);
    try {
      console.log('🔓 Calling signOut...');
      const result = await signOut();
      console.log('🔓 SignOut result:', result);
      if (result.success) {
        console.log('🔓 Logout successful');
        showMessage('Successfully logged out!', 'success');
      } else {
        console.log('🔓 Logout failed:', result.error);
        showMessage(result.error || 'Logout failed', 'error');
        setIsLoading(false);
      }
    } catch (error) {
      console.log('🔓 Logout error:', error);
      showMessage('An unexpected error occurred during logout', 'error');
      setIsLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleExportData = async () => {
    setIsLoading(true);
    console.log('🔍 Export started, portfolios:', portfolios);
    
    try {
      // Check if we have any portfolios
      if (!portfolios || portfolios.length === 0) {
        console.log('❌ No portfolios found');
        showMessage('No portfolios found to export.', 'error');
        return;
      }

      console.log('📦 Exporting data from Supabase...');

      // Get all transactions across all portfolios
      const allTransactions = [];
      let allAssets = [];
      
      for (const portfolio of portfolios) {
        console.log(`🔍 Getting transactions for portfolio: ${portfolio.id}`);
        const portfolioTransactionsResult = await SupabaseService.transaction.getTransactions(portfolio.id);
        if (portfolioTransactionsResult.success && portfolioTransactionsResult.data) {
          allTransactions.push(...portfolioTransactionsResult.data);
        }
      }

      console.log('📊 Total transactions found:', allTransactions.length);

      // Extract unique assets from transactions (they're already included via join)
      if (allTransactions.length > 0) {
        console.log('🔍 Extracting assets from transactions...');
        const assetMap = new Map();
        
        allTransactions.forEach(transaction => {
          if (transaction.asset && !assetMap.has(transaction.asset.id)) {
            assetMap.set(transaction.asset.id, transaction.asset);
          }
        });
        
        allAssets = Array.from(assetMap.values());
        console.log('📈 Unique assets found:', allAssets.length);
      }

      // Export data from Supabase
      const exportData = {
        portfolios: portfolios,
        transactions: allTransactions,
        assets: allAssets,
        exportDate: new Date().toISOString(),
        version: '2.0.0',
        source: 'supabase'
      };

      console.log('💾 Creating download file...');

      // Create and download file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `investra-ai-supabase-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Export completed successfully');
      showMessage('Data exported successfully!', 'success');
    } catch (error) {
      console.error('❌ Export error:', error);
      showMessage('Failed to export data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      showMessage('Please select a file to import.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await importData(importFile);
      showMessage('Data imported successfully! Page will reload to reflect changes.', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      showMessage('Failed to import data. Please check the file format.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await clearAllData();
      showMessage('All data cleared successfully! Page will reload.', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      showMessage('Failed to clear data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCostBasisMethodChange = (method: CostBasisMethod) => {
    setCostBasisMethod(method);
    localStorage.setItem('costBasisMethod', method);
    showMessage(`Cost basis method updated to ${method}`, 'success');
  };

  const handleBaseCurrencyChange = (currency: string) => {
    setBaseCurrency(currency);
    localStorage.setItem('baseCurrency', currency);
    showMessage(`Base currency updated to ${currency}`, 'success');
  };

  const handleTaxImplicationsToggle = (enabled: boolean) => {
    setIncludeTaxImplications(enabled);
    localStorage.setItem('includeTaxImplications', enabled.toString());
    showMessage(`Tax implications tracking ${enabled ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('timezone', timezone);
    showMessage(`Timezone updated to ${timezone}`, 'success');
  };

  return (
    <PageContainer>
      <Title>Settings & Data Management</Title>

      {statusMessage && (
        <StatusMessage type={statusMessage.type}>
          {statusMessage.text}
        </StatusMessage>
      )}

      <Section>
        <SectionTitle>Data Storage Information</SectionTitle>
        <StorageInfo>
          <InfoRow>
            <span>Storage Type:</span>
            <span>Supabase Cloud Database</span>
          </InfoRow>
          <InfoRow>
            <span>Portfolios:</span>
            <span>{storageInfo.portfoliosCount} items</span>
          </InfoRow>
          <InfoRow>
            <span>Transactions:</span>
            <span>{storageInfo.transactionsCount} items</span>
          </InfoRow>
          <InfoRow>
            <span>Local Cache:</span>
            <span>{storageInfo.cacheSize} items</span>
          </InfoRow>
          <InfoRow>
            <span>Data Status:</span>
            <span style={{ color: portfolios.length > 0 ? '#28a745' : '#6c757d' }}>
              {portfolios.length > 0 ? 'Data Available' : 'No Data'}
            </span>
          </InfoRow>
        </StorageInfo>
      </Section>

      <Section>
        <SectionTitle>Data Export</SectionTitle>
        <Description>
          Export all your portfolio data from the Supabase cloud database including portfolios, 
          transactions, and assets to a JSON file for backup or transfer.
        </Description>
        <ButtonGroup>
          <Button 
            $variant="primary" 
            onClick={handleExportData}
            disabled={isLoading || !portfolios || portfolios.length === 0}
          >
            {isLoading ? 'Exporting...' : 'Export Supabase Data'}
          </Button>
        </ButtonGroup>
        {(!portfolios || portfolios.length === 0) && (
          <Description style={{ color: '#6c757d', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            No portfolios found in your Supabase database to export.
          </Description>
        )}
      </Section>

      <Section>
        <SectionTitle>Data Import</SectionTitle>
        <Description>
          Import portfolio data from a previously exported JSON file. This will merge 
          with your existing data.
        </Description>
        <FileInput
          type="file"
          accept=".json"
          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
        />
        <ButtonGroup>
          <Button 
            $variant="primary" 
            onClick={handleImportData}
            disabled={isLoading || !importFile}
          >
            {isLoading ? 'Importing...' : 'Import Data'}
          </Button>
        </ButtonGroup>
      </Section>

      <Section>
        <SectionTitle>Reset Data</SectionTitle>
        <Description>
          Clear all stored data including positions, transactions, portfolios, and cache. 
          This action cannot be undone.
        </Description>
        <ButtonGroup>
          <Button 
            $variant="danger" 
            onClick={handleClearAllData}
            disabled={isLoading}
          >
            {isLoading ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </ButtonGroup>
      </Section>

      <Section>
        <SectionTitle>P&L Calculation Preferences</SectionTitle>
        <Description>
          Configure how profit and loss calculations are performed for your portfolio.
          These settings affect realized P&L calculations, tax reporting, and currency conversions.
        </Description>
        
        <FormGroup>
          <Label htmlFor="costBasisMethod">Cost Basis Method</Label>
          <Select
            id="costBasisMethod"
            value={costBasisMethod}
            onChange={(e) => handleCostBasisMethodChange(e.target.value as CostBasisMethod)}
          >
            <option value="FIFO">FIFO (First In, First Out)</option>
            <option value="LIFO">LIFO (Last In, First Out)</option>
            <option value="AVERAGE">Average Cost</option>
          </Select>
          <Description style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            FIFO is the most common method and default for tax reporting in most jurisdictions.
          </Description>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="baseCurrency">Base Currency</Label>
          <Select
            id="baseCurrency"
            value={baseCurrency}
            onChange={(e) => handleBaseCurrencyChange(e.target.value)}
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="JPY">JPY - Japanese Yen</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
          </Select>
          <Description style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            All P&L calculations and reports will be converted to this currency.
          </Description>
        </FormGroup>

        <FormGroup>
          <CheckboxLabel>
            <Checkbox
              checked={includeTaxImplications}
              onChange={(e) => handleTaxImplicationsToggle(e.target.checked)}
            />
            Include tax implications in P&L calculations
          </CheckboxLabel>
          <Description style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            Calculate short-term vs long-term gains and estimated tax liability (US tax rules). 
            This is for informational purposes only and should not replace professional tax advice.
          </Description>
        </FormGroup>
      </Section>

      {/* API Key Management */}
      <Section>
        <ApiKeySettings />
      </Section>

      {/* Gemini AI Test */}
      <Section>
        <GeminiTestComponent />
      </Section>

      {/* AI Services Test - Commented out due to import issues
      <Section>
        <AIServicesTest />
      </Section>

      <Section>
        <AISymbolLookupAPITest />
      </Section>

      <Section>
        <AISymbolInputTest />
      </Section>
      */}

      <Section>
        <SectionTitle>Timezone Configuration</SectionTitle>
        <Description>
          Set your local timezone for accurate daily P&L calculations, trade timestamps, 
          and market hours display. This affects when your trading day resets and how dates are displayed.
        </Description>
        
        <FormGroup>
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            id="timezone"
            value={selectedTimezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
          >
            {commonTimezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
          <Description style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            Current time in selected timezone: {new Date().toLocaleString('en-US', { timeZone: selectedTimezone })}
            <br />
            This setting affects daily summary calculations and trade timestamps.
          </Description>
        </FormGroup>
      </Section>

      <Section>
        <SectionTitle>Appearance</SectionTitle>
        <Description>
          Customize the visual appearance of the application. 
          Dark mode reduces eye strain and can save battery on OLED displays.
        </Description>
        
        <FormGroup>
          <Label>Theme Preference</Label>
          <ThemeToggle />
          <Description style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            Toggle between light and dark themes. Your preference will be saved automatically.
            The system will remember your choice across sessions.
          </Description>
        </FormGroup>
      </Section>

      <Section>
        <SectionTitle>Account</SectionTitle>
        <Description>
          Manage your account settings and session.
        </Description>
        
        <FormGroup>
          <Label>Current User</Label>
          <Description style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Logged in as: <strong>{user?.email}</strong>
          </Description>
          
          <Button 
            $variant="danger" 
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </Button>
          
          <Description style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            This will sign you out of your account and redirect you to the login page.
            Your data will remain safely stored in the cloud.
          </Description>
        </FormGroup>
      </Section>
    </PageContainer>
  );
};

export default Settings;
