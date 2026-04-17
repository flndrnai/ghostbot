<div align="center">

# 👻 GhostBot

**Self-hosted AI coding agent platform** — chat with any LLM, run coding agents in Docker that open real GitHub PRs, and orchestrate multi-role agent pipelines. One Next.js app, SQLite, and your choice of cloud or local LLM.

[![Live site](https://img.shields.io/badge/live-ghostbot.dev-D4AF37?style=flat-square)](https://ghostbot.dev)
[![Demo](https://img.shields.io/badge/try%20it-demo.ghostbot.dev-F5D97A?style=flat-square)](https://demo.ghostbot.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Self-hosted](https://img.shields.io/badge/self--hosted-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](#quick-start)

</div>

> **Just want to try it?** [demo.ghostbot.dev](https://demo.ghostbot.dev) — no sign-up, no risk. Agent-job launches + secret saves are disabled, the database resets every 24h.
>
> **Just want to use it?** See **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** — the plain-language guide for people who aren't developers.
>
> **Want to self-host?** Read on.

---

## What it does

- **Chat with any LLM** — Anthropic, OpenAI, Google, or your own self-hosted Ollama (Qwen 2.5 Coder, Llama, Mistral, etc.)
- **First-run setup wizard** at `/setup` — walks the owner through LLM, Docker, GitHub, and notification configuration in minutes
- **Real-time cross-device sync** — Laptop and phone stay in lock-step via Server-Sent Events
- **Markdown chat** with code-block copy buttons, tables, syntax highlighting, LaTeX-safe rendering
- **Image paste + vision** — Clipboard screenshots auto-resized and sent to vision-capable models
- **Voice-to-text input** — Browser SpeechRecognition API, no transcription API cost, no server round-trip
- **Self-learning memory (RAG)** — Every chat is auto-summarised + embedded; future chats retrieve relevant past context
- **Project Connect** — Attach a local project folder to any chat. Browse the tree, click-to-attach files, launch agents directly. `CLAUDE.md` is auto-injected into the system prompt
- **Coding agents in Docker** — Aider (default), OpenCode, Codex, Gemini CLI. Fire from chat → clone repo → edit → PR
- **Side-by-side diff viewer** for agent-job output (unified + side-by-side toggle, word-level intra-line highlighting)
- **Cluster pipelines** — Chain multi-role agents (planner → reviewer → coder → tester) with one-click templates
- **GitHub PR triggers** — Comment `/ghostbot fix this` on a PR, the bot picks it up and pushes a fix
- **Telegram + Slack alerts** — Get pinged when agent jobs finish
- **Autonomous Builder** — LLM-planned multi-step builds with progress tracking, retries, and SSE updates
- **AI Scanner** — Daily self-reflecting cron distills recent sessions into insights + self-improvement suggestions
- **AIOS / Skills** — Per-user business context and voice injected into every prompt; reusable `/skill-name` prompt templates
- **Multi-user** — Admin invites via one-time links, each user has isolated chat + memory, ownership enforced at DB layer
- **PWA install** — Add-to-Home-Screen on mobile; standalone window, offline shell cache
- **Demo mode** — Set `DEMO_MODE=true` for a sandboxed public instance (agent jobs + secret saves disabled); see [docs/DEMO.md](docs/DEMO.md)
- **Admin backup** — One-click JSON export of the whole DB before risky migrations
- **VS Code extension** — Embed the live GhostBot UI inside your editor (see [vscode-extension/PUBLISHING.md](vscode-extension/PUBLISHING.md) for Marketplace publish)

---

## Architecture

```
Browser ─┬─ Next.js App Router (chat, admin, clusters, docs, /setup wizard)
         ├─ Server Actions for every admin + owner action
         └─ /stream/sync + /stream/chat (SSE)

Server ──┬─ src/lib/ai           direct Ollama client + LangChain fallback
         ├─ src/lib/memory       embeddings + cosine search + summarize
         ├─ src/lib/agent-jobs   db / launch / notify (Telegram + Slack)
         ├─ src/lib/cluster      templates + run-now chain executor
         ├─ src/lib/sync         pub/sub bus + per-user SSE handlers
         ├─ src/lib/db           schema + runtime auto-migrations
         └─ src/lib/tools        docker, github, telegram, slack

Host  ───┬─ ghostbot Docker container (Dokploy-managed)
         ├─ ghostbot:coding-agent-aider     (default)
         ├─ ghostbot:coding-agent-opencode
         ├─ ghostbot:coding-agent-codex
         ├─ ghostbot:coding-agent-gemini
         └─ Ollama on a separate VPS (Qwen 2.5 Coder, etc.)
```

One Next.js app. One SQLite file. Docker socket for agents. No microservices, no message queues.

---

## Quick start

### Docker Compose (recommended)

```bash
git clone https://github.com/flndrnai/ghostbot.git
cd ghostbot

cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env

docker compose up -d
```

Open `http://localhost:3000`. The first visit creates the owner account and auto-redirects you to `/setup` — a 5-step wizard that gets your LLM, Docker, GitHub, and notifications configured in one place.

### Local development

Requires **Node.js ≥ 20.10** (for ES2025 import attributes).

```bash
git clone https://github.com/flndrnai/ghostbot.git
cd ghostbot/src
npm install

export AUTH_SECRET="$(openssl rand -base64 32)"
npm run dev
```

Run tests:
```bash
cd src && npm test
```

### Production (Dokploy)

Deploy `src/Dockerfile` via [Dokploy](https://dokploy.com) with these environment variables:

```env
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
NODE_ENV=production
DATABASE_PATH=/app/data/db/ghostbot.sqlite
```

Mounts:

| Type | Source | Mount path | Purpose |
|---|---|---|---|
| Volume | `ghostbot-data` | `/app/data` | Persists SQLite + memory across redeploys |
| Bind | `/var/run/docker.sock` | `/var/run/docker.sock` | Required to launch agent containers |

> ⚠️ **Docker socket bind-mount grants host-root-equivalent privilege to the app container.** Only enable it if you trust every admin on the instance. For multi-tenant deployments, put the socket behind [tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) with a restrictive allowlist. See [Security](#security) below.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Frontend | React 19, Tailwind CSS v4, motion (animated icons), react-markdown, Sora font |
| Backend | Node.js 20.10+ (targets 22 in production) |
| Database | SQLite + Drizzle ORM (WAL mode) + runtime auto-migrations |
| Auth | NextAuth v5 (credentials, JWT sessions) |
| Encryption | AES-256-GCM (secrets via PBKDF2 from `AUTH_SECRET`), bcrypt (passwords) |
| LLM — chat path | Direct fetch to Ollama `/api/chat` (no LangChain for reliability) |
| LLM — cloud path | LangChain `ChatAnthropic` / `ChatOpenAI` / `ChatGoogleGenerativeAI` |
| Embeddings | Ollama `nomic-embed-text` (768 dims), in-JS cosine search |
| Sync | Server-Sent Events with in-process pub/sub keyed by userId |
| Containers | Docker Unix socket API (never `docker exec` from Node) |
| i18n | Plain `src/locales/<lang>.json` + tiny `t()` helper (no library) |
| Tests | Vitest |

---

## Brand

| Role | Hex | Usage |
|---|---|---|
| Background | `#050509` | App background |
| Dark surface | `#111827` | Cards, sidebar |
| Gold accent | `#D4AF37` | Buttons, links, active states |
| Primary | `#F5D97A` | Highlights, hover states |
| Foreground | `#E5E2DA` | Text, borders |

Dark-first. The sidebar-footer theme toggle lives only in the user nav dropdown (no duplicates).

---

## Project layout

```
ghostbot/
├── docker-compose.yml            # Production: docker compose up -d
├── docker-compose.dev.yml        # Dev override with hot reload
├── .env.example                  # Env variable template
├── docker/                       # Coding-agent images
│   ├── build.sh                  # Build all agent images locally
│   ├── agents/
│   └── coding-agent/
├── src/                          # Next.js app (npm workspace)
│   ├── app/
│   │   ├── (public)/             # Public landing page
│   │   ├── setup/                # Owner-only first-run wizard
│   │   ├── chat/[chatId]/
│   │   ├── clusters/             # list + templates
│   │   ├── cluster/[id]/         # detail + roles
│   │   ├── projects/             # project connect
│   │   ├── builder/[planId]/     # autonomous builder progress
│   │   ├── admin/                # 16 admin pages
│   │   ├── docs/                 # in-app guide
│   │   ├── invite/[token]/       # public invite acceptance
│   │   ├── login/
│   │   ├── api/                  # REST + webhooks (GitHub, Telegram)
│   │   └── stream/               # SSE endpoints
│   ├── components/               # Shared components (SetupBanner, etc.)
│   ├── lib/
│   │   ├── ai/                   # Ollama client, model factory, chat stream
│   │   ├── memory/               # embeddings, store, summarize, session logs
│   │   ├── agent-jobs/           # launch, db, notify
│   │   ├── cluster/              # actions, templates, runtime
│   │   ├── builder/              # autonomous multi-step builder
│   │   ├── scanner/              # daily self-reflecting cron
│   │   ├── chat/                 # actions + components
│   │   ├── auth/                 # NextAuth config + edge config
│   │   ├── admin/                # server actions for every admin page + wizard
│   │   ├── db/                   # schema + runtime auto-migrations
│   │   ├── sync/                 # SSE bus
│   │   ├── tools/                # docker, github, telegram, slack
│   │   ├── icons/                # animated lucide wrappers
│   │   ├── i18n.js               # minimal t() helper
│   │   └── projects/             # project-folder + file-system API
│   ├── locales/                  # en.json, nl.json, fr.json
│   ├── proxy.js                  # Auth + owner-only /setup gating + rate limiting (Next 16 successor to middleware.js)
│   ├── server.js                 # Custom server entry
│   └── Dockerfile                # Production image
├── docs/
│   ├── OLLAMA_QWEN_SETUP.md      # Full Ollama + Qwen setup
│   └── superpowers/              # Design specs + implementation plans
├── vscode-extension/             # VS Code extension (webview)
└── README.md
```

---

## Database

18+ tables, auto-migrated at runtime via `runAutoMigrations` in `src/lib/db/index.js` — **no `drizzle-kit generate` step required**, just add columns to `schema.js` and `addColumnIfMissing`.

| Table | Purpose |
|---|---|
| `users` | Accounts with `role` (admin/user) and `owner` (exactly one per install) |
| `invitations` | One-time signup tokens for multi-user |
| `chats`, `messages` | Chat sessions + messages (with optional base64 image attachments) |
| `chat_summaries` | Auto-generated 2–3 sentence recaps + embeddings |
| `knowledge_entries` | Manual + auto knowledge with embeddings |
| `agent_jobs` | Coding agent runs (status, output, PR URL) |
| `clusters` + `cluster_roles` | Multi-role agent pipelines |
| `projects` | Connected project folders |
| `skills` | Reusable `/slug` prompt templates |
| `builder_plans`, `builder_steps` | Autonomous builder state |
| `token_usage` | Per-request token accounting |
| `settings` | Encrypted config (AES-256-GCM via PBKDF2 from `AUTH_SECRET`) |
| `notifications`, `subscriptions`, `code_workspaces` | Notifs, channels, interactive sessions |

---

## Self-hosted LLM

Works with **any Ollama model** — not just the ones listed. `ollama pull <model>` on your Ollama machine and it appears in Admin → Ollama. Browse [ollama.com/library](https://ollama.com/library) for options.

Full walkthrough (cost comparison, KVM8 migration checklist): **[docs/OLLAMA_QWEN_SETUP.md](docs/OLLAMA_QWEN_SETUP.md)**.

| Hardware | Suggested model | Notes |
|---|---|---|
| 16 GB VPS (Hostinger KVM4) | `qwen2.5-coder:7b` | Stable for chat, fast |
| 16 GB VPS | `qwen2.5-coder:14b` | Tight but works |
| 24 GB+ VPS (KVM8) | `qwen2.5-coder:32b` | Strong tool-calling, real agent reliability |
| Every box | `nomic-embed-text` | Required for memory (~274 MB) |

---

## Optional features & what they need

| Feature | Requires | Why |
|---|---|---|
| Web chat | nothing | Works on localhost |
| Self-hosted LLM | VPS + Ollama | Zero per-token cost |
| Cloud LLM | API key | If you don't run your own |
| Memory / RAG | `ollama pull nomic-embed-text` | Semantic search + auto-summarize |
| Docker agents | docker.sock mounted | Launch coding-agent containers |
| GitHub integration | Fine-grained PAT (Contents + PRs + Issues rw) | Branches, commits, PRs |
| `/ghostbot` PR trigger | GitHub webhook + secret | Comment `/ghostbot fix this` on a PR |
| Telegram notifications | Public HTTPS URL + bot token | Telegram needs a public webhook target |
| Slack notifications | Slack app + bot token + `chat:write` + channel ID | Posts to the configured channel |
| Multi-user | nothing extra | Admin → Users → Invite |
| VS Code extension | Build `.vsix` locally | Embed live GhostBot in your editor |

---

## Security

GhostBot is **designed to run inside your own perimeter** — a personal VPS, a home server, or a small-team deployment. It is **not hardened for public multi-tenant hosting.**

### What's in place

- Password hashing with bcrypt
- Secrets at rest encrypted with AES-256-GCM, key derived via PBKDF2 from `AUTH_SECRET`
- JWT sessions (NextAuth v5) with role + owner claims
- Owner-only gating on `/setup` (`src/proxy.js` + server component + action-layer `requireOwner()`)
- Admin-only gating on `/admin/**`
- Path-traversal defense on the Project Connect file API (absolute-path resolve + prefix check + `realpathSync` symlink check)
- Drizzle ORM parameterizes every query (no string-concat SQL)
- GitHub webhook signatures verified with `crypto.timingSafeEqual` when both secret and header are present
- Rate limiting on sensitive routes via in-process sliding window (`src/lib/rate-limit.js`)

### What to harden before exposing beyond a trusted perimeter

If you plan to expose GhostBot to the public internet or onboard untrusted users, you **must** address these before going live:

1. **Docker socket** — the app container has root-equivalent access to the host via `/var/run/docker.sock`. Put it behind [tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) and allowlist only `containers/create`, `containers/start`, `containers/{id}/logs`, and `containers/{id}` DELETE.
2. **Agent container limits** — coding-agent containers are launched without enforced `Memory`, `NanoCpus`, or `PidsLimit` settings. A hostile or buggy agent can exhaust host resources. Apply limits in [src/lib/tools/docker.js](src/lib/tools/docker.js) `runContainer`.
3. **Webhook endpoints** — every webhook receiver (`/api/github/webhook`, `/api/telegram/webhook`, `/api/webhook/*`, `/api/clusters/[id]/roles/[id]/webhook`) must fail closed when no secret is configured. Audit the signature-verification branches before exposure.
4. **Multi-user isolation** — server actions operating on user-scoped resources (clusters, skills, memory, chats) must verify ownership (`resource.userId === session.user.id`), not just that a session exists.
5. **Command-template inputs** — if you wire up `type: 'command'` triggers, never let untrusted HTTP input reach the command string. Pass placeholders as env vars into `execFile`, not into `exec`.
6. **Rate limiting** — extend `enforceRateLimit()` to every `/api/**` route, not just the currently-covered subset. Trust only the `x-forwarded-for` chain your reverse proxy sets.

### Threat model

GhostBot assumes:
- The `AUTH_SECRET` is kept secret (it's the root of all encryption)
- Admins are trusted. Invited `user`-role accounts have read-only-ish access to their own data but should not be treated as adversarial
- The Ollama endpoint is on a private network or behind HTTPS with a credential on the ingress
- The Docker host is single-tenant to the admin(s)

### Reporting a vulnerability

Please **do not open a public GitHub issue** for security reports. Email the maintainer at the address listed on the repo's GitHub profile, or open a private advisory via GitHub's security tab. We'll acknowledge within 72 hours.

---

## Conventions

- All core logic lives under `src/lib/` — never duplicate in templates
- Server actions colocated with their feature (`src/lib/admin/`, `src/lib/chat/`, etc.)
- API routes (`src/app/api/`) are for external callers + webhook receivers; everything browser-side uses server actions
- SSE endpoints under `src/app/stream/`
- Docker only via `src/lib/tools/docker.js` over the Unix socket — never shell out to `docker` CLI
- Date/time formatting through `src/lib/date-format.js` (24h, `dd/mm/yyyy`)
- No i18n libraries — strings come from `src/locales/<lang>.json` via `t()` in [src/lib/i18n.js](src/lib/i18n.js)

---

## Scaling

GhostBot is designed for **single-server, single-owner or small-team** deployments. See [docs/SCALING.md](docs/SCALING.md) for:

- what a single instance handles comfortably (and where the ceiling actually is)
- signals that you're approaching the ceiling
- the three-step horizontal scaling migration path (Redis pub/sub → Postgres/Turso → multi-Ollama)
- what GhostBot explicitly does NOT try to do (multi-region active-active, serverless, multi-pod K8s)

---

## Roadmap

Design specs + implementation plans live in `docs/superpowers/`.

**Shipped:**
- ✅ Phase 1 — public landing page, docker-compose, repo polish
- ✅ Phase 2.1 — first-run setup wizard at `/setup`
- ✅ Phase 2.2 — expanded in-app `/docs` (Getting Started, Project Connect, Clusters, Troubleshooting)
- ✅ Phase 2.3 — Docker mount & security docs section
- ✅ Phase 3.1 — CI/CD (GitHub Actions: lint/build on PR, release on tag → GHCR)
- ✅ Phase 3.2 — agent container resource limits (Memory/NanoCpus/PidsLimit/timeout) + docker-socket-proxy
- ✅ Phase 3.3 — monitoring + live log streaming (already shipped pre-Phase-3)
- ✅ Phase 3.4 — PWA (manifest.json + service worker)
- ✅ Phase 4.1 — voice-to-text input + diff2html side-by-side viewer
- ✅ Phase 4.2 — single-server ceiling documented in [docs/SCALING.md](docs/SCALING.md)
- ✅ Phase 4.3 — DEMO_MODE + live demo at [demo.ghostbot.dev](https://demo.ghostbot.dev)
- ✅ 10-finding security audit patched (command injection, webhook fail-open, ownership gates; see commit history)
- ✅ `ENCRYPTION_KEY` split from `AUTH_SECRET`; extended rate limiting to every `/api/*` route
- ✅ `src/proxy.js` (Next.js 16 convention) replaces the old `middleware.js`

**Deferred (need dedicated design/work):**
- ⏳ Monaco as in-browser file editor for Project Connect (save/publish/revert flow needs its own design)
- ⏳ In-browser terminal beyond the existing workspace-shell surface
- ⏳ Additional coding-agent images (Claude Code, Cline, Cursor-agent, etc.)
- ⏳ Light-mode per-component polish
- ⏳ VS Code Marketplace publish (extension packaging + guide done; see [vscode-extension/PUBLISHING.md](vscode-extension/PUBLISHING.md) — you run `vsce publish`)

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built by [flndrn](https://flndrn.com) · Live at [ghostbot.dev](https://ghostbot.dev)

</div>
