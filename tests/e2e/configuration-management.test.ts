/**
 * Configuration Management End-to-End Tests
 * Tests all configuration categories, validation, encryption, and API integration
 */

import { test, expect, Page } from '@playwright/test';

interface ConfigurationTestData {
  category: string;
  validConfig: Record<string, any>;
  invalidConfig: Record<string, any>;
  requiredFields: string[];
}

const testConfigurations: ConfigurationTestData[] = [
  {
    category: 'email_server',
    validConfig: {
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_secure: true,
      imap_username: 'test@gmail.com',
      imap_password: 'secure-password',
      batch_size: 10,
      processing_interval: 5
    },
    invalidConfig: {
      imap_host: '',
      imap_port: 70000, // Invalid port
      imap_username: 'invalid-email',
      imap_password: ''
    },
    requiredFields: ['imap_host', 'imap_username', 'imap_password']
  },
  {
    category: 'ai_services',
    validConfig: {
      google_api_key: 'AIzaSyDummyKey123456789012345678901234567',
      max_tokens: 1000,
      temperature: 0.3,
      confidence_threshold: 0.8,
      rate_limit_requests_per_minute: 60
    },
    invalidConfig: {
      google_api_key: 'invalid-key-format',
      max_tokens: 50000, // Too high
      temperature: 2.0, // Too high
      confidence_threshold: 1.5 // Too high
    },
    requiredFields: ['google_api_key']
  },
  {
    category: 'database',
    validConfig: {
      supabase_url: 'https://test.supabase.co',
      supabase_anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      max_connections: 10,
      connection_timeout: 30000,
      query_timeout: 60000
    },
    invalidConfig: {
      supabase_url: 'invalid-url',
      supabase_anon_key: 'invalid-jwt',
      max_connections: 0,
      connection_timeout: -1
    },
    requiredFields: ['supabase_url', 'supabase_anon_key']
  },
  {
    category: 'monitoring',
    validConfig: {
      health_check_interval: 30000,
      error_threshold: 10,
      memory_threshold: 85,
      cpu_threshold: 80,
      alert_email: 'admin@example.com',
      log_level: 'info'
    },
    invalidConfig: {
      health_check_interval: 1000, // Too low
      memory_threshold: 100, // Too high
      alert_email: 'invalid-email',
      log_level: 'invalid-level'
    },
    requiredFields: []
  },
  {
    category: 'security',
    validConfig: {
      encryption_algorithm: 'AES-256-GCM',
      session_timeout_minutes: 480,
      password_min_length: 12,
      account_lockout_attempts: 5,
      require_2fa: false
    },
    invalidConfig: {
      encryption_algorithm: 'weak-encryption',
      session_timeout_minutes: 30, // Too low
      password_min_length: 4, // Too low
      account_lockout_attempts: 50 // Too high
    },
    requiredFields: []
  },
  {
    category: 'api',
    validConfig: {
      server_port: 3001,
      rate_limit_requests_per_minute: 100,
      max_request_size_mb: 50,
      api_request_timeout: 30000,
      cors_enabled: true
    },
    invalidConfig: {
      server_port: 99, // Too low
      rate_limit_requests_per_minute: 5000, // Too high
      max_request_size_mb: 5000, // Too high
      api_request_timeout: 1000 // Too low
    },
    requiredFields: []
  }
];

class ConfigurationPage {
  constructor(private page: Page) {}

  async navigateToSettings() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCategory(category: string) {
    await this.page.click(`[data-testid="settings-tab-${category}"]`);
    await this.page.waitForSelector(`[data-testid="config-form-${category}"]`);
  }

  async fillConfiguration(category: string, config: Record<string, any>) {
    for (const [key, value] of Object.entries(config)) {
      const fieldSelector = `[data-testid="config-field-${key}"]`;
      
      if (typeof value === 'boolean') {
        if (value) {
          await this.page.check(fieldSelector);
        } else {
          await this.page.uncheck(fieldSelector);
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        await this.page.fill(fieldSelector, value.toString());
      }
    }
  }

  async saveConfiguration(category: string) {
    await this.page.click(`[data-testid="save-config-${category}"]`);
  }

  async testConnection(category: string) {
    await this.page.click(`[data-testid="test-connection-${category}"]`);
    
    // Wait for test result
    const resultSelector = `[data-testid="connection-test-result-${category}"]`;
    await this.page.waitForSelector(resultSelector, { timeout: 15000 });
    
    const result = await this.page.textContent(resultSelector);
    return result;
  }

  async getValidationErrors() {
    const errorElements = await this.page.locator('[data-testid^="validation-error-"]').all();
    const errors: Record<string, string> = {};
    
    for (const element of errorElements) {
      const testId = await element.getAttribute('data-testid');
      const field = testId?.replace('validation-error-', '') || '';
      const message = await element.textContent();
      errors[field] = message || '';
    }
    
    return errors;
  }

  async exportConfiguration() {
    await this.page.click('[data-testid="export-all-btn"]');
    
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click('[data-testid="confirm-export-btn"]')
    ]);
    
