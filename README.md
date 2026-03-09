# Investra

Investra is a local-first portfolio tracker built with React, Hono, SQLite, and Drizzle.

## Stack

- React 19 + Vite
- Hono API server
- SQLite via `better-sqlite3`
- Drizzle ORM
- `better-auth` for email/password auth
- Yahoo Finance for quotes
- IMAP + `mailparser` for broker email import

## Project Layout

```text
src/         frontend SPA
server/      Hono API, auth, database queries, import logic
docs/        current project documentation
scripts/     deployment/bootstrap helpers still in use
data/        local SQLite database files (gitignored)
```

## Local Development

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to the Hono server on `http://localhost:3001`.

## Commands

- `npm run dev` starts frontend and API together
- `npm run build` builds the server and frontend
- `npm run start` runs the compiled server from `dist-server/`
- `npm run type-check` runs TypeScript checks
- `npm run db:generate` creates Drizzle migrations
- `npm run db:migrate` applies migrations

## Docs

- [Architecture](./docs/architecture.md)
- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
