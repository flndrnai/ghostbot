# GhostBot

Autonomous AI coding agent platform. Run any coding agent — Claude Code, Codex, Gemini, and more — from your browser on any device.

## Features

- **Multi-Device Access** — Desktop, tablet, phone. Same interface everywhere.
- **Plan Mode** — Dictate tasks from your phone, agents code in the background.
- **Code Mode** — Full interactive terminal in the browser (xterm.js).
- **Multi-Agent** — Claude Code, Codex, Gemini CLI, Pi, OpenCode, Kimi.
- **10+ LLM Providers** — Anthropic, OpenAI, Google, DeepSeek, Ollama, and more.
- **First-Class Ollama** — Run your own LLM on a VPS. Auto-detect models, test connections.
- **GitHub Integration** — Auto-create branches, commits, PRs from agent jobs.
- **Self-Learning Memory** — RAG knowledge base + cross-chat context summaries.
- **Ghost-Themed UI** — Dark-first design with gold/spectral accent palette.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for coding agents — not needed for Phase 1)

### Setup

```bash
# Clone the repo
git clone https://github.com/flndrnai/ghostbot.git
cd ghostbot/src

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Edit .env and set AUTH_SECRET (generate with: openssl rand -base64 32)

# Start development server
npm run dev
```

### First Run

1. Open http://localhost:3000
2. You'll be redirected to the setup page
3. Create your admin account (email + password)
4. Sign in — you're in the GhostBot chat interface

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Frontend | React 19, Tailwind CSS v4 |
| Database | SQLite + Drizzle ORM (WAL mode) |
| Auth | NextAuth v5 (JWT sessions) |
| Encryption | AES-256-GCM (secrets), bcrypt (passwords) |
| Icons | Lucide React |
| Future | LangChain, LangGraph, xterm.js, Monaco Editor, Docker, AI SDK v5 |

## Brand Colors

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#050509` | App background |
| Dark Surface | `#111827` | Cards, sidebar |
| Gold Accent | `#D4AF37` | Buttons, links, active states |
| Primary | `#F5D97A` | Highlights, hover states |
| Foreground | `#E5E2DA` | Text, borders |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.js           # Root layout + theme
│   ├── globals.css          # Tailwind + ghost color tokens
│   ├── page.js              # Home → Chat interface
│   ├── login/               # Setup + login flow
│   ├── admin/               # Admin settings
│   └── api/                 # API routes
├── lib/
│   ├── auth/               # NextAuth v5, credentials, edge-safe config
│   │   └── components/     # Setup form, login form, UI primitives
│   ├── chat/               # Chat UI components
│   │   └── components/     # Sidebar, messages, input, greeting
│   └── db/                 # SQLite schema, encryption, config store
├── drizzle/                # Auto-generated SQL migrations
├── middleware.js            # Auth route protection
├── instrumentation.js       # DB init on server start
└── server.js               # Custom server (for WebSocket in Phase 3)
```

## Database

11 tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `users` | Admin accounts |
| `chats` | Chat sessions |
| `messages` | Chat messages |
| `settings` | Encrypted config store |
| `code_workspaces` | Interactive Docker sessions |
| `clusters` | Worker clusters |
| `cluster_roles` | Agent role definitions |
| `notifications` | Job alerts |
| `subscriptions` | Channel subscriptions |
| `knowledge_entries` | RAG knowledge base |
| `chat_summaries` | Cross-chat context |

## Roadmap

- **v0.1 (Current)** — Foundation: Next.js 16, auth, database, chat UI shell
- **v0.2** — Core Chat: LLM integration, streaming, Ollama setup, memory/RAG
- **v0.3** — Docker Agents: Headless mode, interactive terminal, agent jobs
- **v0.4** — GitHub + Integrations: PRs, webhooks, Telegram bot
- **v0.5** — Advanced: Clusters, monitoring dashboard, CLI tool

## Self-Hosted LLM (Ollama)

GhostBot is built for self-hosted AI. Run Ollama on your VPS:

```
URL: http://your-vps-ip:11434/v1
API Key: any value (Ollama doesn't validate)
Model: qwen2.5:32b (or any installed model)
```

The admin UI has a dedicated Ollama page with auto-model detection, connection testing, and one-click switching between cloud and self-hosted providers.

## Optional Features & Requirements

Some features are optional and require additional setup:

| Feature | Requirement | Why |
|---------|------------|-----|
| **Web Chat** | None | Works out of the box on localhost |
| **Ollama** | VPS with GPU | Self-hosted LLM, no API costs |
| **Cloud LLM** | API key (Anthropic/OpenAI/Google) | Pay-per-token, no hardware needed |
| **Docker Agents** | Docker Desktop or Docker Engine | Required for coding agents to run |
| **Telegram Bot** | Public domain with HTTPS | Telegram needs a public URL to send webhook messages to your GhostBot instance |
| **GitHub Integration** | GitHub PAT (Personal Access Token) | Required for creating branches, commits, and PRs |
| **Agent Jobs** | Docker + GitHub PAT | Autonomous coding tasks that create PRs |

### About the Telegram requirement

To use the Telegram bot feature, you need a **public domain name with HTTPS** (e.g., `https://ghostbot.yourdomain.com`). This is because Telegram sends messages to your server via webhooks — it POSTs to `https://yourdomain.com/api/telegram/webhook` whenever someone messages your bot. Localhost won't work.

**Options for getting a public URL:**
- **Own domain** (~$10/year) pointed to your VPS + free HTTPS via Let's Encrypt
- **Cloudflare Tunnel** (free) — exposes your local server to a public URL
- **ngrok** (free tier) — temporary public URL for testing

If you don't need Telegram, you can skip this entirely. The web chat works perfectly without it.

## License

MIT

<!-- ghostbot-webhook-test marker: 2026-04-08T08:18:22Z -->