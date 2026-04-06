# GhostBot — AI Coding Agent Platform

An autonomous AI coding agent platform built on Next.js 16. Inspired by ThePapeBot (reference source in `thepopebot-main/`), with custom branding, first-class Ollama support, and a dark-first ghost-themed UI.

## Architecture

Two-layer system: **Event Handler** (Next.js web app) + **Docker Agents** (ephemeral coding containers).

```
Event Handler (Next.js 16)          Docker Agent Containers
┌─────────────────────────┐         ┌──────────────────────┐
│ Web UI (chat, admin)    │         │ Claude Code / Codex  │
│ API + webhook receivers │ ──────> │ Gemini / Pi / Ollama │
│ Cron + trigger system   │         │ Git ops, shell, fs   │
│ SQLite (Drizzle ORM)    │         │ Headless or terminal │
└─────────────────────────┘         └──────────────────────┘
```

- Event handler creates `agent-job/*` branches, launches Docker agent containers, receives results, creates PRs
- Agent containers are ephemeral — clone branch, execute task, push, exit
- All accessible from any device (desktop, phone, tablet) via browser

## Brand Identity

**Name:** GhostBot
**Assets:** `assets/` folder (logo.svg, icon.svg, favicon.svg, GhostBot_color_theme.svg)

### Color Palette (from GhostBot_color_theme.svg)

| Role | Hex | Usage |
|------|-----|-------|
| **Background** | `#050509` | App background, dark surfaces |
| **Dark surface** | `#111827` | Cards, sidebar, elevated surfaces |
| **Gold accent** | `#D4AF37` | Buttons, links, active states |
| **Primary** | `#F5D97A` | Highlights, hover states, ghost icon |
| **Foreground** | `#E5E2DA` | Text, borders, subtle lines |

