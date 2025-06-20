/**
 * Configuration Section Hook
 * Provides configuration management for individual sections
 * This hook interfaces with the main configuration management hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useConfigurationManagement } from './useConfigurationManagement';

// Test result interface
interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
}

// Configuration section hook return type
interface UseConfigurationSectionReturn {
  // State
  values: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
  testResult: TestResult | null;
  hasChanges: boolean;
  
  // Actions
  updateValue: (key: string, value: any) => void;
  saveConfiguration: () => Promise<void>;
  testConfiguration: () => Promise<TestResult>;
  resetToDefaults: () => Promise<void>;
  validateField: (key: string, value: any) => string | null;
  validateAll: () => Record<string, string>;
}

/**
 * Configuration Section Hook
 * 
 * This hook provides section-specific configuration management.
 * It handles validation, testing, and persistence for individual
 * configuration categories (email, AI, database, etc.).
 * 
 * @param category - The configuration category (e.g., 'email_server', 'ai_services')
 */
export const useConfigurationSection = (category: string): UseConfigurationSectionReturn => {
  // Global configuration management
  const {
    configurations,
    updateConfiguration,
    saveAllChanges,
    testConfiguration: testGlobalConfiguration,
    resetToDefaults: resetGlobalDefaults
  } = useConfigurationManagement();

  // Local state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});

  // Get current values for this category
  const values = configurations[category] || {};

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(values) !== JSON.stringify(originalValues);

  // Update original values when configurations change from external sources
  useEffect(() => {
    if (configurations[category]) {
      setOriginalValues({ ...configurations[category] });
    }
  }, [category, configurations]);

  // Update a single configuration value
  const updateValue = useCallback((key: string, value: any) => {
    // Clear any existing error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    // Clear test result when values change
    setTestResult(null);

    // Update the configuration
    updateConfiguration(category, key, value);
  }, [category, updateConfiguration]);

  // Validate a single field - moved before usage
  const validateField = useCallback((key: string, value: any): string | null => {
    // Basic validation rules - these will be enhanced with real validation service
    switch (key) {
      // Email validation
      case 'imap_username':
      case 'alert_email':
      case 'error_notification_email':
      case 'data_breach_notification_email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;

      // URL validation
      case 'supabase_url':
      case 'api_base_url':
      case 'slack_webhook_url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          return 'Please enter a valid URL starting with http:// or https://';
        }
        break;

      // Port validation
      case 'imap_port':
      case 'server_port':
        if (value && (value < 1 || value > 65535)) {
          return 'Port must be between 1 and 65535';
        }
        break;

      // Required fields
      case 'imap_host':
        if (!value || value.trim().length === 0) {
          return 'IMAP host is required';
        }
        break;

      case 'imap_username':
        if (!value || value.trim().length === 0) {
          return 'Email address is required';
        }
        break;

      case 'imap_password':
        if (!value || value.trim().length === 0) {
          return 'Password is required';
        }
        break;

      case 'google_api_key':
        if (!value || value.trim().length === 0) {
          return 'Google API key is required';
        }
        if (value && !value.startsWith('AIza')) {
          return 'Google API key should start with "AIza"';
        }
        break;

      case 'supabase_url':
        if (!value || value.trim().length === 0) {
          return 'Supabase URL is required';
        }
        if (value && !value.includes('.supabase.co')) {
          return 'Please enter a valid Supabase URL';
        }
        break;

      case 'supabase_anon_key':
      case 'supabase_service_role_key':
        if (!value || value.trim().length === 0) {
          return 'Supabase key is required';
        }
        if (value && !value.startsWith('eyJ')) {
          return 'Supabase key should be a valid JWT token';
        }
        break;

      // Numeric range validation
      case 'max_tokens':
        if (value && (value < 100 || value > 8000)) {
          return 'Max tokens must be between 100 and 8000';
        }
        break;

      case 'temperature':
        if (value && (value < 0 || value > 1)) {
          return 'Temperature must be between 0 and 1';
        }
        break;

      case 'confidence_threshold':
        if (value && (value < 0.1 || value > 1.0)) {
          return 'Confidence threshold must be between 0.1 and 1.0';
        }
        break;

      // Percentage validation
      case 'memory_threshold':
      case 'cpu_threshold':
      case 'disk_threshold':
        if (value && (value < 50 || value > 95)) {
          return 'Threshold must be between 50% and 95%';
        }
        break;

      case 'error_rate_threshold':
        if (value && (value < 1 || value > 50)) {
          return 'Error rate threshold must be between 1% and 50%';
        }
        break;

      // Password policy validation
      case 'password_min_length':
        if (value && (value < 8 || value > 128)) {
          return 'Password length must be between 8 and 128 characters';
        }
        break;

      default:
        // No specific validation for this field
        break;
    }

    return null;
  }, []);

  // Validate all fields in the current configuration - moved before usage
  const validateAll = useCallback((): Record<string, string> => {
    const validationErrors: Record<string, string> = {};

    Object.entries(values).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) {
        validationErrors[key] = error;
      }
    });

    return validationErrors;
  }, [values, validateField]);

  // Save configuration for this section
  const saveConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      
      // Validate all fields before saving
      const validationErrors = validateAll();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        throw new Error('Please fix validation errors before saving');
      }

      // Save using global configuration management
      await saveAllChanges();
      
      // Update original values after successful save
      setOriginalValues({ ...values });
      
      console.log(`✅ ${category} configuration saved successfully`);
    } catch (err) {
      console.error(`❌ Failed to save ${category} configuration:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [category, values, saveAllChanges, validateAll]);

  // Test configuration connection
  const testConfiguration = useCallback(async (): Promise<TestResult> => {
    try {
      setLoading(true);
      setTestResult(null);

      // Validate all fields before testing
      const validationErrors = validateAll();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        const result: TestResult = {
          success: false,
          message: 'Please fix validation errors before testing'
        };
        setTestResult(result);
        return result;
      }

      // Test using global configuration management
      const result = await testGlobalConfiguration(category, values);
      setTestResult(result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test failed';
      const result: TestResult = {
        success: false,
        message: errorMessage
      };
      setTestResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [category, values, testGlobalConfiguration, validateAll]);

  // Reset to default values
  const resetToDefaults = useCallback(async () => {
    try {
      setLoading(true);
      await resetGlobalDefaults(category);
      setErrors({});
      setTestResult(null);
      console.log(`🔄 ${category} configuration reset to defaults`);
    } catch (err) {
      console.error(`❌ Failed to reset ${category} configuration:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [category, resetGlobalDefaults]);

  // Auto-validate when values change
  useEffect(() => {
    const validationErrors = validateAll();
    setErrors(validationErrors);
  }, [values, validateAll]);

  return {
    // State
    values,
    errors,
    loading,
    testResult,
    hasChanges,
    
    // Actions
    updateValue,
    saveConfiguration,
    testConfiguration,
    resetToDefaults,
    validateField,
    validateAll
  };
};

export default useConfigurationSection;