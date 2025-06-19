# Email Management System Testing Guide

## Table of Contents
1. [Testing Overview](#testing-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [End-to-End Test Execution](#end-to-end-test-execution)
4. [Manual Testing Procedures](#manual-testing-procedures)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Test Data Management](#test-data-management)
8. [Continuous Testing](#continuous-testing)

## Testing Overview

The Email Management System testing strategy covers multiple layers:

- **Unit Tests**: Individual components and services
- **Integration Tests**: Service interactions and API endpoints
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication and data protection

### Test Coverage Goals

- **Functional Coverage**: 100% of user-facing features
- **Code Coverage**: 80%+ for critical components
- **API Coverage**: All endpoints with various scenarios
- **Error Handling**: All error conditions and edge cases

## Test Environment Setup

### Prerequisites

1. **Development Environment**
   ```bash
   # Install dependencies
   npm install
   
   # Install Playwright for E2E tests
   npx playwright install
   
   # Set up test database
   npm run setup:test-db
   ```

2. **Test Configuration**
   ```bash
   # Copy test environment file
   cp .env.test.example .env.test
   
   # Configure test variables
   SUPABASE_URL=https://test-project.supabase.co
   SUPABASE_ANON_KEY=your-test-key
   GOOGLE_AI_API_KEY=your-test-api-key
   ```

3. **Mock Services**
   ```bash
   # Start mock email server
   npm run start:mock-email-server
   
   # Start mock AI service
   npm run start:mock-ai-service
   ```

### Test Data Setup

1. **Create Test Users**
   ```sql
   -- Create test user accounts
   INSERT INTO auth.users (id, email, encrypted_password) 
   VALUES 
   ('test-user-1', 'test1@example.com', 'encrypted-password'),
   ('test-user-2', 'test2@example.com', 'encrypted-password');
   ```

2. **Seed Test Data**
   ```bash
   # Load test configurations
   npm run seed:test-configs
   
   # Create test portfolios
   npm run seed:test-portfolios
   ```

3. **Prepare Test Emails**
   ```bash
   # Load sample transaction emails
   npm run load:sample-emails
   ```

## End-to-End Test Execution

### Running E2E Tests

#### Full Test Suite
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed
```

#### Specific Test Suites
```bash
# Configuration management tests
npx playwright test tests/e2e/configuration-management.test.ts

# Email processing workflow tests
npx playwright test tests/e2e/email-management-workflow.test.ts

# IMAP processing tests
npx playwright test tests/e2e/imap-processing.test.ts
```

#### Test Environment Options
```bash
# Run against staging environment
npm run test:e2e:staging

# Run against production (limited tests)
npm run test:e2e:production

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Test Execution Results

#### Understanding Test Output
```
✓ Email configuration workflow (2m 15s)
✓ IMAP connection testing (45s)
✓ Transaction creation flow (1m 30s)
✗ Performance under load (3m 20s) - FAILED
  Error: Processing took 35s, expected < 30s
  
Summary: 3 passed, 1 failed
```

#### Generating Test Reports
```bash
# Generate HTML report
npx playwright show-report

# Generate allure report
npm run test:e2e:allure

# Export test results
npm run test:export-results
```

### Critical Test Scenarios

#### Configuration Management Tests

1. **Complete Configuration Workflow**
   - Navigate to settings
   - Configure all categories
   - Test connections
   - Save and verify persistence
   - Export/import configuration

2. **Validation and Error Handling**
   - Invalid configurations
   - Connection failures
   - Form validation
   - Error recovery

3. **Security Features**
   - Password encryption
   - Authentication checks
   - Permission validation

#### Email Processing Tests

1. **End-to-End Email Processing**
   - Configure email server
   - Start processing service
   - Process test emails
   - Verify transaction creation
   - Check manual review queue

2. **Error Scenarios**
   - Invalid email formats
   - Connection failures
   - Processing errors
   - Recovery procedures

3. **Performance Testing**
   - Batch processing
   - Large email volumes
   - Concurrent operations
   - Resource usage

#### IMAP Integration Tests

1. **Service Lifecycle**
   - Start/stop/restart service
   - Configuration changes
   - Health monitoring
   - Error recovery

2. **Real-time Processing**
   - Automatic email fetching
   - Status updates
   - Performance metrics
   - Log monitoring

## Manual Testing Procedures

### User Acceptance Testing (UAT)

#### Test Case 1: First-Time User Setup

**Objective**: Verify new user can successfully set up email processing

**Prerequisites**: Clean test environment, no existing configuration

**Steps**:
1. Navigate to application as new user
2. Go to Settings → Email Server
3. Enter valid IMAP credentials
4. Test connection (should succeed)
5. Configure AI services with valid API key
6. Save all configuration
7. Navigate to Email Management
8. Start email processing
9. Verify service starts successfully

**Expected Results**:
- All configuration saves successfully
- Connection tests pass
- Email processing service starts
- Dashboard shows "Running" status

**Pass/Fail Criteria**: All steps complete without errors

#### Test Case 2: Email Processing Workflow

**Objective**: Verify complete email-to-transaction workflow

**Prerequisites**: Valid email account with transaction emails

**Steps**:
1. Ensure email processing is running
2. Send test transaction email to configured account
3. Trigger manual processing
4. Wait for processing to complete
5. Check processing statistics
6. Navigate to Transactions
7. Verify new transaction was created
8. Check transaction details match email

**Expected Results**:
- Email is detected and processed
- Transaction created with correct details
- Processing statistics updated
- No errors in processing log

#### Test Case 3: Manual Review Queue

**Objective**: Test manual review functionality for ambiguous emails

**Prerequisites**: Email with unclear transaction details

**Steps**:
1. Send ambiguous transaction email
2. Trigger processing
3. Check manual review queue
4. Review pending item
5. Edit transaction details
6. Approve for processing
7. Verify transaction creation

**Expected Results**:
- Email routed to manual review
- Review interface allows editing
- Approval creates transaction
- Item removed from queue

### Regression Testing

#### Critical User Paths
1. **Configuration → Processing → Transactions**
   - Complete flow from setup to transaction creation
   - Verify no functionality broken by changes

2. **Error Recovery**
   - Connection failures and recovery
   - Processing errors and retry mechanisms
   - Data integrity during failures

3. **Performance Benchmarks**
   - Configuration loading < 2 seconds
   - Email processing < 10 seconds per email
   - UI responsiveness under load

#### Browser Compatibility
Test on supported browsers:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Performance Testing

### Load Testing Scenarios

#### Email Processing Load Test

**Scenario**: Process large batch of emails

**Setup**:
```bash
# Prepare test emails
npm run generate:test-emails --count=100

# Configure batch processing
BATCH_SIZE=20
PROCESSING_INTERVAL=30

# Run load test
npm run test:load:email-processing
```

**Metrics to Monitor**:
- Processing time per email
- Memory usage during processing
- CPU utilization
- Database query performance
- API response times

**Acceptance Criteria**:
- < 10 seconds per email average
- < 500MB memory usage peak
- < 80% CPU utilization
- No failed transactions

#### Concurrent User Test

**Scenario**: Multiple users configuring simultaneously

**Setup**:
```bash
# Start concurrent user simulation
npm run test:concurrent-users --users=10

# Monitor system resources
npm run monitor:system-resources
```

**Metrics**:
- Response time degradation
- Database connection pooling
- Session management
- Configuration conflicts

#### API Load Test

**Scenario**: High-frequency API calls

**Setup**:
```bash
# Run API stress test
npm run test:api-load --rps=100 --duration=300

# Monitor endpoint performance
npm run monitor:api-metrics
```

**Endpoints to Test**:
- Configuration CRUD operations
- Connection testing
- Status monitoring
- Log retrieval

### Performance Optimization

#### Database Optimization
1. **Query Performance**
   - Index usage analysis
   - Query execution plans
   - Connection pooling efficiency

2. **Data Volume Testing**
   - Large configuration datasets
   - Historical transaction data
   - Log retention policies

#### API Optimization
1. **Response Caching**
   - Configuration caching
   - Static resource caching
   - Database query caching

2. **Request Optimization**
   - Payload compression
   - Batched operations
   - Asynchronous processing

## Security Testing

### Authentication Testing

#### Test Cases
1. **Valid Authentication**
   - Correct credentials access
   - Session management
   - Token refresh

2. **Invalid Authentication**
   - Wrong credentials rejection
   - Expired session handling
   - Brute force protection

3. **Authorization Testing**
   - Role-based access control
   - Resource permissions
   - Cross-user data isolation

### Data Protection Testing

#### Encryption Verification
```bash
# Test data encryption
npm run test:encryption

# Verify sensitive data protection
npm run test:data-protection

# Check configuration security
npm run test:config-security
```

#### Security Scan
```bash
# Run security vulnerability scan
npm run security:scan

# Check dependencies for vulnerabilities
npm audit

# Test for common security issues
npm run test:security:owasp
```

### Penetration Testing

#### SQL Injection Testing
- Test all input fields
- Verify parameterized queries
- Check error message exposure

#### XSS Testing
- Test user input handling
- Verify output encoding
- Check for script injection

#### CSRF Testing
- Verify CSRF tokens
- Test state-changing operations
- Check referrer validation

## Test Data Management

### Test Data Creation

#### Configuration Test Data
```javascript
// Standard test configurations
const testConfigs = {
  email_server: {
    valid: {
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_username: 'test@gmail.com',
      imap_password: 'test-password'
    },
    invalid: {
      imap_host: '',
      imap_port: 70000,
      imap_username: 'invalid-email'
    }
  }
};
```

#### Email Test Data
```javascript
// Sample transaction emails
const sampleEmails = [
  {
    subject: 'Wealthsimple Transaction Confirmation',
    from: 'noreply@wealthsimple.com',
    content: 'Buy 10 shares of AAPL at $150.00...'
  }
];
```

### Test Data Cleanup

#### Automated Cleanup
```bash
# Clean test data after each test
npm run cleanup:test-data

# Reset test database
npm run reset:test-db

# Clear test caches
npm run clear:test-cache
```

#### Manual Cleanup Procedures
1. Delete test user accounts
2. Remove test configurations
3. Clear test transactions
4. Reset test email accounts

## Continuous Testing

### CI/CD Integration

#### GitHub Actions Workflow
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install
      - name: Run E2E tests
        run: npm run test:e2e:ci
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

#### Test Scheduling
```bash
# Daily regression tests
0 2 * * * npm run test:regression

# Weekly performance tests
0 3 * * 0 npm run test:performance

# Monthly security scans
0 4 1 * * npm run test:security
```

### Monitoring and Alerting

#### Test Failure Alerts
- Slack notifications for test failures
- Email alerts for critical test failures
- Dashboard monitoring for test trends

#### Performance Monitoring
- Track test execution times
- Monitor resource usage during tests
- Alert on performance regressions

### Test Maintenance

#### Regular Test Review
1. **Monthly Test Audit**
   - Review test coverage
   - Update test data
   - Remove obsolete tests
   - Add tests for new features

2. **Quarterly Test Strategy Review**
   - Evaluate test effectiveness
   - Update testing tools
   - Review performance benchmarks
   - Plan testing improvements

#### Test Documentation Updates
- Keep test procedures current
- Update expected results
- Document new test scenarios
- Maintain troubleshooting guides

---

**Last Updated**: March 2024  
**Version**: 2.0.0  
**Maintained By**: Development Team