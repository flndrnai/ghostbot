# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Contact options, in order of preference:

1. **GitHub private security advisory** — use the Security tab on the repo and click "Report a vulnerability". This is the fastest and most secure channel.
2. **Email** the maintainer address listed on the [repo's GitHub profile](https://github.com/flndrnai).

We aim to acknowledge reports within **72 hours** and provide a triage assessment within **7 days**.

## Scope

GhostBot is a self-hosted AI coding agent platform. Security reports in scope:

- Authentication / authorization bypass (NextAuth, role checks, invitation flow)
- Remote code execution (command injection, deserialization, subprocess spawning)
- Cross-tenant data leakage (one user reading/modifying another user's resources)
- Webhook signature bypass (GitHub PR triggers, Telegram, generic `/api/webhook/*`)
- Path traversal in the Project Connect file-system API
- Encryption-at-rest weaknesses (AES-256-GCM / PBKDF2 key derivation)
- Docker socket escape / privilege escalation via agent containers
- Sensitive data exposure (secrets in responses, headers, logs)

Out of scope:

- Denial-of-service / resource exhaustion — GhostBot is intended for single-tenant trusted-admin deployments
- Self-XSS that requires the user to paste attacker-supplied content into their own browser console
- Reports assuming an attacker already has `AUTH_SECRET` or database access
- Issues in third-party dependencies that are not reachable by GhostBot code paths

## Threat model

GhostBot is **designed to run inside your own perimeter** — a personal VPS, a home server, or a small trusted team's deployment. It is **not hardened for public multi-tenant hosting.**

Assumptions:

- Admins (`role: 'admin'`, `owner: 1`) are fully trusted
- Invited users (`role: 'user'`) should have no access to other users' data, admin config, or the Docker socket
- The Docker host is single-tenant to the admin(s)
- `AUTH_SECRET` is kept secret — it's the root of all encryption

Anything that breaks the second assumption (cross-tenant access from a `user`-role account to another user's resources) is in scope and will be treated as a priority issue.

## What ships enabled by default

### Authentication & sessions
- Password hashing: bcrypt
- Sessions: NextAuth v5 JWT with `role` + `owner` claims propagated end-to-end
- CSRF: handled by NextAuth on auth forms; server actions protected by Next.js's built-in origin check
- Middleware (`src/proxy.js`, Next 16 convention) gates every route: public vs admin-only vs owner-only
- First-run wizard redirect for the owner, cookie-gated to fire exactly once per browser profile

### Secret storage
- At-rest encryption: AES-256-GCM with per-value IV + auth tag
- Key derivation: PBKDF2-SHA256 from `ENCRYPTION_KEY` if set, falling back to `AUTH_SECRET` (one-time startup warning logs)
- Split-key support means rotating `AUTH_SECRET` (sessions) no longer forces re-encrypting the secrets table

### Multi-tenant isolation
- Server actions on clusters, cluster roles, skills, and memory entries enforce ownership at the DB layer (`WHERE id = ? AND user_id = ?`), not only at the app layer
- `requireClusterOwner` / `requireRoleOwner` helpers throw a generic "not found" on either missing or foreign resource, preventing existence probing
- `/stream/chat` verifies any caller-provided `chatId` belongs to the session user before accepting messages
- Owner-only routes (`/setup`) gated by `session.user.owner === 1` in both middleware and page server component

### Webhook receivers — all fail closed
- GitHub (`/api/github/webhook`): HMAC-SHA256, constant-time compare. Returns 503 if `GITHUB_WEBHOOK_SECRET` unset, 403 if signature header missing
- Telegram (`/api/telegram/webhook`): same pattern on `TELEGRAM_WEBHOOK_SECRET`
- Generic (`/api/webhook/*`): per-trigger HMAC with `X-GhostBot-Signature: sha256=<hex>`. Triggers without a `secret` field in `triggers.json` are ignored
- Cluster role (`/api/clusters/[cid]/roles/[rid]/webhook`): per-role HMAC via `role.triggerConfig.webhookSecret`. URL `clusterId` must also match the role's actual cluster

### Docker socket sandboxing
- Default `docker-compose.yml` does NOT bind-mount `/var/run/docker.sock` into the app container
- Instead, a `tecnativa/docker-socket-proxy` sidecar mounts the socket read-only and exposes a restricted API allowlist over `tcp://docker-proxy:2375`
- Allowlist: `CONTAINERS`, `IMAGES`, `NETWORKS`, `EXEC`, `POST`, `DELETE`. Everything else (AUTH/BUILD/COMMIT/CONFIGS/DISTRIBUTION/EVENTS/INFO/NODES/PLUGINS/SECRETS/SERVICES/SESSION/SWARM/SYSTEM/TASKS/VOLUMES) explicitly OFF
- The app reads `DOCKER_HOST` env and speaks TCP to the proxy; falls back to `/var/run/docker.sock` only when `DOCKER_HOST` is unset (backward compat)

### Agent container resource limits
- Every launched agent container (`src/lib/agent-jobs/launch.js`) gets: Memory 2 GB, 1 CPU, PidsLimit 256, `SecurityOpt: no-new-privileges`, 15-minute wall-clock timeout enforced by racing `/containers/{id}/wait` against a `setTimeout` → `/containers/{id}/kill`
- Limits are configurable via `AGENT_MEMORY_LIMIT_MB`, `AGENT_CPU_LIMIT`, `AGENT_PIDS_LIMIT`, `AGENT_TIMEOUT_SEC` settings keys

### Command/path injection defenses
- `/api/projects/clone`: uses `execFile('git', [...args])` array form (no shell), `fs.cp`/`fs.rm` instead of `cp -r`/`rm -rf`, strict HTTPS URL allowlist (rejects `$`, backtick, semicolon, ampersand, pipe, backslash, newlines, spaces, quotes)
- Project Connect file API: absolute-path resolve + prefix check against the project root + `realpathSync` symlink check
- Drizzle ORM parameterises every query — no string-concat SQL anywhere

### Rate limiting
- Tiered in-process sliding-window caps on every `/api/*` route, applied in `src/proxy.js` before auth. Shares the `globalThis` bucket store with `lib/rate-limit.js` so per-route + middleware caps stack correctly
- Tiers: 10/min for scanner-run, 20–30/min for builder/webhook/projects/chat, 120/min for admin reads, 120/min default. NextAuth endpoints explicitly skipped (they have their own brute-force protections)
- Keyed by `${ip}:${prefix}` so a burst on a cheap endpoint doesn't lock the caller out of expensive ones

### Static asset handling
- `src/proxy.js` fast-paths static-file extensions (svg/png/jpg/webp/ico/css/js/woff/etc) past the auth check, so anonymous visitors can load the landing page's assets without being 307'd to `/login`

## Hardening recommendations before public exposure

The defaults above are what ships with a `docker compose up -d`. Additional hardening for any public-facing deploy:

1. **Set a dedicated `ENCRYPTION_KEY`**, different from `AUTH_SECRET`. Both generated with `openssl rand -base64 32`. Split-key means rotating the session secret doesn't invalidate every stored API key/PAT
2. **Configure every webhook secret** before exposing the endpoints (`GITHUB_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, per-trigger secrets in `data/triggers.json`, per-role secrets in cluster configs). The endpoints return 503 otherwise — that's intentional
3. **Keep `docker-socket-proxy` in place.** If you've customised `docker-compose.yml` to remove it, you've opted into "admin of GhostBot = root on the host"
4. **Never trust `user`-role accounts** — treat them as a low-privilege tier, not as admins-in-waiting. Server-side ownership checks prevent the obvious cases, but stored-prompt-injection on shared resources is still a trust boundary
5. **Watch the Dokploy logs** for 429 bursts from unexpected IPs — that's where brute-force attempts against the chat API would show up
6. **Use HTTPS-only** — `AUTH_TRUST_HOST=true` behind a reverse proxy (Dokploy's Traefik, Caddy, nginx). No plain-HTTP production

## Disclosure policy

We follow a coordinated disclosure model:

1. You report privately via GitHub advisory or email
2. We confirm and assess within 7 days
3. We work on a fix; if it takes longer than 30 days we will tell you why
4. We coordinate a public disclosure date with you before releasing the fix
5. You are credited in the changelog and the GitHub advisory unless you request anonymity

Thank you for helping make self-hosted AI tooling safer.
