# CI/CD Pipeline Documentation

This document describes the comprehensive CI/CD pipeline setup for the Stock Tracker application.

## Overview

The CI/CD pipeline consists of multiple automated workflows that ensure code quality, run tests, generate coverage reports, perform security scans, and handle deployments.

## Workflows

### 1. Main CI/CD Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Code Quality & Linting
- Runs ESLint for code style consistency
- Performs TypeScript type checking
- Ensures code meets quality standards

#### Test Suite
- **Unit Tests**: Fast-running isolated component tests
- **Integration Tests**: Service interaction and data flow tests
- **E2E Tests**: Full application workflow testing with Playwright
- Matrix strategy runs different test suites in parallel

#### Coverage Analysis
- Generates comprehensive test coverage reports
- Enforces 70% minimum coverage threshold across all metrics
- Uploads reports to Codecov for tracking
- Posts coverage summary as PR comments
- Fails CI if coverage drops below thresholds

#### Security Scan
- Runs `npm audit` for dependency vulnerabilities
- Performs CodeQL static analysis for security issues
- Scans for common security patterns and vulnerabilities

#### Build Verification
- Tests builds for multiple environments (development, staging, production)
- Validates build artifacts and output structure
- Ensures deployable artifacts are generated

#### Deployment
- Automatically deploys to staging on `main` branch pushes
- Includes health checks and deployment verification
- Only runs after all quality gates pass

#### Performance Testing
- Runs Lighthouse CI for performance metrics
- Tests accessibility, best practices, and SEO
- Generates performance reports for PRs

### 2. Pull Request Checks (`.github/workflows/pr-checks.yml`)

**Triggers:**
- Pull request opened, synchronized, or marked ready for review

**Features:**
- Quick validation with fast unit tests
- PR title validation (conventional commits)
- Large file detection (prevents accidentally committing large files)
- Commit message linting
- Coverage comparison between PR and base branch
- Posts detailed coverage comparison comments

### 3. Release Pipeline (`.github/workflows/release.yml`)

**Triggers:**
- Git tags matching `v*` pattern
- Manual workflow dispatch with version input

**Process:**
1. **Validate Release**: Full test suite + production build
2. **Create Release**: Generate changelog and GitHub release
3. **Build Assets**: Create distributable archives and coverage reports
4. **Deploy Production**: Automated production deployment with verification

## Configuration Files

### CommitLint (`.commitlintrc.json`)
Enforces conventional commit message format:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Maintenance tasks

### Lighthouse CI (`lighthouserc.js`)
Performance testing configuration:
- **Performance**: 80% minimum score
- **Accessibility**: 90% minimum score (error threshold)
- **Best Practices**: 80% minimum score
- **SEO**: 80% minimum score

### CodeQL (`.github/codeql/codeql-config.yml`)
Security scanning configuration:
- Enables security and quality queries
- Excludes test files and build artifacts
- Focuses on source code in `src/` directory

## Quality Gates

### Code Quality
- ✅ ESLint passes with no errors
- ✅ TypeScript compilation successful
- ✅ All tests pass (unit, integration, e2e)

### Coverage Thresholds
- ✅ Statements: ≥70%
- ✅ Branches: ≥70%
- ✅ Functions: ≥70%
- ✅ Lines: ≥70%

### Security
- ✅ No high/critical npm audit vulnerabilities
- ✅ CodeQL security scan passes
- ✅ No large files committed

### Performance
- ✅ Lighthouse performance score ≥80%
- ✅ Accessibility score ≥90%
- ✅ Build size within acceptable limits

## Deployment Strategy

### Environments

1. **Development**
   - Automatic deployment on feature branch pushes
   - Used for development and testing

2. **Staging**
   - Automatic deployment on `main` branch pushes
   - Production-like environment for final testing
   - All quality gates must pass

3. **Production**
   - Manual deployment via release process
   - Triggered by Git tags or manual workflow
   - Includes comprehensive validation and rollback capabilities

### Deployment Process

1. **Pre-deployment**
   - All tests pass
   - Coverage thresholds met
   - Security scans clear
   - Build verification successful

2. **Deployment**
   - Atomic deployment process
   - Health checks during deployment
   - Automatic rollback on failure

3. **Post-deployment**
   - Health checks and smoke tests
   - Performance monitoring
   - User notification (if configured)

## Artifacts and Reports

### Generated Artifacts
- **Build artifacts**: Distributable application files
- **Test results**: Detailed test execution reports
- **Coverage reports**: HTML, JSON, and LCOV formats
- **Lighthouse reports**: Performance and accessibility metrics
- **Security scan results**: Vulnerability assessments

### Retention Policies
- Test results: 7 days
- Coverage reports: 30 days
- Build artifacts: 14 days
- Release assets: Permanent

## Monitoring and Notifications

### Status Checks
- All workflows report status to GitHub
- Required status checks prevent merging failing PRs
- Branch protection rules enforce quality gates

### Notifications
- PR comments with coverage comparisons
- Release notifications
- Deployment status updates
- Security vulnerability alerts

## Customization

### Environment Variables
Set these in GitHub repository secrets:
- `CODECOV_TOKEN`: For coverage report uploads
- `DEPLOYMENT_KEY`: For deployment authentication
- Custom environment variables for different environments

### Workflow Customization
- Modify coverage thresholds in workflow files
- Adjust performance budgets in Lighthouse config
- Add custom deployment commands
- Configure notification webhooks

## Troubleshooting

### Common Issues

**Build Failures**
1. Check dependency issues: `npm audit`
2. Verify TypeScript compilation: `npm run type-check`
3. Review test failures in workflow logs

**Coverage Issues**
1. Run coverage locally: `npm run test:coverage`
2. Check excluded files in `vite.config.ts`
3. Add tests for uncovered code paths

**Deployment Failures**
1. Verify build artifacts exist
2. Check deployment credentials
3. Review health check endpoints

**Performance Issues**
1. Run Lighthouse locally: `npx lhci autorun`
2. Check bundle size and optimization
3. Review performance budget settings

## Security Considerations

- All secrets stored in GitHub repository secrets
- CodeQL scans for security vulnerabilities
- Dependency vulnerability scanning with npm audit
- Branch protection prevents direct pushes to main
- Required status checks ensure quality gates
- Deployment requires manual approval for production

## Best Practices

1. **Always use conventional commits** for clear changelog generation
2. **Write comprehensive tests** to maintain coverage thresholds
3. **Review security scan results** and address vulnerabilities promptly
4. **Monitor performance metrics** and optimize when necessary
5. **Test deployment process** in staging before production releases
6. **Keep dependencies updated** to avoid security vulnerabilities
7. **Document any custom deployment requirements** in environment-specific configs

This CI/CD pipeline ensures high code quality, comprehensive testing, security compliance, and reliable deployments for the Stock Tracker application.
