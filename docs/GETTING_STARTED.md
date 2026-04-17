# Getting Started with GhostBot

Welcome. GhostBot is your personal AI coding workshop, running on your own server. This guide walks you through the mental model, the first 15 minutes after installation, what you can actually do with it day-to-day, and — honestly — what it's not built for.

If you haven't installed GhostBot yet, start with the [README](../README.md) for Docker Compose + Dokploy quick-start. If you want to kick the tires first, try the live demo at **[demo.ghostbot.dev](https://demo.ghostbot.dev)** — agent jobs and secret saves are disabled, but everything else is real.

---

## 1. What GhostBot actually is

Think of it as three things glued together by one Next.js app:

1. **A chat interface** against any LLM — cloud (Anthropic, OpenAI, Google) or a self-hosted Ollama model on your own VPS.
2. **A coding-agent launcher** — you write "fix the thing" in chat, GhostBot spins up a Docker container, clones your repo, runs a real coding agent (Aider, OpenCode, Codex, or Gemini CLI), commits the fix, and opens a PR. You get a Telegram/Slack ping when it's done.
3. **A memory system** — every chat is auto-summarised and embedded. When you start a new chat on a related topic, GhostBot retrieves the relevant past context automatically. It's a searchable, self-organising notebook that stays with you across sessions.

Everything runs on your server. SQLite + WAL mode, no external services unless you invite them (a cloud LLM API, a GitHub PAT, Telegram/Slack). Secrets are encrypted at rest with AES-256-GCM.

---

## 2. Your first 15 minutes

### Setup wizard (first login)

The first time you log in as the owner, GhostBot redirects you to `/setup` — a 5-step wizard that walks you through LLM, Docker, GitHub, and notifications in one flow. Each step tests its config live before moving on.

- **LLM** is the only required step. Without it, chat doesn't work.
- **Docker** is skippable if you only care about chat — you won't be able to launch coding agents until the socket proxy is wired up.
- **GitHub** is skippable but unlocks `/ghostbot` PR comments and agent PRs.
- **Notifications** (Telegram + Slack) are purely optional quality-of-life.

The wizard is re-openable any time from the admin navigation if you want to reconfigure.

### Open your first chat

After finishing the wizard (or clicking "Start using GhostBot →" at the end), you land on `/` — a fresh chat. Type anything. Responses stream token-by-token over Server-Sent Events. Code blocks come with copy buttons.

Try:
- A regular question: "what's the difference between useMemo and useCallback?"
- A multi-turn refinement: drill into something, then ask "okay now rewrite that for TypeScript with full generics"
- Paste an image: if your LLM supports vision (Claude, GPT-4o, Gemini, or a multimodal Ollama model), GhostBot accepts clipboard images — great for "what's wrong with this UI screenshot?"

### Connect a project

Navigate to **Projects** in the sidebar → **+ Add project**. Three ways to start one:

- **Upload** — drag a folder from your desktop
- **Clone** — paste a git URL (validated against a strict allowlist; no shell injection possible)
- **Connect existing** — point at a folder already on the server

Each project gets a `CLAUDE.md` at its root. When you attach a project to a chat (folder icon in the chat input), that `CLAUDE.md` is auto-injected into the system prompt. Treat it as the project's permanent memory — tech stack, conventions, current state, known issues. The more you put in it, the better the LLM understands what it's working with.

### Launch your first agent job

In a chat with a project attached, click the wrench icon next to the mic. Write a prompt:

> Add a README section explaining how to run tests.

Pick Aider (the default — works with any LLM including small self-hosted ones). Click Launch. A live job card appears in the chat. You can watch the container logs stream, see the PR URL when it pushes, and click **View diff** to inspect the changes inline (side-by-side or unified toggle).

Default resource limits per agent: 2 GB memory, 1 CPU, 256 PIDs, 15-minute wall-clock timeout.

### Turn on notifications (optional)

