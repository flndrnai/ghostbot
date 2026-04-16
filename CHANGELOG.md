# Changelog

All notable changes to GhostBot are documented here. Newest releases at the top.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are not yet tagged — dates are the merge date to `main`.

## [Unreleased] — 2026-04-16

### Security

Audit identified 10 vulnerabilities; all patched in this batch. See [SECURITY.md](SECURITY.md) for disclosure policy.

- **Fixed** — Command injection in `POST /api/projects/clone` via `git clone` shell call. Any authenticated user (including `user`-role) could run arbitrary shell commands via a `$(...)` substitution in the URL. Replaced with `execFile` array form + `fs.cp`/`fs.rm` + strict URL allowlist. ([3e17431](../../commit/3e17431))
- **Fixed** — GitHub webhook (`/api/github/webhook`) and Telegram webhook (`/api/telegram/webhook`) previously failed *open* when the configured secret was unset. Now fail closed with 503. ([8e7c5af](../../commit/8e7c5af))
- **Fixed** — Generic `/api/webhook/*` endpoint was fully unauthenticated, enabling command injection into admin-configured `{{body.*}}` templates. Now requires per-trigger `X-GhostBot-Signature` HMAC-SHA256. ([24e6aa0](../../commit/24e6aa0))
- **Fixed** — Cluster role webhook (`/api/clusters/[cid]/roles/[rid]/webhook`) was unauthenticated. Any POST to a known `roleId` launched a Docker agent-job container. Now requires `triggerConfig.webhookSecret` + matching HMAC + URL `clusterId` validation. ([5e92470](../../commit/5e92470))
- **Fixed** — Cluster server actions (`deleteCluster`, `updateClusterSystemPrompt`, etc.) only checked `requireAuth()`. User B could delete or poison User A's cluster via stored-prompt-injection. Added `requireClusterOwner` / `requireRoleOwner` helpers. ([5e92470](../../commit/5e92470))
- **Fixed** — Skills / memory / chat actions lacked ownership enforcement at the DB layer. Now filter on `id = ? AND user_id = ?`. ([e2a1c10](../../commit/e2a1c10))
- **Fixed** — `/stream/chat` accepted `providedChatId` without verifying ownership, letting user B inject messages into user A's chat history. ([e2a1c10](../../commit/e2a1c10))
- **Fixed** — `/api/crons` and `/api/triggers` leaked admin-only webhook/command config to any logged-in user. Now require `role === 'admin'`. ([e2a1c10](../../commit/e2a1c10))
- **Fixed** — `/public/*.svg` and other static assets were 307-redirected to `/login` for anonymous visitors because the middleware matcher only excluded `_next`, `favicon.ico`, and `/assets/*`. Fast-path skip for all static-file extensions. ([89d08c2](../../commit/89d08c2))

### Added

- **Setup wizard at `/setup`** — owner-only, first-visit auto-redirect, single-scroll 5-step flow (LLM / Docker / GitHub / Notifications / Done), re-openable from admin nav ([4dcb642...290956f](../../commits))
- **"Finish setup" banner** with permanent dismiss ([b1751ba](../../commit/b1751ba))
- **`t()` helper + `src/locales/<lang>.json`** — plain-JSON translation layer, no i18n library dependency ([b51633d](../../commit/b51633d))
- **Vitest test scaffolding** with 9 unit tests across 4 files ([5691886](../../commit/5691886))
- **`pingDocker()` helper** — lightweight socket-reachability + agent-image check for the wizard ([76ed1eb](../../commit/76ed1eb))
- **`owner` flag on NextAuth session** — propagated through JWT for owner-only route protection ([48c6247](../../commit/48c6247))

### Changed

- `saveAndTestSlack` now takes `{ botToken, channel }` (previously documented as `webhookUrl`; actual Slack integration is bot-token based — see `src/lib/admin/actions.js:236`)
- All wizard server actions wrap their body in `try/catch` and return `{ ok: false, error }` on throw
- Removed duplicate theme-toggle row from the sidebar footer (theme controls live only in the user-nav dropdown now) ([ef9c65e](../../commit/ef9c65e))

### Docs

- README comprehensively rewritten with Security section, hardening checklist, and updated feature list ([b4da45b](../../commit/b4da45b))
- `CLAUDE.md` refreshed: Phase 2.1 marked shipped, stale package-lock note removed, Security hardening follow-ups section added
- `SECURITY.md` added at repo root for responsible-disclosure signaling
- `GHOSTBOT_PROJECT_DETAILS.md` marked as `[ARCHIVE]` pre-implementation scoping doc

### Dependencies

- Bumped `engines.node` to `>=20.10.0` to use ES2025 import attributes in `src/lib/i18n.js` ([62555cf](../../commit/62555cf))
- Added `vitest` + `@vitest/coverage-v8` devDependencies

---

## [Phase 1 baseline] — 2026-04-15

Initial public release. Commit [6950f43](../../commit/6950f43).

- Public landing page at `/` with 8-feature grid
- `docker-compose.yml` + `.env.example` for one-command self-host
- Dokploy production deploy via `src/Dockerfile`
- GitHub repo polish — description, topics, social preview

---

## Pre-Phase 1

GhostBot was developed iteratively from October 2025 to April 2026 across ~100 commits before the first public release. Key features shipped in this period:

- Multi-LLM chat (Ollama direct + LangChain for cloud)
- Memory / RAG via `nomic-embed-text` + cosine search
- Four coding-agent Docker images (Aider, OpenCode, Codex, Gemini CLI)
- Cluster pipelines with one-click templates
- GitHub PR trigger (`/ghostbot` comments)
- Telegram + Slack notifications
- Multi-user invitations
- VS Code extension v0.2
- Project Connect (upload, clone, file-tree attach, CLAUDE.md injection)
- Autonomous Builder (LLM-planned multi-step jobs)
- AI Scanner (daily self-reflecting cron)
- AIOS / Skills (business context + `/skill-name` templates)
- 16-page admin panel

See commit history for the full incremental record.
