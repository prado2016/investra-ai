# Investra AI — Complete Redesign Plan

## TL;DR

Strip 80% of the complexity. **No cloud dependencies.** Keep the core value:
**track trades, see P&L, import from broker** — all running locally.

---

## Core Features (unchanged)

1. **Auth** — email/password, local sessions
2. **Portfolios** — create, select, delete
3. **Transactions** — manual entry, edit, delete (buy/sell/dividend/options)
4. **Positions** — derived holdings with live prices
5. **P&L** — unrealized, realized, daily change
6. **Market Data** — Yahoo Finance quotes (in-memory cache)
7. **CSV Import** — parse broker exports → transactions
8. **Email Import** — IMAP pull from broker, AI-parsed
9. **AI Symbol Lookup** — Gemini Flash only
10. **Dashboard** — portfolio value, P&L, top holdings

---

## Tech Stack

### Replace

| Out | In | Why |
|---|---|---|
| **Supabase** (DB + Auth) | **SQLite** + **better-auth** | Zero cloud dependency, single file DB |
| **Styled Components** | **Tailwind CSS v4** | No runtime, faster builds |
| Custom context providers (×8) | **Zustand** (2 stores) | Flat, predictable state |
| `supabaseService.ts` (2,500 lines) | `server/db/` thin modules | One function = one query |
| Complex AI provider system | **`lib/gemini.ts`** (single file) | No factory, no health monitor |
| Recharts | Plain numbers + CSS bars | YAGNI |
| `@sentry/react` | Nothing | Out of scope |

### Keep

| Package | Role |
|---|---|
| React 19 + TypeScript + Vite | Frontend |
| **Hono** (new) | Backend API server (replaces raw Express) |
| **Drizzle ORM** (new) | Type-safe SQLite queries + migrations |
| **better-auth** (new) | Local email/password auth |
| **TanStack Query v5** (new) | Server state — replaces custom hooks |
| `yahoo-finance2` | Market data |
| `imapflow` + `mailparser` | Email parsing (server only) |
| `@google/generative-ai` | Gemini AI |
| `zod` | Validation |
| `lucide-react` | Icons |
| `date-fns` | Date formatting |
| `react-router-dom` | Routing |

---

## Architecture

```
investra-ai/
  src/                    # React frontend
    features/
      dashboard/            Dashboard.tsx
      transactions/         TransactionsPage.tsx, TransactionForm.tsx
      positions/            PositionsPage.tsx
      import/               ImportPage.tsx, CsvImport.tsx, EmailImport.tsx
      settings/             SettingsPage.tsx
      auth/                 LoginPage.tsx
    components/             # ~15 pure UI atoms
      Button, Input, Select, Modal, Table, Badge, Spinner, Alert, Layout
    lib/
      apiClient.ts          # fetch() wrapper for /api calls
      yahoo.ts              # market data fetcher (client-side proxy)
    stores/
      authStore.ts          # user session (Zustand)
      portfolioStore.ts     # active portfolio (Zustand)
    types/
      index.ts              # all shared types
    utils/
      pl.ts                 # P&L calculations
      format.ts             # number/date formatters
      csvParser.ts          # CSV parsing
    App.tsx
    main.tsx

  server/                 # Hono API server (Node.js)
    index.ts              # server entry, mounts all routers
    auth.ts               # better-auth handler
    routes/
      portfolios.ts         # GET/POST/DELETE /api/portfolios
      transactions.ts       # CRUD /api/transactions
      positions.ts          # GET /api/positions (computed)
      assets.ts             # GET /api/assets/search
      market.ts             # GET /api/market/quotes (proxies Yahoo)
      import.ts             # POST /api/import/csv, /api/import/email-sync
      settings.ts           # GET/PUT /api/settings
    db/
      schema.ts             # Drizzle table definitions
      client.ts             # SQLite connection singleton
      migrations/           # SQL migration files (drizzle-kit)
      queries/
        portfolios.ts
        transactions.ts
        positions.ts
        assets.ts
        emailConfigs.ts
    lib/
      gemini.ts             # symbol lookup
      emailProcessor.ts     # IMAP fetch + parse
      emailParser.ts        # extract transaction data from email text
      positions.ts          # position recalculation logic

  shared/
    types.ts                # types shared between client and server

  data/                   # gitignored — local SQLite files
    investra.db

  drizzle.config.ts       # Drizzle migration config
  package.json            # unified (or split client/server)
  vite.config.ts          # proxies /api → Hono server in dev
```

---

## Database Schema (Drizzle + SQLite)

```typescript
// server/db/schema.ts

users             id, email, name, passwordHash, createdAt
sessions          id, userId, expiresAt, token         ← better-auth manages
portfolios        id, userId, name, currency, isDefault, createdAt
assets            id, symbol, name, assetType, exchange, currency
transactions      id, portfolioId, assetId, type, quantity, price,
                  fees, date, notes, strikePrice, expirationDate,
                  optionType, source, createdAt
positions         id, portfolioId, assetId, quantity, avgCostBasis,
                  realizedPl, updatedAt
emailConfigs      id, userId, provider, imapHost, imapPort,
                  emailAddress, encryptedPassword, defaultPortfolioId
```