### Design Principles
- Dark-first design (dark mode is default, light mode secondary)
- Gold/spectral accent palette — no generic blue/purple
- Subtle ghost-themed touches where they don't hurt usability
- Standard terminology for core concepts (don't rename "Create" to "Summon" etc.)
- Tailwind CSS with custom color tokens mapped to the palette above

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, Tailwind CSS, xterm.js, Monaco Editor, AI SDK v5 |
| Backend | Node.js 18+, LangChain + LangGraph |
| Database | SQLite + Drizzle ORM (WAL mode) |
| Auth | NextAuth v5 (credentials, JWT sessions) |
| Containers | Docker (Unix socket API) |
| AI Chat | LangGraph agents with SqliteSaver |
| Voice | AssemblyAI (real-time streaming) |
| Self-hosted LLM | Ollama (Qwen 2.5 32B on VPS) via OpenAI-compatible API |
| DevOps | Docker Compose, GitHub Actions, PM2 |

## Project Structure (Target)

```
ghostbot/
├── CLAUDE.md                 # This file
├── GHOSTBOT_PROJECT_DETAILS.md  # Full analysis & build guide
├── PROJECT_OVERVIEW.md       # Original reference transcript
├── assets/                   # Brand SVGs (logo, icon, favicon, color theme)
├── thepopebot-main/          # Reference source (DO NOT MODIFY — read-only reference)
├── src/                      # GhostBot source (to be built)
│   ├── api/                  # API route handlers
│   ├── bin/                  # CLI tools (npx ghostbot init/setup/upgrade)
│   ├── config/               # Next.js config wrapper + instrumentation
│   ├── lib/
│   │   ├── ai/              # LLM integration (model factory, agents, tools, streaming)
│   │   ├── auth/            # NextAuth config, middleware, components
│   │   ├── channels/        # Platform adapters (Telegram, etc.)
│   │   ├── chat/            # Chat routes, actions, React components
│   │   ├── cluster/         # Worker clusters (roles, triggers, containers)
│   │   ├── code/            # Code workspaces (terminal, WebSocket proxy)
│   │   ├── db/              # SQLite schema, migrations, CRUD
│   │   ├── tools/           # Docker, GitHub, Telegram, Whisper integrations
│   │   └── voice/           # Voice input (AssemblyAI)
│   ├── setup/               # Interactive CLI setup wizard
│   ├── templates/           # Files scaffolded to user projects
│   └── web/                 # Next.js app (pages, server, middleware)
│       ├── app/             # App Router pages
│       ├── server.js        # Custom server (WebSocket + code proxy)
│       └── middleware.js    # Auth middleware
├── docker/                  # Docker images for agent containers
├── drizzle/                 # Auto-generated SQL migrations
└── docs/                    # Documentation
```

## Reference Source (thepopebot-main/)

The `thepopebot-main/` directory contains ThePapeBot v1.2.75 source code. This is our **read-only reference** — never modify it. Use it to understand patterns, then implement the GhostBot equivalent in `src/`.

Key reference files:
- `lib/ai/model.js` — LLM model factory (9 providers + custom OpenAI-compatible)
- `lib/ai/agent.js` — LangGraph agent singletons
- `lib/ai/tools.js` — Agent tools (job creation, coding agent)
- `lib/ai/line-mappers.js` — Per-agent output parsers
- `lib/tools/docker.js` — Docker Unix socket client (500+ lines)
- `lib/db/schema.js` — Full database schema
- `lib/chat/api.js` — All browser-facing route handlers
- `web/server.js` — Custom Next.js server with WebSocket proxy

## Build Phases

### Phase 1: Foundation (v0.1)
- Next.js 16 project with App Router + Tailwind CSS (ghost color palette)
- SQLite + Drizzle ORM with full schema
- NextAuth v5 (credentials, JWT, admin setup flow)
- DB-backed config system with AES-256-GCM encryption
- GhostBot branding throughout

### Phase 2: Core Chat + Memory (v0.2)
- LangChain + LangGraph integration
- Model factory (Anthropic, OpenAI, + custom providers)
- First-class Ollama setup (auto-detect models, connection test, VPS wizard)
- Streaming chat UI with AI SDK v5
- Chat management (create, rename, star, delete, auto-title)
- Dark-first ghost-themed design
- Token usage counting (built into LLM layer from day 1)
- **Knowledge Base (RAG):**
  - Embedding model integration (local via Ollama or cloud via OpenAI)
  - Vector store using ChromaDB (self-hosted, runs alongside Ollama on VPS)
  - Auto-embed completed conversations, code snippets, and agent job results
  - Semantic retrieval: inject relevant past context into new chat system prompts
  - DB table: `embeddings` (source_type, source_id, chunk_text, vector, metadata)
- **Cross-Chat Context Summaries:**
  - Auto-summarize each chat on completion (LLM generates 2-3 sentence summary)
  - DB table: `chat_summaries` (chat_id, summary, key_topics[], created_at)
  - On new chat: retrieve top-N relevant summaries via RAG and inject as context
  - User can view/edit/delete summaries in the UI
  - "What do you remember about X?" query support

### Phase 3: Docker Agent System (v0.3)
- Docker Unix socket client
- Headless mode (plan mode) — container launch, output streaming, job summaries
- Interactive mode (code mode) — xterm.js terminal, WebSocket proxy, Monaco editor
- Agent job management (branches, configs, volumes, notifications)
- Per-agent line mappers (Claude Code, Codex, Gemini, Pi, OpenCode)
- **Agent Memory Integration:**
  - Agent jobs can query the knowledge base for relevant past work
  - Job results auto-embedded into knowledge base on completion
  - Skill discovery: if a past job solved a similar problem, surface it

### Phase 4: GitHub + Integrations (v0.4)
- GitHub API wrapper (branches, commits, PRs, webhooks)
- Diff viewer UI
- Webhook + cron trigger system
- Telegram bot integration

### Phase 5: Advanced (v0.5)
- Cluster system (worker orchestration with roles/triggers)
- Monitoring dashboard (token usage, costs, success rates)
- CLI tool (npx ghostbot init/setup/upgrade)
- **Memory Dashboard:**
  - View all stored knowledge (summaries, embeddings, facts)
  - Search memory semantically ("what do I know about authentication?")
  - Manual memory entries (user can teach GhostBot facts)
  - Memory stats (total entries, storage size, most-referenced topics)

### Future (v2+)
- Web-based onboarding wizard
- Plugin architecture for agents
- Multi-user / team support
- User preference learning (coding style, language preferences, patterns)
- Skill auto-generation from successful agent job patterns

## Code Standards

### Naming
- Package name: `ghostbot`
- CLI command: `npx ghostbot`
- Docker images: `ghostbot:event-handler-{version}`, `ghostbot:coding-agent-{agent}-{version}`
- DB file: `data/ghostbot.sqlite`
- Config prefix: use plain names (LLM_PROVIDER, CODING_AGENT, etc.)

### Architecture Rules
- All core logic in the package (`api/`, `lib/`, `config/`, `bin/`) — NOT in templates
- Templates are for user-editable config scaffolded on init
- Next.js app source lives in `web/` — baked into Docker image, not scaffolded
- `/api` routes = external callers (x-api-key auth)
- Browser UI = fetch route handlers colocated with pages (session auth)
- `/stream/*` = SSE streaming only
- Docker interaction via Unix socket API, never CLI spawning

### Database
- SQLite via Drizzle ORM at `data/ghostbot.sqlite`
- Schema changes MUST go through Drizzle migrations (`npm run db:generate`)
- Never write raw DDL SQL manually

### Security
- Secrets encrypted with AES-256-GCM (using AUTH_SECRET via PBKDF2)
- API keys hashed with bcrypt
- OAuth tokens encrypted + LRU rotated
- Timing-safe comparisons for all secret verification
- Never store secrets in .env for production — use DB

### UI
- Tailwind CSS with GhostBot color tokens
- Dark mode default
- Components in `lib/chat/components/`, `lib/auth/components/`
- esbuild compiles JSX to ES modules before publish

## Ollama / Self-Hosted LLM Setup

GhostBot has first-class support for Ollama running on a VPS:

- **Provider type:** Custom OpenAI-compatible (routed through LangChain's ChatOpenAI)
- **Default endpoint:** `http://{VPS_IP}:11434/v1`
- **API key:** Any value (Ollama doesn't validate)
- **Model discovery:** Call `http://{VPS_IP}:11434/api/tags` to auto-detect installed models
- **Current model:** Qwen 2.5 32B
- **Docker networking:** Use `host.docker.internal:11434` when event handler runs in Docker

The admin UI should have a dedicated Ollama setup page (not just generic "custom provider"):
- URL input with "Test Connection" button
- Auto-populated model dropdown from Ollama API
- Connection status indicator
- Quick-switch between cloud (Anthropic/OpenAI) and self-hosted (Ollama)

## Memory & Knowledge System (GhostBot Differentiator)

GhostBot has a self-learning memory system that ThePapeBot lacks entirely. Three layers:

### Layer 1: Conversation Memory (inherited from ThePapeBot pattern)
- LangGraph `SqliteSaver` checkpointing per thread_id
- All messages persisted to `messages` table
- Resume any conversation with full context

### Layer 2: Knowledge Base (RAG) — NEW
- **Embedding model:** Ollama on VPS (e.g., `nomic-embed-text` or `mxbai-embed-large`) or OpenAI `text-embedding-3-small`
- **Vector store:** ChromaDB (self-hosted on VPS alongside Ollama)
- **What gets embedded:**
  - Completed chat conversations (chunked by topic)
  - Agent job results and summaries
  - Code snippets from successful builds
  - User-added manual knowledge entries
- **Retrieval flow:**
  1. New message arrives
  2. Embed the query
  3. Retrieve top-K relevant chunks from ChromaDB
  4. Inject as additional context into the system prompt
  5. Agent responds with awareness of past knowledge
- **DB schema:**
  ```sql
  -- Tracks what has been embedded (source of truth is ChromaDB)
  CREATE TABLE knowledge_entries (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,     -- 'chat', 'agent_job', 'manual', 'code'
    source_id TEXT,                -- chat_id, job_id, or NULL for manual
    title TEXT NOT NULL,
    content TEXT NOT NULL,         -- original text before chunking
    metadata TEXT,                 -- JSON: topics, language, file paths, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **ChromaDB collection:** `ghostbot_knowledge` with metadata filtering by source_type

### Layer 3: Cross-Chat Context Summaries — NEW
- On chat completion (or manually), generate a 2-3 sentence summary via LLM
- Extract key topics as tags (e.g., ["authentication", "Next.js", "middleware"])
- Store in `chat_summaries` table:
  ```sql
  CREATE TABLE chat_summaries (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id),
    summary TEXT NOT NULL,
    key_topics TEXT NOT NULL,       -- JSON array of topic strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- On new chat: embed the user's first message, retrieve relevant summaries, inject as "Here's what I remember from previous conversations about this topic..."
- Summaries are also embedded into ChromaDB for semantic search

### Memory Architecture Diagram
```
User message
    │
    ├──> LangGraph checkpoint (conversation continuity)
    │
    ├──> RAG query ──> ChromaDB ──> relevant chunks
    │                                    │
    │    ┌───────────────────────────────┘
    │    v
    ├──> System prompt + retrieved context + chat summaries
    │
    v
LLM generates response
    │
    ├──> Save to messages table
    ├──> On chat end: generate summary ──> chat_summaries table
    └──> On chat end: embed into ChromaDB for future retrieval
```

### Memory UI (Phase 5)
- Memory dashboard: browse all knowledge entries
- Semantic search: "what do I know about Docker networking?"
- Manual entries: teach GhostBot facts directly
- Edit/delete entries and summaries
- Memory stats: total entries, most-referenced topics, storage usage
