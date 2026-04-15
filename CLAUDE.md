# GhostBot — Project context for Claude

This file is the entrypoint for any Claude session working on this repo. It tells Claude what's already shipped, what the conventions are, and what the parked items are. **Read this before touching code.**

Live: **https://ghostbot.dev** (Dokploy on Hostinger VPS)
Repo: **https://github.com/flndrnai/ghostbot**

---

## What GhostBot is

A self-hosted AI coding agent platform — one Next.js web app that combines:
- A chat interface against any LLM (cloud or self-hosted Ollama)
- Auto-learning memory across conversations (RAG via embeddings + chat summaries)
- Docker-based coding agents that clone a repo, edit code, push commits, open PRs
- Cluster orchestration for multi-role agent pipelines
- Real-time cross-device sync via SSE
- Telegram / Slack notifications, GitHub PR comment triggers
- Multi-user invitations
- A VS Code extension that mounts the live UI inside the editor

It's all one Next.js app + a separate set of small ephemeral coding-agent Docker images on the host. No microservices, no message queues. SQLite + Drizzle + WAL is the only datastore.

---

## Architecture (one-liner)

```
Browser ─┬─ Next.js App Router (chat, admin, clusters, docs, invite)
         ├─ Server Actions for everything admin
         └─ /stream/sync (SSE)  /stream/chat (SSE)

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
         └─ Ollama on a separate VPS (Qwen 2.5 Coder)
```

---

## Brand identity

| Role | Hex | Usage |
|---|---|---|
| Background | `#050509` | App background |
| Dark surface | `#111827` | Cards, sidebar |
| Gold accent | `#D4AF37` | Buttons, links, active |
| Primary | `#F5D97A` | Highlights, hover |
| Foreground | `#E5E2DA` | Text, borders |

- Dark-first; light mode is unstyled (pending)
- Standard terminology — no "Summon" instead of "Create" cuteness
- Ghost-themed touches only where they don't hurt usability

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Frontend | React 19, Tailwind v4, motion (animated icons), react-markdown, Sora font |
| Backend | Node.js 22 |
| DB | SQLite + Drizzle ORM (WAL) + runtime auto-migrations |
| Auth | NextAuth v5 (credentials, JWT) |
| Encryption | AES-256-GCM (PBKDF2 from AUTH_SECRET) for secrets, bcrypt for passwords |
| Chat LLM path | Direct fetch to Ollama `/api/chat` (no LangChain) for reliability |
| Cloud LLM path | LangChain `ChatAnthropic` / `ChatOpenAI` / `ChatGoogleGenerativeAI` |
| Embeddings | Ollama `nomic-embed-text` 768-dim, in-JS cosine search |
| Sync | Server-Sent Events with in-process pub/sub keyed by userId |
| Containers | Docker Unix socket API only — never `docker exec` from Node |
| Coding agents | Ephemeral container per job, env-var driven entrypoint |

---

## What's shipped (status as of last commit)

### Core
- ✅ Auth + multi-user with invite links
- ✅ Persistent SQLite via Dokploy named volume
- ✅ Real-time SSE sync across devices
- ✅ Mobile-friendly layouts (chat + admin)
- ✅ 24h time, dd/mm/yyyy date format everywhere
- ✅ Markdown chat rendering with code copy buttons

### LLM
- ✅ Ollama path: direct `/api/chat` fetch, no LangChain, no tool-call fragility
- ✅ Anthropic / OpenAI / Google via LangChain factory
- ✅ First-installed-model auto-pick if `LLM_MODEL` is empty
- ✅ Per-chat memory opt-out toggle

### Memory
- ✅ Embeddings via `nomic-embed-text` on the same Ollama VPS
- ✅ Auto-summarize every chat into 2-3 sentences + topic tags
- ✅ Auto-inject top-3 relevant past summaries into new chat system prompts
- ✅ `/admin/memory` page: stats, semantic search, source filter, manual entries, JSON export
- ✅ Persistent memory: per-user MEMORY.md (Tier 1) + daily session logs (Tier 2)
- ✅ Guardrails: safety rules auto-injected into every system prompt
- ✅ Session logging: every chat exchange appended to daily log automatically

