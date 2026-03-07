# CI/CD Workflow Issues

## Resolved Issues

### 1. esbuild Version Conflict Between CI and Deploy Jobs

**Symptom:** The deploy job fails with an esbuild binary mismatch error: `Expected "0.18.20" but got "0.25.5"`.

**Root Cause:** `drizzle-kit` depends on `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild@0.18.20`. During `npm ci` on the self-hosted runner, the old esbuild's install script validates its binary by running `esbuild --version`, but finds the globally installed esbuild (from global tsx) instead of the local one, causing a version mismatch crash.

**Fix Applied:** Added npm `overrides` in `package.json` to force `@esbuild-kit/core-utils` to use `esbuild@^0.25.0` (matching drizzle-kit's own version), eliminating the nested old esbuild entirely. Also updated `ecosystem.config.cjs` to use `./node_modules/.bin/tsx` instead of the global `tsx`, so the global installation is no longer needed.

**Status:** Resolved.

---

### 2. npm Cache Miss on Self-Hosted Runner

**Symptom:** Deploy job fails or uses stale packages when the npm cache on the self-hosted runner is outdated or corrupted.

**Root Cause:** The self-hosted runner persists state between runs. The `npm ci` with `--prefer-offline` flag was hitting a stale cache that didn't match the current `package-lock.json`, causing install failures. The workaround of `npm cache clean --force` before every install was wasteful.

**Fix Applied:** Removed both `--prefer-offline` and `npm cache clean --force` from the deploy job. Plain `npm ci` works correctly — it always installs exactly what's in the lockfile, fetching from the registry as needed and populating the cache naturally.

**Status:** Resolved.

---

### 3. Native Module Compilation (better-sqlite3)

**Symptom:** `better-sqlite3` crashes at runtime on the VM after being built in CI.

**Root Cause:** Native Node.js modules must be compiled for the exact platform, OS, and Node.js ABI they will run on. The CI job (ubuntu-latest, GitHub-hosted) cannot produce a valid binary for the production VM.

**Fix Applied:** The deploy job does its own `npm ci` directly on the self-hosted runner so native modules are compiled in-place for the correct target.

**Status:** Resolved (by design).

---

### 4. Artifact Hand-off Between GitHub-Hosted and Self-Hosted Runners

**Symptom:** The deploy job downloaded the `frontend-dist` artifact built in the CI job (different runner), adding latency and fragility from cross-runner artifact transfer.

**Root Cause:** The CI job produced the frontend build on a GitHub-hosted runner and uploaded it as an artifact. The deploy job then downloaded it onto the self-hosted runner. This was unnecessary since the deploy job already runs `npm ci` (full install with build tools available).

**Fix Applied:** Removed artifact upload from CI job and artifact download from deploy job. The deploy job now builds the frontend directly on the self-hosted runner after `npm ci`. CI job still validates the build on GitHub-hosted runner as a gate check.

**Status:** Resolved.

---

## Summary Table

| Issue | Status |
|---|---|
| esbuild version conflict | Resolved (npm overrides) |
| npm cache miss on self-hosted runner | Resolved (plain npm ci) |
| Native module compilation | Resolved (by design) |
| Artifact hand-off fragility | Resolved (build on VM) |
