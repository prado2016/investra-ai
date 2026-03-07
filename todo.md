# CI/CD Workflow Issues

## Current Problems

### 1. esbuild Version Conflict Between CI and Deploy Jobs

**Symptom:** The deploy job fails with an esbuild binary mismatch error after installing dependencies on the self-hosted runner.

**Root Cause:** The `ci` job runs on `ubuntu-latest` (GitHub-hosted runner) and the `deploy` job runs on `self-hosted` (the production VM). When `actions/setup-node` was present in the deploy job, it created a node environment inconsistent with the host node version, causing native binaries like `esbuild` to be compiled for the wrong platform/ABI.

**Fix Applied:** Removed `actions/setup-node` from the deploy job so it uses the VM's native Node.js directly. Added `npm cache clean --force` before `npm ci` to ensure a clean install.

**Status:** Workaround in place — needs a more robust long-term solution.

---

### 2. npm Cache Miss on Self-Hosted Runner

**Symptom:** Deploy job fails or uses stale packages when the npm cache on the self-hosted runner is outdated or corrupted.

**Root Cause:** The self-hosted runner persists state between runs. The `npm ci` with `--prefer-offline` flag was hitting a stale cache that didn't match the current `package-lock.json`, causing install failures.

**Fix Applied:** Removed `--prefer-offline` and added `npm cache clean --force` before `npm ci` in the deploy job.

**Status:** Workaround in place — increases deploy time since cache is always cleared.

---

### 3. Native Module Compilation (better-sqlite3)

**Symptom:** `better-sqlite3` crashes at runtime on the VM after being built in CI.

**Root Cause:** Native Node.js modules must be compiled for the exact platform, OS, and Node.js ABI they will run on. The CI job (ubuntu-latest, GitHub-hosted) cannot produce a valid binary for the production VM.

**Fix Applied:** The deploy job does its own `npm ci` directly on the self-hosted runner so native modules are compiled in-place for the correct target.

**Status:** Correctly handled — the two-runner approach is intentional.

---

### 4. Artifact Hand-off Between GitHub-Hosted and Self-Hosted Runners

**Symptom:** The deploy job downloads the `frontend-dist` artifact built in the CI job (different runner), which adds latency and can fail if artifact upload/download is slow or unavailable.

**Root Cause:** The CI job produces the frontend build on a GitHub-hosted runner and uploads it as an artifact. The deploy job then downloads it onto the self-hosted runner. This cross-runner artifact transfer is fragile.

**Potential Fix:** Consider rebuilding the frontend directly on the self-hosted runner (if Node.js is available), or cache the artifact more aggressively. Alternatively, run the entire pipeline on the self-hosted runner.

**Status:** Open — no fix applied yet.

---

## Summary Table

| Issue | Status | Priority |
|---|---|---|
| esbuild version conflict | Workaround applied | Medium |
| npm cache miss on self-hosted runner | Workaround applied | Medium |
| Native module compilation | Fixed (by design) | Resolved |
| Artifact hand-off fragility | Open | Low |
