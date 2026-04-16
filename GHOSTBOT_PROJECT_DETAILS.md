# [ARCHIVE] GhostBot — Scoping & Build Guide (pre-implementation)

> This document is a historical scoping brief written BEFORE the initial
> implementation. It references ThePapeBot as the inspiration and describes
> the intended architecture. For what was actually built and how to work
> on the current codebase, see:
>
> - **[CLAUDE.md](CLAUDE.md)** — entrypoint for any Claude session, lists what's shipped and what's parked
> - **[README.md](README.md)** — user-facing overview, quick-start, security posture
> - **[docs/OLLAMA_QWEN_SETUP.md](docs/OLLAMA_QWEN_SETUP.md)** — Ollama VPS setup and KVM8 migration
> - **[docs/superpowers/](docs/superpowers/)** — design specs and implementation plans for major features
>
> Kept for context on the "why" behind architectural decisions.

---


## What is the Reference Project (ThePapeBot)?

ThePapeBot is an **open-source autonomous AI coding agent platform** (1,400+ GitHub stars, MIT license) that lets you run any coding agent (Claude Code, Codex, Gemini CLI, Pi, OpenCode, Kimi) from a **unified browser interface** across desktop, phone, or headlessly in the background.

**Reference video:** https://www.youtube.com/watch?v=Y56FXjM_wuE&t=315s
**Reference source:** `thepopebot-main/` (v1.2.75)

---

## Core Concept

The system has a **two-layer architecture**:

```
+--------------------------------------------+
|         EVENT HANDLER (Next.js App)        |
|  - Web UI (chat, admin, workspaces)        |
|  - API endpoints + webhook receivers       |
|  - Cron scheduler + trigger system         |
|  - Cluster runtime (worker orchestration)  |
|  - SQLite database (Drizzle ORM)           |
+--------------------+-----------------------+
                     |  launches via Docker API
                     v
+--------------------------------------------+
|        DOCKER AGENT (Coding Container)     |
|  - Claude Code / Codex / Gemini / etc.     |
|  - Full shell + filesystem access          |
|  - Git operations (commit, push, PR)       |
|  - Runs headless or interactive            |
+--------------------------------------------+
```

The **event handler** is your always-on web app. The **Docker agents** are ephemeral containers that do the actual coding work. This separation is what enables the "code from your phone while riding a bike" experience - the agents run on a server, you interact through any browser.

---

## Key Features (What GhostBot Should Replicate)

### 1. Multi-Device Browser Interface
- Full chat UI accessible from desktop, tablet, phone
- Voice-to-text input (AssemblyAI integration)
- PWA installable on mobile
- Multiple projects/tabs open simultaneously

### 2. Two Chat Modes
- **Plan Mode (Headless):** Dictate what you want, the agent builds it in the background. Perfect for mobile/on-the-go. You get a summary when done.
- **Code Mode (Interactive):** Full terminal experience in the browser (xterm.js). Like SSH into a dev machine. You interact directly with the coding agent.

### 3. Multi-Agent Support (6+ coding agents)
| Agent | Type |
|-------|------|
| Claude Code | Default, OAuth or API key |
| OpenAI Codex CLI | API key |
| Google Gemini CLI | API key |
| Pi Coding Agent | API key |
| OpenCode | Open source |
| Kimi CLI | API key |

Switching agents = settings toggle. All use the same Docker container pattern.

### 4. Multi-LLM Provider Support (9 built-in + custom + Ollama)
Anthropic, OpenAI, Google, DeepSeek, MiniMax, Mistral, xAI Grok, Kimi, OpenRouter, plus any OpenAI-compatible endpoint. **Ollama is natively supported** via the custom provider system -- point it at your VPS running Qwen 2.5 32B (or any Ollama model) at `http://your-vps:11434/v1`.

### 5. GitHub Integration
- Auto-create branches and commits
- Push code, create PRs
- Built-in diff viewer
- AI-powered conflict resolution
- Webhook triggers on GitHub events

### 6. Cluster System (Worker Orchestration)
- Define "clusters" of Docker agents with specific roles
- Each role has its own system prompt, trigger config, concurrency limits
- Triggers: manual, webhook, cron schedule, file watch
- Run teams of agents 24/7

