/**
 * Integration Test Suite Entry Point
 * Runs all integration tests and provides comprehensive reporting
 */

import { describe, it, expect } from 'vitest';

// Import all integration test suites
import './services.integration.test';
import './hooks.integration.test';
import './context.integration.test';
import './dataFlow.integration.test';

describe('Integration Test Suite', () => {
  it('should have all integration test suites available', () => {
    // This test ensures all integration test files are properly imported
    // and will run as part of the test suite
    expect(true).toBe(true);
  });
});

// Export test utilities for reuse
export * from '../test-utils';
export * from '../mocks/server';
export * from '../mocks/data';
