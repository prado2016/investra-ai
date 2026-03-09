# Architecture

## Runtime

The supported runtime is the root application in this repository:

- `src/` contains the React SPA
- `server/index.ts` starts the Hono API
- `server/auth.ts` configures `better-auth`
- `server/db/` contains the SQLite schema, migrations, and query helpers

There is no supported Supabase or standalone Express runtime in this repository anymore.

## Domain Model

- `portfolios` group user holdings
- `transactions` are the source of truth
- `positions` are derived from transactions
- `assets` normalize symbols and metadata
- `email_configs` store IMAP connection settings
- `email_logs` record email-import outcomes

## Request Flow

1. The SPA calls `/api/*` through the Vite proxy in development.
2. `better-auth` serves `/api/auth/*`.
3. Protected routes use `requireAuth`.
4. Route handlers call the thin query modules in `server/db/queries/`.
5. Position changes are recomputed in `server/lib/positions.ts`.

## Import Paths

- CSV import parses in the browser and posts normalized rows to `/api/import/csv`.
- Email import connects to IMAP, parses broker emails, writes transactions, and recalculates positions.

## Market Data

- Quotes come from Yahoo Finance through `/api/market/quotes`.
- Symbol search uses `/api/market/search`.
- `/api/assets/search` is an optional fallback path that can use Gemini when a `GEMINI_API_KEY` is configured.
