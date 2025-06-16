# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
```bash
npm run dev                    # Start development server (port 5173)
npm run build                  # Build for production (TypeScript check + Vite build)
npm run build:staging          # Build for staging environment
npm run lint                   # Run ESLint
npm run lint:fix               # Run ESLint with auto-fix
npm run type-check             # TypeScript type checking only
npm run preview                # Preview production build
```

### Testing
```bash
npm run test                   # Run unit tests with Vitest
npm run test:run               # Run unit tests once (CI mode)
npm run test:coverage          # Run tests with coverage report
npm run test:ui                # Run tests with UI interface
npm run test:watch             # Run tests in watch mode
npm run test:unit              # Run specific unit tests
npm run test:integration       # Run integration tests
npm run test:e2e               # Run end-to-end tests with Playwright
npm run test:e2e:ci            # Run E2E tests in CI mode
npm run test:e2e:ui            # Run E2E tests with Playwright UI
npm run test:e2e:headed        # Run E2E tests in headed mode
npm run test:all               # Run all tests (unit + E2E)
```

### Task Management
The project uses Taskmaster for structured task management:
```bash
task-master list               # List all tasks
task-master next               # Show next available task
task-master show <id>          # Show specific task details
task-master set-status --id=<id> --status=done  # Mark task complete
```

## High-Level Architecture

### Core Technology Stack
- **Frontend**: React 19 with TypeScript and Vite
- **Styling**: CSS with custom design system and styled-components
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI Integration**: Google Generative AI (Gemini) for symbol lookup and analytics
- **Finance Data**: Yahoo Finance API with custom browser service
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **State Management**: React Context providers for different concerns

### Application Structure

#### Context Architecture
The app uses a layered context provider pattern for state management:
1. **AuthProvider** - User authentication and session management
2. **DebugProvider** - Development and debugging state
3. **OfflineProvider** - Network status and offline capabilities
4. **RealtimeProvider** - Supabase realtime subscriptions
5. **ThemeProvider** - Light/dark theme management
6. **NotificationProvider** - Toast notifications system
7. **LoadingProvider** - Global loading state management
8. **PortfolioProvider** - Portfolio-specific data and operations

#### Service Layer Architecture
Services are organized in `/src/services/` with clear separation of concerns:

- **AI Services** (`/ai/`): Modular AI integration with manager pattern
  - `aiServiceManager.ts` - Central manager for AI services
  - `geminiService.ts` - Google Generative AI implementation
  - `baseAIService.ts` - Abstract base for AI services
  - `enhancedSymbolParser.ts` - AI-powered symbol parsing

- **Analytics Services** (`/analytics/`): Financial calculations and metrics
  - `dailyPLService.ts` - Daily profit/loss calculations
  - `totalReturnService.ts` - Total return analytics

- **Email Services** (`/email/`): Email processing for transaction import
  - `wealthsimpleEmailParser.ts` - Wealthsimple email processing
  - `emailProcessingService.ts` - General email processing
  - `portfolioMappingService.ts` - Portfolio mapping logic

- **Data Services**: Database and storage abstractions
  - `supabaseService.ts` - Supabase operations wrapper
  - `offlineStorageService.ts` - Offline data persistence
  - `storageService.ts` - Browser storage utilities

#### Database Schema
PostgreSQL schema with comprehensive financial data modeling:
- **profiles** - User profile data extending Supabase auth
- **portfolios** - Investment portfolio containers
- **assets** - Financial instruments (stocks, options, ETFs, etc.)
- **positions** - Current holdings with cost basis tracking
- **transactions** - All financial transactions with full audit trail
- **price_data** - Historical price data cache

Key features:
- Full RLS (Row Level Security) implementation
- ACID-compliant transaction handling
- Automatic timestamp triggers
- Comprehensive indexing for performance
- Support for complex asset types (stocks, options, REITs, crypto)

#### Component Architecture
- **UI Components** (`/components/ui/`): Reusable design system components
- **Business Components**: Feature-specific components with clear boundaries
- **Page Components** (`/pages/`): Top-level route components
- **Context-Aware Components**: Components that consume specific contexts

### Key Development Patterns

#### Error Handling
- Global error boundary with debug integration
- Service-level error tracking with `ErrorTracker`
- Network-aware error handling for offline scenarios
- Supabase error handling with proper user feedback

#### State Management
- Context providers for domain-specific state
- Custom hooks for context consumption
- Local storage integration for persistence
- Realtime subscription management

#### API Integration
- Centralized API key management via `apiKeyService`
- Yahoo Finance integration with CORS proxy
- Supabase client singleton pattern
- Rate limiting and circuit breaker patterns

#### AI Integration
- Service manager pattern for multiple AI providers
- Fallback mechanisms for AI service failures
- Enhanced symbol parsing with context awareness
- Research-backed task expansion capabilities

### Development Workflow

#### Task-Driven Development
This project follows a structured task-driven approach using Taskmaster:
1. Tasks are defined in `.taskmaster/tasks/tasks.json`
2. Use `task-master next` to identify next work item
3. Use `task-master expand --id=<id>` to break down complex tasks
4. Mark tasks complete with `task-master set-status`

#### Testing Strategy
- **Unit Tests**: Business logic and utilities testing
- **Integration Tests**: Service layer integration testing
- **E2E Tests**: Full user workflow testing with Playwright
- **Coverage Requirements**: 70% minimum across all metrics

#### Code Quality
- ESLint configuration with TypeScript support
- Automatic formatting and linting
- Type checking before builds
- Pre-commit hooks for quality gates

### Email Server Infrastructure
Includes complete email server setup for processing financial transaction emails:
- Docker-based mail server with Postfix/Dovecot
- Automated email parsing for Wealthsimple transactions
- IMAP integration for email processing
- Security features including TLS/SSL and Fail2Ban

### Environment Configuration
Development environment uses:
- Vite dev server on port 5173
- Supabase for backend services
- Local storage for offline capabilities
- Environment variables for API keys and configuration

### Performance Considerations
- Code splitting with manual chunks for large dependencies
- Lazy loading of non-critical components
- Optimized bundle size with tree shaking
- Database query optimization with proper indexing
- Realtime subscription lifecycle management

### Security Implementation
- Row Level Security (RLS) on all database tables
- API key encryption and secure storage
- CORS configuration for API integrations
- Input validation and sanitization
- Secure email server configuration