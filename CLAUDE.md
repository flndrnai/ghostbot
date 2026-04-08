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
- ✅ Pages: LLM Providers, Ollama, Chat, Agents, GitHub, Telegram, Slack, Triggers, Crons, Containers, Monitoring, Memory, Backup, Users
- ✅ Containers page works once docker.sock is bind-mounted
- ✅ Monitoring page shows agent-job stats + recent jobs with PR links
- ✅ Backup page exports the whole DB as JSON

### Productivity
- ✅ Keyboard shortcuts: `Cmd+B` toggle sidebar, `Cmd+K` focus chat input, `Cmd+Shift+N` new chat, `Cmd+/` help modal
- ✅ Drag/drop/paste files into chat input — embedded as fenced code blocks
- ✅ Chat export to Markdown (download button on each sidebar chat row)
- ✅ Docs page in user dropdown explaining every admin section
- ✅ VS Code extension scaffold under `vscode-extension/`

---

## What's parked

| Item | Reason |
|---|---|
| Light mode polish | Dark mode is the default; nobody uses light yet |
| Rate limiting on `/api` | Single-user / small group; not getting hammered |
| VS Code extension v0.2 (deep editor integration: send selection, code lens) | Webview wrapper covers 95% of value |
| Markdown attachment paste from clipboard images | Only file drop / paste / picker is wired |
| `/api/agent-jobs/diff` for non-succeeded jobs | Diff comes from GitHub compare which only exists post-push |
| Drizzle migration generation | Replaced by `runAutoMigrations` in `db/index.js` — much simpler in prod |

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
