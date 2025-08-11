# Suggested Commands for Investra AI Development

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests with Vitest
- `npm run preview` - Preview production build

## Pre-commit Requirements (MANDATORY)
Before any commit, these must all pass:
1. `npm run build` - Ensure TypeScript compilation succeeds
2. `npm run lint` - Run ESLint checks and fix any issues  
3. `npm run type-check` - Run TypeScript type checking

## Database/Backend
- Email server is in `server/` directory with separate package.json
- Uses Supabase for database operations
- Database types defined in `src/lib/database/types.ts`

## Testing
- Unit tests with Vitest
- E2E tests with Playwright
- Coverage with Vitest coverage-v8

## System Commands (macOS/Darwin)
- `ls` - List files
- `find` - Search for files  
- `grep` / `rg` (ripgrep) - Search in files
- `git` - Version control operations