`fund_movements` → folded into `transactions` (type: `transfer_in` / `transfer_out`)

---

## Auth Design (better-auth)

- Email + password only
- Sessions stored in SQLite (`sessions` table)
- `better-auth` generates the auth routes: `POST /api/auth/sign-in`, `POST /api/auth/sign-up`, `POST /api/auth/sign-out`
- Frontend uses `better-auth/react` client for session management
- No Supabase Auth, no JWT to manage manually

---

## Dev Setup

```bash
# Two processes in dev:
npm run dev        # Vite (port 5173) — proxies /api → :3001
npm run dev:api    # Hono server (port 3001) with tsx --watch

# Database
npm run db:generate   # drizzle-kit generate
npm run db:migrate    # drizzle-kit migrate
npm run db:studio     # drizzle-kit studio (visual DB browser)

# Production
npm run build         # tsc + vite build
npm run start         # node server/index.js (serves static + API)
```

Vite proxy config (dev only):
```typescript
// vite.config.ts
server: { proxy: { '/api': 'http://localhost:3001' } }
```

---

## State Architecture

### Zustand (client state only)

```typescript
// authStore.ts — wraps better-auth client
{ user, isLoading, signIn, signOut }

// portfolioStore.ts
{ portfolios, activePortfolioId, setActive }
```

### TanStack Query (server state)

```typescript
// Every page owns its own data
const { data: transactions } = useQuery({
  queryKey: ['transactions', portfolioId],
  queryFn: () => api.get(`/transactions?portfolioId=${portfolioId}`)
})

const createTx = useMutation({
  mutationFn: api.post('/transactions'),
  onSuccess: () => queryClient.invalidateQueries(['transactions'])
})
```

No global loading state. No manual cache invalidation logic.

---

## What We Remove (files to delete)

- All of `src/services/` (26 files, 8,000+ lines)
- All of `src/contexts/` (8 context providers)
- All of `src/hooks/` > keep only what TanStack Query doesn't cover (~5 hooks)
- `src/components/` — keep ~5 generic ones, delete 60+
- `src/pages/` — rebuild from scratch (6 pages)
- `src/lib/supabase.ts` and all Supabase usage

---

## Packages to Add

```bash
npm install hono @hono/node-server drizzle-orm better-sqlite3 better-auth \
  @tanstack/react-query zustand tailwindcss@next @tailwindcss/vite

npm install -D drizzle-kit @types/better-sqlite3 tsx
```

## Packages to Remove

```bash
npm uninstall @supabase/supabase-js styled-components @types/styled-components \
  recharts @sentry/react @sentry/vite-plugin @peculiar/webcrypto
```

---

## Pages (6 routes)

| Route | Page | Key Content |
|---|---|---|
| `/` | Dashboard | Total value, daily P&L, top positions table |
| `/transactions` | Transactions | Sortable table + Add/Edit modal |
| `/positions` | Positions | Holdings table with live prices + P&L |
| `/import` | Import | CSV tab + Email sync tab |
| `/settings` | Settings | Email IMAP config, AI API key |
| `/login` | Login | Sign in / Sign up form |

---

## Implementation Phases

### Phase 1 — Backend Foundation
1. Install new packages, remove old ones
2. `server/db/schema.ts` — Drizzle schema (all tables)
3. `server/db/client.ts` — SQLite singleton
4. Run `db:migrate` to create `data/investra.db`
5. `server/auth.ts` — better-auth setup
6. `server/index.ts` — Hono app, mount auth + routes
7. `server/routes/` — all 7 route files (thin, call db queries)
8. `server/db/queries/` — all query modules

### Phase 2 — Server Features
9. `server/lib/gemini.ts` — symbol lookup
10. `server/lib/emailProcessor.ts` + `emailParser.ts` — simplified IMAP
11. `server/routes/import.ts` — CSV + email import endpoints
12. `server/lib/positions.ts` — recalculate positions from transactions

### Phase 3 — Frontend Foundation
13. Remove Styled Components, install Tailwind v4
14. `src/components/` — 15 UI atoms (Tailwind-based)
15. `src/lib/apiClient.ts` — typed fetch wrapper
16. `src/stores/` — authStore + portfolioStore
17. `src/App.tsx` — clean router + TanStack Query provider
18. `src/pages/auth/LoginPage.tsx`

### Phase 4 — Feature Pages
19. Dashboard
20. Transactions page + form
21. Positions page
22. Import page (CSV + Email)
23. Settings page

### Phase 5 — Cleanup
24. Delete all old files (services, contexts, old components, old hooks)
25. `npm run build && npm run lint && npm run type-check` — all green
26. Update `package.json` scripts

---

## File Count Target

| Area | Current | Target |
|---|---|---|
| Components | 74 | ~15 |
| Hooks | 28 | ~5 |
| Services/Contexts | 34 | 0 |
| Pages | 15 | 6 |
| Server modules | ~10 | ~15 (new, clean) |
| **Total** | **~188** | **~55** |