**Admin → Telegram** or **Admin → Slack**. Paste the relevant credentials, test the connection, save. You'll get pings when agent jobs succeed or fail — handy when you've fired a few and don't want to babysit the UI.

### Voice input

The chat input has a microphone button (bottom-left). Click it, speak, click again to stop. Final transcripts land in the textarea. Uses the browser's built-in SpeechRecognition API — no server round-trip, no transcription API cost. Works on Chrome, Edge, Safari (macOS + iOS). Hidden on browsers that don't support it (Firefox).

### Install as a PWA

On mobile Safari / Chrome / Edge: open GhostBot → share/menu → **Add to Home Screen**. It installs as a standalone app with the GhostBot icon, opens without the browser chrome. Offline shell cache keeps the frame loading on flaky networks; the chat itself still needs connectivity.

---

## 3. What you can actually do with it

### Day-to-day use cases

- **Ask coding questions with your own repo as context** — attach a project, ask anything. The LLM sees `CLAUDE.md` automatically; attach specific files if you want them in-context too.
- **"Why is this broken?"** — paste a screenshot of a broken UI, or a stack trace, or terminal output. Vision-capable LLMs read screenshots. Non-vision LLMs still handle text pastes fine.
- **"Implement X"** — agent jobs. Describe the change, pick the agent, hit launch. Works best on small focused changes (not "rewrite the whole auth system"). Typically 30 seconds to a few minutes per job.
- **"Review this PR"** — cluster pipelines. Create a cluster from the **PR Reviewer** template, point it at any PR, get a reviewer/tester/summariser chain run automatically.
- **"Summarise what I worked on this week"** — the AI Scanner runs daily and writes self-reflection insights into the knowledge base. Search them in **Admin → Memory**.
- **"Something fell over overnight"** — if you've wired up Telegram/Slack, any agent job failure pings you immediately. No need to keep the tab open.
- **Dictate commit messages / chat prompts** — mic button. Especially useful on mobile or while walking.
- **Build something from a one-line goal** — the Autonomous Builder takes "build a Next.js blog with auth and comments", plans it as a sequence of agent jobs, runs them with retries and progress tracking, and writes the result into a new project.
- **GitHub PR triggers** — comment `/ghostbot fix this bug` on any PR. The bot picks it up, makes the fix, pushes a commit. Great for when you spot something small from a phone.

### Cluster templates worth trying first

- **PR Reviewer** — planner → reviewer → summariser. "What did this PR actually do and is it safe?"
- **Docs Writer** — extractor → writer → editor. Regenerates README sections from code.
- **Test Coverage Bot** — coverage analyser → test writer → test runner. Fills coverage gaps.
- **Dependency Updater** — outdated scanner → updater → test runner. Patches-then-verifies.

One click to create a cluster from a template. Customise the prompts after if you want different behaviour.

### Multi-user invites

**Admin → Users → Invite**. Generates a one-time link. Each invited user gets their own chat history and memory — isolated at the DB layer. Use for small trusted teams. Do **not** use for public signups.

### VS Code extension

Sideload the `.vsix` (see [vscode-extension/README.md](../vscode-extension/README.md)) or install from the Marketplace (once [published](../vscode-extension/PUBLISHING.md)). The extension mounts GhostBot in a sidebar panel inside VS Code. Highlight code → `⌘⇧↵` to send selection to chat. CodeLens "Ask GhostBot about this" appears above functions.

---

## 4. What NOT to do / limits

GhostBot is built for **small trusted deployments** — a personal VPS, a home server, a 5–10 person team. It is explicitly not built for everything. Honest list of limits:

### Don't use it for public multi-tenant hosting

GhostBot's threat model assumes admins are trusted. The docker-socket-proxy sandbox limits what the app can do on the host, but agent containers still get generous resource limits and a real LLM connection. A hostile admin (or an invited `user`-role account with a privilege-escalation bug) is outside the threat model. Don't hand admin to strangers.

### Don't expose it without a real secret configuration