### Agent jobs
- ✅ Aider image (default — text diff format, works with small models)
- ✅ OpenCode, Codex CLI, Gemini CLI images (parallel)
- ✅ Per-agent env builder routes Ollama / OpenAI / Google credentials correctly
- ✅ Chat → agent mode toggle (wrench icon) launches a job from any chat
- ✅ Live job cards in chat with status, streaming logs, PR URL, View diff, Re-run
- ✅ `/api/agent-jobs/diff` fetches GitHub compare and renders inline patches

### Notifications
- ✅ Telegram bot integration with welcome message + lock-in admin card
- ✅ Slack integration with channel notifications, parallel to Telegram
- ✅ Both fan out via `notifyAgentJob` Promise.allSettled

### GitHub
- ✅ Fine-grained PAT save with lock-in admin card
- ✅ Webhook secret save with one-click generate, encrypted at rest
- ✅ `/api/github/webhook` handles `issue_comment` events
- ✅ `/ghostbot <prompt>` on a PR launches an Aider job on that PR's branch
- ✅ Acks the comment, posts final status with PR URL or error

### Clusters
- ✅ `/clusters` list page wrapped in sidebar shell
- ✅ `/cluster/[id]` detail page with role editor, system prompt, run-now button
- ✅ Cluster templates: PR Reviewer, Docs Writer, Test Coverage Bot, Dependency Updater
- ✅ Run-now chains roles sequentially via `launchAgentJob`, feeds previous output as context

### Admin
- ✅ Pages: LLM Providers, Ollama, Chat, Agents, Skills, GitHub, Telegram, Slack, Triggers, Crons, Scanner, Context, Containers, Monitoring, Memory, Backup, Users
- ✅ Containers page works once docker.sock is bind-mounted
- ✅ Monitoring page shows agent-job stats + recent jobs with PR links
- ✅ Backup page exports the whole DB as JSON

### Productivity
- ✅ Keyboard shortcuts: `Cmd+B` toggle sidebar, `Cmd+K` focus chat input, `Cmd+Shift+N` new chat, `Cmd+/` help modal
- ✅ Drag/drop/paste files into chat input — embedded as fenced code blocks
- ✅ Clipboard image paste — screenshots and images auto-resized, sent to vision-capable LLMs
- ✅ Chat export to Markdown (download button on each sidebar chat row)
- ✅ Docs page in user dropdown explaining every admin section
- ✅ VS Code extension v0.2: sidebar + full tab + send selection + status bar + CodeLens

### Projects
- ✅ Project Connect: create/manage project folders on the server
- ✅ File tree panel in chat with click-to-attach
- ✅ Project selector to connect/disconnect projects from chats
- ✅ CLAUDE.md auto-injected into system prompt when project is connected
- ✅ Agent jobs mount project folder into Docker container (no GitHub needed)
- ✅ `/projects` list page with create, rename, delete
- ✅ Safe file system API with path traversal protection

### Autonomous Builder
- ✅ LLM-powered plan generation from a build goal
- ✅ Sequential step execution via agent jobs with polling
- ✅ Step validation (expected file checks)
- ✅ Retry logic on failure (configurable max retries)
- ✅ Pause/resume/cancel controls
- ✅ Real-time progress via SSE (builder:* events)
- ✅ Auto-updates CLAUDE.md "What's Shipped" on completion
- ✅ Telegram/Slack notifications on completion
- ✅ `/builder/[planId]` progress page with step cards

### AI Scanner
- ✅ Self-reflecting daily scanner cron (06:30 daily)
- ✅ Analyzes recent session logs, chat summaries, agent job results
- ✅ Produces AI world insights + GhostBot self-improvement suggestions
- ✅ Results stored as knowledge entries (searchable via RAG)
- ✅ `/admin/scanner` page with run-now button and expandable results

### AIOS / Business Context
- ✅ `data/context/my-business.md` — persistent business context
- ✅ `data/context/my-voice.md` — communication style guide
- ✅ Both injected into system prompt (after guardrails, before memory)
- ✅ `/admin/context` page with textarea editors
- ✅ Skills system: reusable prompt templates stored in DB
- ✅ `/skill-name` invocation from chat with `{{input}}` substitution
- ✅ `/admin/skills` page: create, edit, delete skills

