# Deployment

## Production Shape

- Single Node process for the API server
- Single SQLite database file
- Static frontend served by the Hono server in production
- Optional nginx reverse proxy in front of the app

## Important Constraints

- Run a single app instance. SQLite does not support the old multi-process API layout.
- Persist `DATABASE_URL` on durable storage outside the release directory.
- Set `BETTER_AUTH_SECRET` explicitly in production.

## Build and Run

```bash
npm install
npm run build
NODE_ENV=production npm run start
```

## Recommended Environment

```bash
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://your-app.example.com
DATABASE_URL=/opt/investra/data/investra.db
BETTER_AUTH_URL=https://your-app.example.com
BETTER_AUTH_SECRET=replace-this-with-a-random-secret
GEMINI_API_KEY=
```

## PM2

Use the root [`ecosystem.config.cjs`](../ecosystem.config.cjs) file. It is configured for a single instance because the application writes to SQLite.
