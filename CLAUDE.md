## Project Context

This file helps Claude understand your project better and remember important configurations.

## Pre-commit Rules

**MANDATORY**: Before any commit, Claude must run:
1. `npm run build` - Ensure TypeScript compilation succeeds
2. `npm run lint` - Run ESLint checks and fix any issues
3. `npm run type-check` - Run TypeScript type checking

These commands must all pass successfully before committing any changes. If any command fails, fix the issues before proceeding with the commit.