### Mobile
- ✅ SSE reconnect on visibility change (tab foreground/background)
- ✅ SSE reconnect on network online/offline events
- ✅ Immediate reconnect (no 30s backoff delay)

---

## What's parked

| Item | Reason |
|---|---|
| Light mode fine-tuning | Basic light mode + toggle shipped; may need per-component polish |
| Rate limiting on remaining `/api` routes | Core routes covered; remaining are low-risk admin-only |
| `/api/agent-jobs/diff` for non-succeeded jobs | Diff comes from GitHub compare which only exists post-push |
| VS Code Marketplace publishing | Extension v0.2 built; needs final packaging and publish |

---

## Code conventions

### Naming
- Package: `ghostbot`
- Docker images: `ghostbot:coding-agent-{agent}` — e.g. `ghostbot:coding-agent-aider`
- DB file: `data/db/ghostbot.sqlite` (lives on the persistent Dokploy volume)
- Config keys: plain UPPER_SNAKE — `LLM_PROVIDER`, `OLLAMA_BASE_URL`, `GH_TOKEN`, etc.

### Architecture rules
- All core logic lives under `src/lib/` — never duplicate it in templates
- Server actions colocated under `src/lib/admin/`, `src/lib/chat/`, `src/lib/cluster/`, etc.
- API routes (`src/app/api/`) are for external callers and webhook receivers; everything browser-side uses server actions
- SSE endpoints under `src/app/stream/` for streaming chat tokens, sync events, cluster logs
- Docker is always reached via `src/lib/tools/docker.js` over the Unix socket — never spawn `docker` CLI
- New schema columns go into `src/lib/db/schema.js` AND `runAutoMigrations` in `src/lib/db/index.js` (using `addColumnIfMissing`). Don't generate Drizzle migrations.
- Date/time formatting always goes through `src/lib/date-format.js` — never call `toLocaleString` directly

### Security
- Secrets via `setConfigSecret` (encrypted with PBKDF2 from `AUTH_SECRET`)
- Never log secrets even on errors
- Never embed secrets in client components
- Webhook signatures verified with `crypto.timingSafeEqual` (HMAC-SHA256)
- Admin actions guarded with `requireAdmin()` (or `requireUser()` for per-user data)

### UI
- Tailwind v4 with the brand colour tokens
- Dark mode default
- Components live next to the feature they serve, not in a global `components/` folder
- Animated icons via the `src/lib/icons/` wrappers (motion + lucide)
- Standard pattern for admin pages: GET-on-mount → save → auto-test → flip to green Active card with Disconnect button (see Ollama, GitHub, Telegram, Slack admin pages for the pattern)

---

## Reference source

`thepopebot-main/` is a read-only reference of ThePapeBot v1.2.75. **Never modify it.** Use it to understand patterns, then implement the GhostBot equivalent in `src/`. It is gitignored.

---

## When in doubt

- Start by reading this file
- Then `README.md` for the user-facing summary
- Then `docs/OLLAMA_QWEN_SETUP.md` for the Ollama-side details
- Then the `/docs` page in the running app at `https://ghostbot.dev/docs` for the admin walkthrough
- Then the relevant `src/lib/<feature>/` folder

---

## Annex: Post-Audit Roadmap

> Synthesized from three independent audits (Claude, DeepSeek, Grok) conducted April 2026 against ghostbot.dev + github.com/flndrnai/ghostbot (111 commits, main branch).

### Current State Summary

GhostBot is live, deployed, and functionally complete as a self-hosted AI coding agent platform. Every feature listed in the README is implemented — chat, multi-provider LLM support, SSE sync, memory/RAG, Project Connect, Docker agents (Aider/OpenCode/Codex/Gemini CLI), cluster pipelines, GitHub PR integration, Telegram/Slack notifications, multi-user auth, admin panel, VS Code extension, encrypted settings, and one-click DB backup.

The product is done. The packaging is not.

The core problem: nobody can discover, understand, or try GhostBot without already knowing what it is. The login wall at `/` is a dead end for every visitor who isn't the admin.

### Phase 1 — Quick Wins (1–2 days each)

#### 1.1 Public Landing Page at /