### 7. Webhook & Cron Triggers
- JSON-configured triggers that fire agent jobs
- Template tokens: `{{body.field}}`, `{{datetime}}`, `{{skills}}`
- Schedule recurring agent tasks with cron expressions

### 8. Telegram Bot Integration
- Chat with your coding agent via Telegram
- Voice messages transcribed via Whisper
- Typing indicators, message splitting, markdown conversion

### 9. Built-in Code Editor & Diff Viewer
- Monaco editor for file inspection
- Git diff viewer showing all changes
- Branch management controls

### 10. Security
- AES-256-GCM encryption for secrets/tokens
- bcrypt-hashed API keys
- OAuth token rotation (LRU)
- Timing-safe comparisons
- NextAuth v5 session management

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, **Next.js 16** (App Router), Tailwind CSS, xterm.js, Monaco Editor, AI SDK v5 |
| **Backend** | Node.js 18+, Next.js API routes, LangChain + LangGraph |
| **Database** | SQLite + Drizzle ORM (WAL mode) |
| **Auth** | NextAuth v5 (credentials provider, JWT sessions) |
| **Containers** | Docker (Unix socket API, not CLI spawning) |
| **AI Chat** | LangGraph agents with SqliteSaver for conversation memory |
| **Voice** | AssemblyAI (real-time streaming transcription) |
| **Self-Hosted LLM** | Ollama (Qwen 2.5 32B on VPS) via OpenAI-compatible API |
| **DevOps** | Docker Compose, GitHub Actions, PM2 |

---

## Source Code Architecture (thepopebot-main/)

### Directory Map

```
thepopebot-main/
  api/index.js              # All external API routes (single catch-all handler)
  bin/
    cli.js                  # npx thepopebot <command> (init, setup, upgrade, etc.)
    managed-paths.js        # Auto-synced template files
    docker-build.js         # Docker image builder
    postinstall.js          # npm postinstall hook
  config/
    index.js                # withThepopebot() Next.js config wrapper
    instrumentation.js      # Server startup sequence (DB init, cron load, etc.)
  lib/
    paths.js                # PROJECT_ROOT resolution
    config.js               # Config system (DB -> env -> defaults, encrypted secrets)
    actions.js              # Action dispatcher (agent/command/webhook)
    cron.js                 # Cron scheduler (node-cron)
    triggers.js             # Webhook trigger system
    maintenance.js          # Hourly cleanup (orphaned API keys, containers)
    ai/
      index.js              # chat(), chatStream(), summarizeAgentJob(), autoTitle()
      agent.js              # LangGraph agent singletons (agent chat + code chat)
      tools.js              # Agent tools (agentJobTool, codingAgentTool)
      model.js              # LLM model factory (9 providers + custom)
      headless-stream.js    # Docker frame decoder -> NDJSON -> events
      line-mappers.js       # Per-agent JSON output parsers
    auth/
      config.js             # NextAuth route handler config
      edge-config.js        # Edge-safe auth (proxy layer)
      (note) proxy.js at src/ level handles route interception
      actions.js            # setupAdmin(), signOut()
      components/           # Login/setup forms
    db/
      schema.js             # All tables: users, chats, messages, workspaces, clusters, etc.
      index.js              # Lazy DB singleton + migrations
      config.js             # getConfigValue/Secret, setConfigValue/Secret, migrateEnvToDb
      api-keys.js           # API key CRUD (bcrypt hashed)
      oauth-tokens.js       # OAuth token storage (AES-256-GCM encrypted, LRU rotation)
      crypto.js             # Encryption utilities
      chats.js              # Chat CRUD
      code-workspaces.js    # Workspace CRUD
      clusters.js           # Cluster/role CRUD
      notifications.js      # Notification CRUD
    chat/
      api.js                # All browser-facing route handlers (streaming, repos, diffs, etc.)
      actions.js            # Server actions (rename, delete, star, container management)
      components/           # React chat UI components
    code/
      index.js              # Workspace launcher (headless containers + Playwright)
      terminal-sessions.js  # Per-user terminal state
      ws-proxy.js           # WebSocket proxy for in-browser terminal
    cluster/
      execute.js            # canRunRole(), runClusterRole(), concurrency gate
      runtime.js            # Boot: load roles, schedule crons, file watchers
      stream.js             # SSE for real-time container logs
      actions.js            # Server actions for cluster CRUD
    channels/
      base.js               # ChannelAdapter interface
      telegram.js           # Telegram bot adapter (300+ lines)
      index.js              # Channel factory
    tools/
      create-agent-job.js   # Job creation (title gen -> config -> branch push -> container launch)
      github.js             # GitHub API wrapper (repos, workflows, PRs)
      docker.js             # Docker Unix socket client (500+ lines, containers, images, logs)
      telegram.js           # Telegram API (send, edit, reactions, voice)
      openai.js             # Whisper transcription
    voice/
      actions.js            # AssemblyAI token server action
      useVoiceInput.js      # Client hook (AudioWorklet + WebSocket streaming)
  setup/
    setup.mjs               # Interactive CLI wizard
    lib/                    # Wizard modules (github, telegram, providers, auth, env, sync)
  templates/                # Files scaffolded to user projects on init
  web/
    app/                    # Next.js App Router pages
      page.js               # Home/chat
      chat/[chatId]/        # Individual chat page
      code/[workspaceId]/   # Interactive workspace (terminal + editor)
      clusters/             # Cluster dashboard
      admin/                # Admin dashboard
      triggers/             # Webhook triggers UI
    server.js               # Custom Next.js server (WebSocket + code proxy)
    proxy.js                 # Next 16 route interception (replaces old middleware.js)
  drizzle/                  # Auto-generated SQL migrations
  docs/                     # Extended documentation (20+ files)
```