    return download;
  }

  async importConfiguration(configData: any) {
    await this.page.click('[data-testid="import-config-btn"]');
    
    // Create a test file
    await this.page.setInputFiles('[data-testid="config-file-input"]', {
      name: 'test-config.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(configData))
    });
    
    await this.page.click('[data-testid="import-confirm-btn"]');
    
    // Wait for import result
    await this.page.waitForSelector('[data-testid="import-result"]', {
      timeout: 10000
    });
    
    const result = await this.page.textContent('[data-testid="import-result"]');
    return result;
  }

  async resetToDefaults(category: string) {
    await this.page.click(`[data-testid="reset-defaults-${category}"]`);
    await this.page.click('[data-testid="confirm-reset"]');
    
    // Wait for reset to complete
    await this.page.waitForSelector(`[data-testid="reset-success-${category}"]`, {
      timeout: 5000
    });
  }
}

test.describe('Configuration Management', () => {
  let configPage: ConfigurationPage;

  test.beforeEach(async ({ page }) => {
    configPage = new ConfigurationPage(page);
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });
  });

  test('All configuration categories load correctly', async ({ page }) => {
    await configPage.navigateToSettings();

    for (const config of testConfigurations) {
      await configPage.selectCategory(config.category);
      
      // Verify form is loaded
      await expect(page.locator(`[data-testid="config-form-${config.category}"]`)).toBeVisible();
      
      // Verify required fields are marked
      for (const field of config.requiredFields) {
        await expect(page.locator(`[data-testid="config-field-${field}"][required]`)).toBeVisible();
      }
    }
  });

  test('Valid configuration save and load cycle', async ({ page }) => {
    test.setTimeout(60000);

    await configPage.navigateToSettings();

    for (const config of testConfigurations) {
      await configPage.selectCategory(config.category);
      await configPage.fillConfiguration(config.category, config.validConfig);
      await configPage.saveConfiguration(config.category);
      
      // Wait for save success
      await page.waitForSelector(`[data-testid="save-success-${config.category}"]`, {
        timeout: 5000
      });
      
      // Reload page to test persistence
      await page.reload();
      await page.waitForLoadState('networkidle');
      await configPage.selectCategory(config.category);
      
      // Verify values are persisted
      for (const [key, value] of Object.entries(config.validConfig)) {
        const fieldValue = await page.inputValue(`[data-testid="config-field-${key}"]`);
        if (typeof value === 'boolean') {
          const isChecked = await page.isChecked(`[data-testid="config-field-${key}"]`);
          expect(isChecked).toBe(value);
        } else {
          expect(fieldValue).toBe(value.toString());
        }
      }
    }
  });

  test('Configuration validation and error handling', async ({ page }) => {
    test.setTimeout(60000);

    await configPage.navigateToSettings();

    for (const config of testConfigurations) {
      await configPage.selectCategory(config.category);
      await configPage.fillConfiguration(config.category, config.invalidConfig);
      
      // Try to save invalid configuration
      await configPage.saveConfiguration(config.category);
      
      // Should see validation errors
      const errors = await configPage.getValidationErrors();
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      
      // Verify specific validation messages
      for (const [field, error] of Object.entries(errors)) {
        expect(error).toBeTruthy();
        expect(error.length).toBeGreaterThan(0);
      }
    }
  });

  test('Connection testing for applicable categories', async ({ page }) => {
    test.setTimeout(90000);

    await configPage.navigateToSettings();

    const testableCategories = ['email_server', 'ai_services', 'database'];

    for (const categoryData of testConfigurations.filter(c => testableCategories.includes(c.category))) {
      await configPage.selectCategory(categoryData.category);
      await configPage.fillConfiguration(categoryData.category, categoryData.validConfig);
      
      // Test connection
      const testResult = await configPage.testConnection(categoryData.category);
      
      // Should get some kind of result (success or failure)
      expect(testResult).toBeTruthy();
      expect(testResult.length).toBeGreaterThan(0);
    }
  });

  test('Configuration export functionality', async ({ page }) => {
    test.setTimeout(30000);

    await configPage.navigateToSettings();

    // Configure at least one category
    const emailConfig = testConfigurations.find(c => c.category === 'email_server')!;
    await configPage.selectCategory(emailConfig.category);
    await configPage.fillConfiguration(emailConfig.category, emailConfig.validConfig);
    await configPage.saveConfiguration(emailConfig.category);

    // Wait for save
    await page.waitForSelector(`[data-testid="save-success-${emailConfig.category}"]`);

    // Export configuration
    const download = await configPage.exportConfiguration();
    
    expect(download.suggestedFilename()).toMatch(/investra-config-\d{4}-\d{2}-\d{2}\.json/);
    
    // Verify download completes
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('Configuration import functionality', async ({ page }) => {
    test.setTimeout(30000);

    await configPage.navigateToSettings();

    const testImportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      configurations: {
        email_server: {
          imap_host: 'imported.example.com',
          imap_port: 993,
          imap_username: 'imported@example.com'
        },
        ai_services: {
          google_api_key: 'AIzaImportedKey123456789012345678901234567',
          max_tokens: 2000
        }
      },
      metadata: {
        userId: 'test-user',
        categories: ['email_server', 'ai_services']
      }
    };

    const importResult = await configPage.importConfiguration(testImportData);
    expect(importResult).toContain('success');

    // Verify imported values
    await configPage.selectCategory('email_server');
    const hostValue = await page.inputValue('[data-testid="config-field-imap_host"]');
    expect(hostValue).toBe('imported.example.com');

    await configPage.selectCategory('ai_services');
    const apiKeyValue = await page.inputValue('[data-testid="config-field-google_api_key"]');
    expect(apiKeyValue).toBe('AIzaImportedKey123456789012345678901234567');
  });

  test('Reset to defaults functionality', async ({ page }) => {
    test.setTimeout(30000);

    await configPage.navigateToSettings();

    // First, configure a category with custom values
    const emailConfig = testConfigurations.find(c => c.category === 'email_server')!;
    await configPage.selectCategory(emailConfig.category);
    await configPage.fillConfiguration(emailConfig.category, emailConfig.validConfig);
    await configPage.saveConfiguration(emailConfig.category);

    // Wait for save
    await page.waitForSelector(`[data-testid="save-success-${emailConfig.category}"]`);

    // Reset to defaults
    await configPage.resetToDefaults(emailConfig.category);

    // Verify fields are reset to default values (empty for most fields)
    const hostValue = await page.inputValue('[data-testid="config-field-imap_host"]');
    expect(hostValue).toBe(''); // Should be empty after reset
  });

  test('Real-time validation feedback', async ({ page }) => {
    test.setTimeout(30000);

    await configPage.navigateToSettings();
    await configPage.selectCategory('email_server');

    // Test real-time validation for email field
    await page.fill('[data-testid="config-field-imap_username"]', 'invalid-email');
    
    // Should see validation error immediately
    await page.waitForSelector('[data-testid="validation-error-imap_username"]', {
      timeout: 3000
    });

    const error = await page.textContent('[data-testid="validation-error-imap_username"]');
    expect(error).toContain('email');

    // Fix the email and error should disappear
    await page.fill('[data-testid="config-field-imap_username"]', 'valid@example.com');
    
    await page.waitForSelector('[data-testid="validation-error-imap_username"]', {
      state: 'hidden',
      timeout: 3000
    });
  });

  test('Configuration auto-save functionality', async ({ page }) => {
    test.setTimeout(30000);

    await configPage.navigateToSettings();
    await configPage.selectCategory('email_server');

    // Fill in some data
    await page.fill('[data-testid="config-field-imap_host"]', 'autosave.example.com');
    
    // Wait for auto-save indicator
    await page.waitForSelector('[data-testid="auto-save-indicator"]', {
      timeout: 5000
    });

    // Navigate away and back
    await configPage.selectCategory('ai_services');
    await configPage.selectCategory('email_server');

    // Value should be preserved
    const hostValue = await page.inputValue('[data-testid="config-field-imap_host"]');
    expect(hostValue).toBe('autosave.example.com');
  });
});