**Priority: CRITICAL** — this is the single highest-impact change.

- Create a public `/` route that does NOT redirect to `/login`
- Update the middleware to whitelist `/` as a public route
- Content to include:
  - Hero: GhostBot icon + tagline ("Self-hosted AI coding agent platform")
  - Feature grid: 6–8 cards covering chat, agents, memory, clusters, Project Connect, notifications
  - Screenshots or a 30-second screen recording (embed or autoplay GIF)
  - CTA buttons: "Self-Host Now" (links to GitHub) + "Sign In" (links to /login)
  - Tech stack badges row
  - Footer with GitHub link + MIT license badge
- Design: use existing brand — `#050509` background, `#D4AF37` gold accent, `#F5D97A` highlights, `#E5E2DA` text
- Keep it a single page, no routing complexity

#### 1.2 GitHub Repo Polish

- Set repo description: *Self-hosted AI coding agent platform — chat with any LLM, run coding agents in Docker, orchestrate multi-role pipelines*
- Set website: `https://ghostbot.dev`
- Add topics: `ai`, `coding-agent`, `self-hosted`, `llm`, `nextjs`, `docker`, `ollama`, `aider`, `rag`
- Upload social preview image (1280×640, ghost icon on dark bg with gold accent)
- Create `v1.0.0` release tag with a changelog summarizing the 111 commits
- Add screenshots to README (chat view, admin panel, agent job running, cluster pipeline, Project Connect file tree) — store in `/assets/screenshots/`

#### 1.3 docker-compose.yml for Easy Self-Hosting

- Create a production-ready compose file at repo root:
  - Services: ghostbot app + ollama (optional)
  - Volumes: ghostbot-data (SQLite + memory), ollama-models
  - Bind mount: `/var/run/docker.sock` for agent containers
  - Env: `AUTH_SECRET`, `AUTH_TRUST_HOST`, `NODE_ENV`, `DATABASE_PATH`
- Include an `.env.example` with all required/optional vars documented
- Add a `docker-compose.dev.yml` variant for local development
- Update README quick-start to lead with `docker compose up -d` as the primary path
- Add one-click deploy buttons where possible (Railway, Render)

#### 1.4 VS Code Extension → Marketplace

- Create a VS Code Marketplace publisher account under `flndrnai`
- Add a proper `package.json` with publisher field, icon, categories, keywords
- Build `.vsix` and publish v0.1.0
- Add a GitHub Actions workflow: on tag push `vscode-ext/v*` → auto-build and publish
- Link from README and landing page

### Phase 2 — Onboarding & Documentation (1–2 weeks)

#### 2.1 First-Run Setup Wizard

After admin account creation on first visit, redirect to `/setup` (new route):
1. Step 1: Choose LLM provider → Ollama URL / Anthropic key / OpenAI key / Google key
2. Step 2: (Optional) Docker check → verify `/var/run/docker.sock` is mounted, show available agent images
3. Step 3: (Optional) GitHub PAT → paste token, validate scopes
4. Step 4: (Optional) Notifications → Telegram bot token + webhook URL / Slack app token
5. Step 5: Done → redirect to first chat with a welcome message

Store wizard completion state in settings table so it only shows once.

#### 2.2 Expand /docs In-App Guide

Build out with: Getting started, Chat features, Project Connect, Coding agents, Cluster pipelines, Admin reference, Troubleshooting.

#### 2.3 Project Connect Docker Mount Documentation

Add a dedicated section in `/docs` and in the admin UI for Dokploy/Docker production bind-mount instructions.

### Phase 3 — Robustness & DevOps (2–4 weeks)

#### 3.1 CI/CD Pipeline

- `.github/workflows/ci.yml`: lint + build check on every PR/push to main
- `.github/workflows/release.yml`: on tag push → build Docker image, push to GHCR, create GitHub Release
- Basic test suite: Vitest for unit, Playwright for E2E

#### 3.2 Agent Container Resource Limits

Enforce `Memory: 2GB`, `NanoCpus: 1 CPU`, `PidsLimit: 256` when launching agent containers. Make configurable per agent type. Add timeout (default 15 min).

#### 3.3 Monitoring & Logging Improvements

Live agent job log streaming, token usage dashboard, active container list, memory store stats.

