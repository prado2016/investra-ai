# Development

## Prerequisites

- Node.js 18+
- npm 8+

## Setup

1. Copy `.env.example` to `.env`.
2. Set `BETTER_AUTH_SECRET` to a strong random value.
3. Run `npm install`.
4. Run `npm run dev`.

## Environment

Current server-side variables:

- `PORT`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GEMINI_API_KEY` (optional)

Vite reads `.env` automatically for any future `VITE_*` variables, but the current app does not require any tracked frontend-only secrets.

## Verification

- `npm run type-check`
- `npm run build`

## Data

The default database path is `./data/investra.db`. The database files are intentionally ignored by git.