Every webhook receiver fails closed when its secret is unset (by design — that's a feature, not a bug). If you skip the GitHub webhook secret, `/ghostbot` PR triggers won't work; if you skip the Telegram secret, the Telegram bot won't accept updates. Fill them in before relying on any integration.

### Don't expect horizontal scaling

It's a single-server architecture. One SQLite file, one in-process SSE bus, one rate-limit store. Works beautifully for 10–20 concurrent users. Past that you need to migrate to Redis pub/sub + Postgres/Turso — documented in [SCALING.md](SCALING.md) but it's real work.

### Don't expect a small LLM to write production code

Agent output quality is entirely model-dependent. Qwen 2.5-coder 32B on a KVM8 gives you serious capability. `qwen2.5-coder:1.5b` (what the demo runs on) is fine for toy tasks but won't handle your production codebase. If coding agents feel dumb, the model is too small.

### Don't trust cross-user content in system prompts

Skill templates, cluster system prompts, and project `CLAUDE.md` files are persisted. In multi-user deployments, a user with write access to a shared resource can plant stored prompt-injection. Server-side ownership checks prevent the obvious cases (user B editing user A's skill) but anything a user legitimately owns is their problem — don't let invited users edit things the owner reads.

### Don't skip the hardening checklist before exposing beyond your perimeter

See the [Security section of the README](../README.md#security) and [SECURITY.md](../SECURITY.md). Must-haves before public exposure: docker-socket-proxy in place (ships by default in compose), `ENCRYPTION_KEY` set (not just `AUTH_SECRET`), every webhook secret populated, `DOCKER_HOST` pointed at the proxy.

### Don't expect the demo to behave like production

[demo.ghostbot.dev](https://demo.ghostbot.dev) has `DEMO_MODE=true`: agent jobs are disabled, secret saves silently no-op, DB resets every 24h. If you want to benchmark what your own self-host will feel like, you need to actually self-host.

---

## 5. Where to go next

After you're comfortable with the basics:

- **[README.md](../README.md)** — architecture diagram, tech stack, full feature list, security overview
- **[SECURITY.md](../SECURITY.md)** — threat model, hardening checklist, disclosure policy
- **[docs/SCALING.md](SCALING.md)** — single-server ceiling + horizontal-growth migration path
- **[docs/OLLAMA_QWEN_SETUP.md](OLLAMA_QWEN_SETUP.md)** — Ollama VPS setup + KVM8 migration for Qwen 2.5-coder 32B
- **[docs/DEMO.md](DEMO.md)** — how demo.ghostbot.dev is deployed (useful if you want your own sandboxed instance)
- **In-app `/docs`** — per-admin-page reference once you're logged in

If you get stuck, the in-app `/docs` has a Troubleshooting section covering the top 8 papercuts (LLM errors, agent jobs that won't launch, PAT scope problems, Telegram delivery, memory/embedding failures, wizard redirect loops, static asset 404s, where to find Dokploy logs).

---

## Quick tips from using it day-to-day

- **Keep `CLAUDE.md` current** in every project. It's the single highest-leverage file. The Autonomous Builder auto-updates the "What's shipped" section — leverage that.
- **Use skills for things you ask 5+ times a week.** `/rename-component`, `/add-test`, `/convert-to-typescript` — whatever your repeat prompts are, make them skills in **Admin → Skills**. Typed with `/` in chat, they expand with `{{input}}` substitution.
- **Turn on per-chat memory opt-out** for chats you don't want saved (throwaway experiments, sensitive content). Chat settings gear → Memory toggle.
- **One project per chat** — don't attach multiple projects to the same chat. Context gets confused.
- **Small focused agent prompts beat big vague ones.** "Add a dark-mode toggle with the existing theme context" works. "Redesign the UI" doesn't.
- **Keep the wizard link handy.** After you deploy you'll tweak LLM providers, add secrets, test connections. `/setup` (or Admin → Setup) re-opens it any time.

Good luck. If you hit something the docs don't cover, open an issue on [github.com/flndrnai/ghostbot](https://github.com/flndrnai/ghostbot).