#### 3.4 PWA Support

`manifest.json`, minimal service worker for offline shell caching, install prompt banner on mobile.

#### 3.5 Rate Limiting

In-memory token bucket on `/api/*` routes. Especially: LLM chat, agent job launches, auth endpoints.

### Phase 4 — Feature Depth (ongoing)

#### 4.1 Reference Features

| Feature | Differentiation | Effort | Priority |
|---|---|---|---|
| Voice-to-text input (Whisper/AssemblyAI) | High | Medium | Next |
| In-browser terminal (xterm.js) | High | Medium | Next |
| Monaco editor + diff viewer | Medium | High | Later |
| More agents (Claude Code, etc.) | Medium | Low each | Ongoing |
| File-watch triggers | Medium | Medium | Later |
| Full cron system | Low | Low | Later |

#### 4.2 Horizontal Scaling Path

Document the ceiling: SQLite + in-process SSE = single server. If demand grows, swap to Redis pub/sub + Turso/PostgreSQL.

#### 4.3 Hosted Demo Instance

`demo.ghostbot.dev` with read-only Ollama backend, pre-seeded data, auto-reset every 24h, no agent launching.

### File Checklist — New Files to Create

```
ghostbot/
├── docker-compose.yml              ← Phase 1.3
├── docker-compose.dev.yml          ← Phase 1.3
├── .env.example                    ← Phase 1.3
├── .github/
│   └── workflows/
│       ├── ci.yml                  ← Phase 3.1
│       └── release.yml             ← Phase 3.1
├── assets/
│   └── screenshots/                ← Phase 1.2
├── public/
│   └── manifest.json               ← Phase 3.4
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   └── page.js             ← Phase 1.1 (landing page)
│   │   └── setup/
│   │       └── page.js             ← Phase 2.1 (setup wizard)
│   └── service-worker.js           ← Phase 3.4
├── tests/
│   ├── unit/                       ← Phase 3.1
│   └── e2e/                        ← Phase 3.1
└── vscode-extension/
    └── .github/workflows/
        └── publish.yml             ← Phase 1.4
```

### Rules for Claude Code Sessions on This Annex

- Work phase by phase, do not skip ahead
- Each phase item gets its own commit with a descriptive message
- Test locally before committing (especially route protection changes — Next.js middleware)
- Landing page must match existing brand tokens exactly — no new colors, no new fonts
- Docker-compose must be tested with a clean `docker compose up -d` on a fresh machine
- VS Code extension publish requires marketplace credentials — pause and ask
- Agent resource limits: test with a deliberately slow/infinite agent before shipping
- Never break the existing login → chat → agent flow while adding new routes
- Never display email addresses anywhere in the UI, logs, or public-facing pages — mask or omit entirely
- Never display IP addresses anywhere in the UI, logs, or public-facing pages — mask or omit entirely

---

## Annex: Claude Code Audit — Full Assessment

> Independent assessment conducted by Claude Code against the live deployment at ghostbot.dev and the source repo (111 commits, main branch).

### What's Live & Working

The site at ghostbot.dev is deployed and serving a real Next.js app. The core deployment pipeline (Dokploy + Dockerfile + SQLite persistence) is functional. Based on the 111 commits and the detailed project structure, the following is built and working:

- **Core chat platform** — multi-provider LLM chat (Ollama, Anthropic, OpenAI, Google), SSE-based real-time sync across devices, markdown rendering with code blocks + copy buttons, image paste + vision support for multimodal models.
- **Auth & multi-user** — NextAuth v5 with credentials/JWT, admin account setup on first visit, invitation system with one-time tokens, role isolation (admin/user).
- **Database layer** — 15-table SQLite schema via Drizzle ORM with WAL mode and runtime auto-migrations. Encrypted settings store (AES-256-GCM). Solid engineering.
- **Memory/RAG system** — auto-summarization of chats, embedding via nomic-embed-text, semantic retrieval of past context into new conversations.
- **Project Connect** — attach a project folder to a chat, browse file tree, inject CLAUDE.md into system prompts, launch agents directly on the project.
- **Docker coding agents** — Aider, OpenCode, Codex, Gemini CLI each in their own container image. Launch from chat, agent clones repo, edits code, opens a PR. Docker socket API (not CLI) is the right call.
- **Cluster pipelines** — multi-role agent chains (planner → reviewer → coder → tester) with one-click templates.
- **GitHub integration** — PR comments (`/ghostbot fix this`) trigger agent jobs, fine-grained PAT support.
- **Notifications** — Telegram + Slack webhook integrations for job status alerts.
- **Admin panel** — full admin section covering LLMs, Ollama, agents, GitHub, Telegram, Slack, triggers, crons, containers, monitoring, memory, backup, users.
- **VS Code extension** — webview wrapper to embed GhostBot in the editor.

