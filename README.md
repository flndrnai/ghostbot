# GhostBot

Self-hosted AI coding agent platform. One web app for chatting with any LLM, running coding agents that open real GitHub PRs, and orchestrating multi-role agent pipelines — all from any device.

Live: **[ghostbot.dev](https://ghostbot.dev)**
Repo: **[github.com/flndrnai/ghostbot](https://github.com/flndrnai/ghostbot)**

---

## What it does

- **Chat with any LLM** — Anthropic, OpenAI, Google, or your own self-hosted Ollama (Qwen 2.5 Coder etc.)
- **Real-time cross-device sync** — Open on laptop and phone simultaneously, every chat and message syncs over SSE
- **Markdown chat rendering** — Code blocks with copy buttons, tables, lists, inline highlighting
- **Self-learning memory** — Each chat is auto-summarized + embedded; future chats retrieve relevant past context automatically (RAG)
- **Coding agents in Docker** — Aider, OpenCode, Codex, Gemini CLI. Fire from chat → agent clones repo, edits code, opens a PR, pings you
- **Cluster pipelines** — Chain multiple agent roles together (planner → reviewer → coder → tester) with one-click templates
- **GitHub PR comments → agent jobs** — Comment `/ghostbot fix this` on any PR, the bot picks it up and pushes a fix
- **Telegram + Slack notifications** — Get pinged on your phone when agent jobs start, succeed, or fail
- **Multi-user invitations** — Admin invites via one-time link, each user has isolated chat history and memory
- **Admin backup** — One-click JSON export of the whole DB before risky migrations
- **VS Code extension** — Open the same GhostBot UI inside your editor

---

## Quick start

### Prerequisites

- Node.js 22+
- An Ollama instance (any VPS) — or an Anthropic / OpenAI / Google API key
- (Optional) Docker daemon for running coding agents

### Local dev

```bash
git clone https://github.com/flndrnai/ghostbot.git
cd ghostbot/src

npm install

# Generate an AUTH_SECRET
openssl rand -base64 32 > /tmp/auth-secret
# Then in your shell or .env:
export AUTH_SECRET="$(cat /tmp/auth-secret)"

npm run dev
```

Open `http://localhost:3000`. First visit creates the admin account.

### Production deployment (Dokploy)

GhostBot is built to be deployed via [Dokploy](https://dokploy.com) using the included `Dockerfile`. Required environment variables on the service:

```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
NODE_ENV=production
DATABASE_PATH=/app/data/db/ghostbot.sqlite
```

Required volume mounts:

| Type | Source | Mount path | Purpose |
|---|---|---|---|
| Volume | `ghostbot-data` | `/app/data` | Persists SQLite + memory across redeploys |
| Bind mount | `/var/run/docker.sock` | `/var/run/docker.sock` | Lets GhostBot launch agent containers on the host |

After the first deploy, hit `/login`, set up the admin account, then go to `/admin` and configure your LLM provider.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Frontend | React 19, Tailwind CSS v4, motion (animated icons), react-markdown |
| Backend | Node.js 22 |
| Database | SQLite + Drizzle ORM (WAL mode) + runtime auto-migrations |
| Auth | NextAuth v5 (credentials, JWT sessions) |
| Encryption | AES-256-GCM (secrets), bcrypt (passwords) |
| LLM | Direct fetch to Ollama `/api/chat` (no LangChain in the chat path), LangChain only for cloud providers |
| Embeddings | Ollama `nomic-embed-text` (768 dims) |
| Sync | Server-Sent Events with in-process pub/sub |
| Containers | Docker Unix socket API (no CLI spawning) |
| Coding agents | Aider (default), OpenCode, Codex, Gemini CLI — each in its own image |

---

## Brand colours

| Role | Hex | Usage |
|---|---|---|
| Background | `#050509` | App background |
| Dark surface | `#111827` | Cards, sidebar |
| Gold accent | `#D4AF37` | Buttons, links, active states |
| Primary | `#F5D97A` | Highlights, hover states |
| Foreground | `#E5E2DA` | Text, borders |

---

## Project structure

```
ghostbot/
├── src/                          # Next.js app
│   ├── app/                      # App Router pages + API routes
│   │   ├── page.js               # / chat
│   │   ├── chat/[chatId]/        # /chat/<id>
│   │   ├── clusters/             # cluster list + templates
│   │   ├── cluster/[clusterId]/  # cluster detail + roles
│   │   ├── admin/                # llms, ollama, chat, agents, github,
│   │   │                         # telegram, slack, triggers, crons,
│   │   │                         # containers, monitoring, memory,
│   │   │                         # backup, users
│   │   ├── docs/                 # /docs in-app guide
│   │   ├── invite/[token]/       # public invite acceptance flow
│   │   ├── login/                # setup + login
│   │   ├── api/                  # external + browser route handlers
│   │   └── stream/               # SSE endpoints (chat, sync, cluster logs)
│   ├── lib/
│   │   ├── ai/                   # Ollama client, model factory, chat stream
│   │   ├── memory/               # embeddings, store, summarize
│   │   ├── agent-jobs/           # launch, db, notify (Telegram + Slack)
│   │   ├── cluster/              # actions, templates, runtime, execute
│   │   ├── chat/                 # actions + components (sidebar, messages,
│   │   │                         # input, markdown, error boundary, etc.)
│   │   ├── auth/                 # NextAuth + setup actions
│   │   ├── admin/                # server actions for every admin page
│   │   ├── db/                   # schema, runtime auto-migrations, helpers
│   │   ├── sync/                 # SSE bus + client hook
│   │   ├── tools/                # docker, github, telegram, slack
│   │   ├── icons/                # animated lucide wrappers
│   │   ├── date-format.js        # single source for dd/mm/yyyy formatting
│   │   └── config.js, paths.js   # config + path resolution
│   ├── drizzle/                  # initial drizzle migrations (runtime
│   │                             # auto-migrations cover everything since)
│   ├── middleware.js             # auth route protection + invite bypass
│   ├── instrumentation.js        # DB init on server start
│   ├── server.js                 # custom server entry
│   ├── Dockerfile                # production image
│   └── package.json
├── docker/agents/                # ephemeral coding agent images
│   ├── aider/                    # ⭐ default — text diff format, works on small models
│   ├── opencode/                 # tool-call protocol, needs strong model
│   ├── codex/                    # OpenAI Codex CLI
│   └── gemini/                   # Google Gemini CLI
├── docs/
│   └── OLLAMA_QWEN_SETUP.md      # full Ollama + Qwen 2.5 Coder setup + KVM8 migration
├── vscode-extension/             # VS Code extension (webview wrapper)
└── README.md                     # this file
```

---

## Database

15 tables, all auto-migrated at runtime via `runAutoMigrations` in `src/lib/db/index.js`:

| Table | Purpose |
|---|---|
| `users` | Accounts with role (admin / user) |
| `invitations` | One-time signup tokens for multi-user |
| `chats` | Chat sessions, with per-chat `memory_enabled` opt-out |
| `messages` | Chat messages |
| `chat_summaries` | Auto-generated 2-3 sentence recaps + embeddings |
| `knowledge_entries` | Manual or auto-saved knowledge with embeddings |
| `agent_jobs` | Coding agent runs (status, output, PR URL) |
| `clusters` + `cluster_roles` | Multi-role agent pipelines |
| `notifications` | Job alerts queue |
| `subscriptions` | Channel subscriptions |
| `code_workspaces` | Interactive container sessions |
| `token_usage` | Per-request token accounting |
| `settings` | Encrypted config store (AES-256-GCM via PBKDF2) |

---

## Self-hosted LLM (Ollama)

GhostBot is built for self-hosted AI first. The Admin → Ollama page auto-discovers installed models via `/api/tags`, lets you click Set Active on any of them, and tests the connection on every page load.

For the full setup walkthrough including the cost-vs-cloud comparison and the KVM8 VPS migration checklist, see **[docs/OLLAMA_QWEN_SETUP.md](docs/OLLAMA_QWEN_SETUP.md)**.

Recommended setup at the time of writing:

| Hardware | Model | Notes |
|---|---|---|
| 16 GB VPS (Hostinger KVM4) | `qwen2.5-coder:7b` | Stable for chat, fast |
| 16 GB VPS | `qwen2.5-coder:14b` | Tight but works for chat alone |
| 24 GB+ VPS (KVM8) | `qwen2.5-coder:32b` | Strong tool-calling, real agent reliability |
| Plus on every box | `nomic-embed-text` | Required for the memory system (~274 MB) |

---

## Optional features & what they need

| Feature | Requirement | Why |
|---|---|---|
| Web chat | none | Works on localhost out of the box |
| Self-hosted LLM | VPS with Ollama | Zero per-token cost forever |
| Cloud LLM | API key | If you don't want to run your own |
| Memory / RAG | `ollama pull nomic-embed-text` | Enables semantic search + auto-summarize |
| Docker agents | docker.sock mounted | Required to launch coding-agent containers |
| GitHub integration | Fine-grained PAT with Contents + PRs + Issues read/write | Branches, commits, PRs |
| Telegram notifications | Public HTTPS URL + bot token | Telegram needs a public webhook target |
| Slack notifications | Slack app + bot token + `chat:write` | Posts to the configured channel |
| `/ghostbot` PR comment trigger | GitHub webhook + secret saved in admin | Comment `/ghostbot fix this` on a PR |
| Multi-user | Nothing extra | Admin invites via Admin → Users |
| VS Code extension | Build the .vsix locally | Embed your live GhostBot inside the editor |

---

## License

MIT