### Database Schema (SQLite)

| Table | Purpose |
|-------|---------|
| `users` | Admin accounts (email + bcrypt password) |
| `chats` | Chat sessions (thread_id, title, mode, workspace link) |
| `messages` | Chat messages (role, content, timestamps) |
| `code_workspaces` | Interactive Docker sessions (repo, branch, feature_branch) |
| `notifications` | Job completion alerts |
| `subscriptions` | Channel subscriptions (Telegram chat IDs) |
| `clusters` | Worker clusters (name, system_prompt, enabled) |
| `cluster_roles` | Role definitions (prompt, trigger_config, max_concurrency) |
| `settings` | Key-value config store (encrypted secrets + plaintext config) |

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ping` | Health check |
| POST | `/api/create-agent-job` | Create new coding job |
| GET | `/api/agent-jobs/status` | Docker container status |
| POST | `/api/telegram/webhook` | Telegram message handler |
| POST | `/api/github/webhook` | GitHub event handler |
| POST | `/api/cluster/:id/role/:id/webhook` | Cluster role trigger |
| GET | `/api/oauth/callback` | OAuth token callback |
| GET | `/stream/chat` | SSE streaming chat |
| GET | `/stream/containers` | SSE container status |

### NPM Package Exports

The project is published as an npm package (`thepopebot`) with modular exports:

```
./api           -> API route handler
./config        -> Next.js config wrapper
./instrumentation -> Server startup hook
./auth          -> Authentication module
./chat          -> Chat UI components
./chat/api      -> Chat route handlers
./code          -> Code workspace manager
./cluster       -> Cluster UI components
./voice         -> Voice input module
./db            -> Database module
./oauth         -> OAuth helpers
./maintenance   -> Cleanup tasks
```

---

## How to Build GhostBot (Step-by-Step Plan)

### Phase 1: Foundation

**1.1 Project Setup**
- Initialize **Next.js 16** project with App Router
- Set up Tailwind CSS + shadcn/ui components
- Configure SQLite + Drizzle ORM
- Create database schema (users, chats, messages, settings, workspaces)
- Implement AES-256-GCM encryption for secrets

**1.2 Authentication**
- NextAuth v5 with credentials provider
- First-user setup flow (admin creation)
- JWT session strategy
- Auth proxy for protected routes (`src/proxy.js`)

**1.3 Configuration System**
- DB-backed config with encrypted secrets
- Resolution chain: DB -> env vars -> defaults
- Config UI in admin panel

### Phase 2: Core Chat

**2.1 LLM Integration**
- LangChain + LangGraph setup
- Model factory supporting multiple providers (start with Anthropic + OpenAI)
- **Ollama integration** via OpenAI-compatible custom provider system (Qwen 2.5 32B on VPS)
- SqliteSaver for conversation memory/checkpointing
- Streaming chat with AI SDK v5

**2.2 Chat UI**
- React chat interface with message history
- Streaming responses
- Chat list sidebar (create, rename, star, delete)
- Auto-title generation after first message
- Dark/light mode toggle

**2.3 Voice Input**
- AssemblyAI real-time transcription
- AudioWorklet for PCM encoding
- WebSocket streaming to transcription API

### Phase 3: Docker Agent System

**3.1 Docker Integration**
- Unix socket client for Docker API (not CLI spawning!)
- Container lifecycle: create, start, stop, remove, logs
- Image pull management
- Network detection for container communication

**3.2 Headless Mode (Plan Mode)**
- Launch coding agent in Docker container
- Stream container output (Docker frame decoder -> NDJSON -> events)
- Per-agent output parsers (Claude Code, Codex, Gemini, etc.)
- Job completion summaries via AI

**3.3 Interactive Mode (Code Mode)**
- xterm.js terminal in browser
- WebSocket proxy to Docker container
- Monaco editor for file viewing
- Git diff viewer

**3.4 Agent Job Management**
- Git branch creation per job
- Config file generation
- Container volume management
- Status tracking and notifications

### Phase 4: GitHub Integration

**4.1 Git Operations**
- GitHub API wrapper (PAT auth)
- Branch creation via Git Data API
- Commit and push from agent containers
- PR creation

**4.2 Diff Viewer**
- Visual diff display in UI
- File change summary
- Branch comparison

### Phase 5: Advanced Features

**5.1 Cluster System**
- Cluster CRUD (groups of agent roles)
- Role definitions with system prompts
- Concurrency limits per role
- Multiple trigger types: manual, webhook, cron, file watch
- Real-time log streaming via SSE

**5.2 Webhook & Cron Triggers**
- JSON-configured trigger definitions
- Template token resolution
- Action dispatcher (agent/command/webhook)
- Cron scheduler with node-cron

**5.3 Telegram Integration**
- Bot registration and webhook setup
- Message handling (text, voice, documents)
- Whisper transcription for voice messages
- Markdown-to-Telegram HTML conversion

### Phase 6: CLI & Distribution

**6.1 CLI Tool**
- `npx ghostbot init` - scaffold project
- `npx ghostbot setup` - interactive wizard
- `npx ghostbot upgrade` - auto-upgrade
- Template file management

**6.2 Docker Compose Setup**
- Production-ready docker-compose.yml
- Event handler + agent containers
- Volume management

**6.3 GitHub Actions**
- CI/CD workflows for auto-deployment
- Docker image building

---

## GhostBot vs ThePapeBot: Customization Opportunities

### Quick Comparison

| Area | ThePapeBot | GhostBot Opportunity |
|------|-----------|---------------------|
| **Branding** | ThePapeBot name/logo | GhostBot branding (assets already designed!) |
| **Framework** | Next.js 15 | **Next.js 16** (latest features) |
| **Default Agent** | Claude Code | Could default to any agent |
| **Self-Hosted LLM** | Supported via custom provider | **First-class Ollama support** (Qwen 2.5 32B on VPS) |
| **UI Theme** | Standard dark/light | Ghost-themed dark UI with custom color palette |
| **Landing Page** | Basic | Custom ghost-themed landing |
| **Notifications** | Basic bell icon | Ghost-themed notification system |
| **Onboarding** | CLI wizard | Could add web-based setup wizard |
| **Monitoring** | Basic container status | Enhanced dashboard with metrics |
| **Plugin System** | Hardcoded agents | Plugin architecture for new agents |

### Detailed Differentiation Areas

**1. Branding & Identity**
ThePapeBot ships with generic branding. GhostBot already has a full SVG asset kit (logo, icon, favicon, color theme). This means a completely custom identity from day one -- every screen, every email, every notification carries the GhostBot brand. The ghost theme opens up creative UI possibilities (ghost animations, spectral color gradients, "haunt" instead of "run" for agent jobs).

**2. Next.js 16 Upgrade**
ThePapeBot runs Next.js 15. GhostBot targets **Next.js 16** which brings:
- Improved Turbopack performance (faster dev builds)
- Better React 19 integration
- Enhanced server components
- Improved proxy (formerly middleware) and Edge Runtime
- Better streaming support (critical for our chat UI)

**3. First-Class Ollama / Self-Hosted LLM Support**
ThePapeBot supports Ollama through the generic "custom OpenAI-compatible provider" dialog. GhostBot can differentiate by making self-hosted models a **first-class experience**:
- Dedicated Ollama setup page (auto-detect models via `ollama list` API)
- VPS connection wizard (enter your server URL, test connection, auto-discover models)
- Model performance dashboard (tokens/sec, memory usage from Ollama metrics API)
- One-click model switching between cloud (Anthropic/OpenAI) and self-hosted (Ollama)
- Cost comparison tool (VPS ~€400/yr vs €4,000+ local hardware vs per-token cloud APIs)
- This is a major differentiator -- self-hosted gives predictable fixed costs, no per-token billing, no rate limits, and full privacy. A GPU VPS at ~€30-50/month beats buying a €4,000 Mac Studio, and you can access it from any device anywhere

**4. Ghost-Themed UI/UX**
- Dark mode as default (ghost theme = dark aesthetic)
- Custom color palette from `GhostBot_color_theme.svg`
- Spectral animations for agent activity (ghost "working" indicators)
- Themed terminology: "Summon" an agent, "Haunt" a repo, agent "Spirits"
- Custom loading states and empty states with ghost illustrations

**5. Web-Based Onboarding (vs CLI)**
ThePapeBot requires running `npx thepopebot setup` in a terminal. GhostBot could offer:
- Browser-based setup wizard (no terminal needed)
- Step-by-step guided flow with live validation
- Docker status detection from the web UI
- GitHub OAuth integration (vs manual PAT creation)
- More accessible for non-technical users

**6. Enhanced Monitoring Dashboard**
ThePapeBot has basic container status. GhostBot could add:
- Agent job history with timeline view
- Token usage tracking per provider/model
- Cost estimation dashboard
- Container resource usage (CPU, memory from Docker stats API)
- Success/failure rates per agent type

**7. Plugin Architecture for Agents**
ThePapeBot hardcodes 6 agents with per-agent line mappers. GhostBot could implement:
- Agent plugin interface (standardized input/output contract)
- Drop-in agent definitions (JSON config + line mapper)
- Community agent marketplace
- Custom agent wrappers (wrap any CLI tool as a coding agent)

**8. Multi-User Support**
ThePapeBot is single-admin. GhostBot could add:
- Team workspaces with role-based access
- Per-user agent quotas
- Shared project libraries
- Activity feed across team members

---

## Assets Available

| File | Description |
|------|-------------|
| `assets/logo.svg` | GhostBot text logo |
| `assets/icon.svg` | GhostBot app icon |
| `assets/favicon.svg` | GhostBot favicon |
| `assets/GhostBot_color_theme.svg` | Brand color theme reference |

---

## Getting Started (Quick Reference)

**Prerequisites:**
- Node.js 18+
- Docker Desktop
- Git + GitHub account
- GitHub PAT (Personal Access Token)
- At least one LLM API key (Anthropic recommended)

**Development:**
```bash
# Clone and install
npm install

# Run setup wizard
npx ghostbot setup

# Start development
docker-compose up
```

---

## Estimated Complexity

| Component | Effort | Lines of Code (approx) |
|-----------|--------|----------------------|
| Database + Auth | Medium | ~800 |
| Chat UI + Streaming | High | ~1500 |
| Docker Integration | High | ~700 |
| LLM Integration (LangGraph) | High | ~600 |
| Headless Agent Runner | High | ~500 |
| Interactive Terminal | High | ~400 |
| GitHub Integration | Medium | ~300 |
| Cluster System | High | ~600 |
| Telegram Bot | Medium | ~400 |
| CLI Tool | Medium | ~600 |
| Voice Input | Medium | ~200 |
| **Total** | **~6,600 lines of core logic** |

The reference project (thepopebot-main) has ~470 files across 146 directories, but the core logic is concentrated in `lib/` (~3,000 lines) and `web/` (~2,000 lines). The rest is configuration, templates, migrations, and documentation.

---

*This document was generated from analysis of thepopebot-main v1.2.75 source code.*