### What Still Needs Work

1. **No public-facing landing page.** This is the biggest gap. Hitting ghostbot.dev dumps you straight into a login form. There's zero context for a new visitor — no feature overview, no screenshots, no "what is this?" Anyone who isn't the admin will bounce immediately. The README is excellent marketing copy that no one outside GitHub will ever see. *(Addressed in Phase 1.1)*
2. **No onboarding flow.** Even after login, a first-time user has to figure out admin setup, LLM configuration, Ollama connection, Docker socket mounting, and GitHub PAT creation all on their own. The /docs route exists but coverage is minimal. *(Addressed in Phase 2.1)*
3. **GitHub repo presentation is bare.** No description, no website link, no topics, no releases, 0 stars, 0 forks. The repo is public but completely undiscoverable. No social preview image. *(Addressed in Phase 1.2)*
4. **VS Code extension isn't published.** "Build the .vsix locally" is a developer-only distribution path. No marketplace listing. *(Addressed in Phase 1.4)*
5. **No demo or screenshots anywhere.** The README is thorough technically but has zero visual proof of the product. No screenshots, no GIFs, no video walkthrough. *(Addressed in Phase 1.2)*
6. **Stack deviation from standard.** GhostBot uses SQLite + Drizzle + NextAuth, whereas the usual stack is Convex + Better Auth. Not necessarily bad (SQLite makes sense for a self-hosted product), but this project lives outside the usual toolchain and won't benefit from shared patterns across other projects.
7. **No monetization path.** No pricing, no SaaS tier, no hosted offering. Purely self-hosted MIT-licensed. Deliberate choice but worth flagging if revenue is ever desired.
8. **Single-server architecture.** SQLite + in-process SSE pub/sub means this doesn't scale horizontally. Fine for personal/small team use, but the ceiling should be documented. *(Addressed in Phase 4.2)*

### Prioritized Recommendations

| Priority | Action | Impact | Status |
|---|---|---|---|
| **P1** | Build a public landing page at `/` | Highest — turns a login wall into a product pitch | Phase 1.1 |
| **P2** | Add screenshots/GIFs to the README | High — visual proof converts visitors | Phase 1.2 |
| **P3** | Polish GitHub repo (description, topics, release tag, social preview) | High — discoverability | Phase 1.2 |
| **P4** | Guided setup wizard after first admin login | High — converts signup to active user | Phase 2.1 |
| **P5** | Hosted demo instance at demo.ghostbot.dev | Medium — lets people try before deploying | Phase 4.3 |
| **P6** | One-click deploy buttons (docker-compose, Railway, Coolify) | Medium — lowers self-hosting barrier | Phase 1.3 |
| **P7** | Publish VS Code extension to Marketplace | Medium — opens a new discovery channel | Phase 1.4 |

### Overall Assessment

The product itself is impressively complete for a solo build — 111 commits, 15 DB tables, 4 agent integrations, cluster pipelines, memory/RAG, multi-user, notifications. The engineering is serious. The problem is purely **packaging and presentation**: there's no front door, no visual proof, and no discoverability. The README reads like a product that should have 500+ GitHub stars but nobody can find it yet. Fix the landing page and the repo presentation, and this becomes genuinely competitive in the self-hosted AI agent space alongside tools like Open WebUI and Aider.

### Known Local Dev Issue

There is a stray empty `package-lock.json` at the repo root (no corresponding `package.json`) that confuses Next.js's workspace root detection and prevents `next dev` from starting locally. The app itself deploys fine via Dokploy since the Dockerfile builds from `src/`. This should be removed or gitignored.