test.describe('Configuration Security Tests', () => {
  test('Sensitive data encryption', async ({ page }) => {
    test.setTimeout(30000);

    const configPage = new ConfigurationPage(page);
    await configPage.navigateToSettings();

    // Mock auth
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });

    await configPage.selectCategory('email_server');
    
    // Fill password field (should be encrypted)
    await page.fill('[data-testid="config-field-imap_password"]', 'super-secret-password');
    await configPage.saveConfiguration('email_server');

    // Wait for save
    await page.waitForSelector('[data-testid="save-success-email_server"]');

    // Inspect network requests to ensure password is encrypted
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/configuration')) {
        responses.push(response);
      }
    });

    // Reload to trigger API call
    await page.reload();
    await page.waitForLoadState('networkidle');
    await configPage.selectCategory('email_server');

    // Check that responses don't contain plain text password
    // This would need to be adapted based on actual API response format
    for (const response of responses) {
      const body = await response.text().catch(() => '');
      expect(body).not.toContain('super-secret-password');
    }
  });

  test('Authentication and authorization', async ({ page }) => {
    // Test without authentication
    await page.goto('/settings');
    
    // Should redirect to login or show auth error
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|auth|unauthorized)/);
  });
});

test.describe('Configuration Performance Tests', () => {
  test('Configuration loading performance', async ({ page }) => {
    const configPage = new ConfigurationPage(page);

    // Mock auth
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });

    const startTime = Date.now();
    await configPage.navigateToSettings();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
  });

  test('Configuration save performance', async ({ page }) => {
    const configPage = new ConfigurationPage(page);

    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });

    await configPage.navigateToSettings();
    await configPage.selectCategory('email_server');

    const emailConfig = testConfigurations.find(c => c.category === 'email_server')!;
    await configPage.fillConfiguration('email_server', emailConfig.validConfig);

    const startTime = Date.now();
    await configPage.saveConfiguration('email_server');
    
    await page.waitForSelector('[data-testid="save-success-email_server"]');
    const saveTime = Date.now() - startTime;

    expect(saveTime).toBeLessThan(3000); // Should save within 3 seconds
  });
});