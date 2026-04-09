'use client';

import { useState } from 'react';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'llm-providers', label: 'LLM Providers' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'chat', label: 'Chat Settings' },
  { id: 'agents', label: 'Agents' },
  { id: 'github', label: 'GitHub' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'slack', label: 'Slack' },
  { id: 'triggers', label: 'Triggers' },
  { id: 'crons', label: 'Crons' },
  { id: 'containers', label: 'Containers' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'memory', label: 'Memory' },
  { id: 'backup', label: 'Backup' },
  { id: 'users', label: 'Users' },
  { id: 'clusters', label: 'Clusters' },
  { id: 'agent-jobs', label: 'Agent Jobs (chat)' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'attachments', label: 'File & image attachments' },
  { id: 'vscode', label: 'VS Code extension' },
  { id: 'setup-checklist', label: 'Setup order' },
];

export function DocsContent() {
  const [active, setActive] = useState('overview');

  function jump(id) {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex h-[100dvh] flex-col md:h-[calc(100vh-1px)]">
      <MobilePageHeader title="Docs" />
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">GhostBot Docs</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          What every Admin section is, what it does, and why you need it.
        </p>
      </div>

      {/* Mobile-only horizontal TOC */}
      <div className="md:hidden border-b border-border/50 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-1 px-3 py-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => jump(s.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                active === s.id
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sticky table of contents — desktop only */}
        <aside className="hidden md:block w-64 border-r border-border/50 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  active === s.id
                    ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main docs */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-10 sm:py-8">
          <div className="mx-auto max-w-3xl space-y-12">

            <Section id="overview" title="Overview">
              <p>
                GhostBot is a self-hosted AI coding agent platform. The Admin area is where you wire up
                the moving parts: which LLM to talk to, which coding agents are available, where to push
                code, and what triggers automated runs.
              </p>
              <p>
                You only need to configure the sections that match how you intend to use GhostBot. A
                bare-minimum setup is just <strong>LLM Providers</strong> + <strong>Ollama</strong>. Everything
                else is optional and additive.
              </p>
            </Section>

            <Section id="llm-providers" title="1. LLM Providers">
              <Block label="What it is">
                The control panel that decides which Large Language Model powers all chats and the
                titling logic. GhostBot supports Anthropic Claude, OpenAI, Google Gemini, and any
                self-hosted Ollama model.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Select the active provider (Anthropic, OpenAI, Google, Ollama)</li>
                  <li>Pick the specific model name</li>
                  <li>Save API keys for cloud providers (encrypted at rest with AES-256-GCM)</li>
                  <li>Run a Test Connection to confirm the LLM is reachable</li>
                  <li>Lock in the active provider with a green Connected card</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Without an active provider + a saved model name, no chat can stream a response. This
                is the first thing you set up.
              </Block>
              <Block label="How to use">
                Pick <code>Ollama (Local)</code>, type the exact model name from <code>ollama list</code>
                {' '}(e.g. <code>qwen2.5-coder:7b</code>), click <strong>Save & Apply</strong>. The card flips
                to a green Connected state. Use Disconnect to clear and start over.
              </Block>
            </Section>

            <Section id="ollama" title="2. Ollama Setup">
              <Block label="What it is">
                A dedicated page for connecting to a self-hosted Ollama instance, separate from
                the generic LLM Providers page so the workflow is faster and clearer.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Stores the Ollama base URL (e.g. <code>http://187.124.209.17:11434</code>)</li>
                  <li>Auto-tests the connection on page load</li>
                  <li>Auto-discovers all installed models via Ollama&apos;s <code>/api/tags</code> endpoint</li>
                  <li>Lets you click <strong>Set Active</strong> on any installed model</li>
                  <li>Strips trailing slashes from URLs to prevent <code>//api</code> bugs</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Self-hosted models are zero per-token cost and stay private. Ollama is the easiest
                way to run open models locally or on a VPS, and GhostBot integrates with it natively
                via its OpenAI-compatible <code>/api/chat</code> endpoint.
              </Block>
              <Block label="How to use">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Install Ollama on your VPS (<code>curl -fsSL https://ollama.com/install.sh | sh</code>)</li>
                  <li>Pull a model (<code>ollama pull qwen2.5-coder:7b</code>)</li>
                  <li>Expose port 11434 to your GhostBot server (firewall it to that IP only)</li>
                  <li>Paste the URL here, click Test & Save, then Set Active on the model</li>
                </ol>
                See <code>docs/OLLAMA_QWEN_SETUP.md</code> in the repo for the full migration guide.
              </Block>
            </Section>

            <Section id="chat" title="3. Chat Settings">
              <Block label="What it is">
                Tuning knobs for how the LLM behaves in every chat conversation.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>System Prompt</strong> — the instruction the model receives before every conversation</li>
                  <li><strong>Max Tokens</strong> — upper bound on response length</li>
                  <li><strong>Temperature</strong> — 0.0 = deterministic, 1.0 = creative</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Defaults work, but tuning the system prompt is how you turn GhostBot into a
                specialist (e.g. &quot;you are a Rust expert&quot;). Lower temperature = more
                consistent code; higher = more variety.
              </Block>
              <Block label="How to use">
                Recommended for code: <code>temperature 0.2</code>, <code>max_tokens 4096</code>. Keep
                the system prompt terse — Qwen Coder responds best to direct instructions.
              </Block>
            </Section>

            <Section id="agents" title="4. Agents">
              <Block label="What it is">
                A registry of <em>coding agents</em> — CLI tools that can autonomously read, write,
                and commit code in a sandboxed Docker container. Different from the chat LLM.
              </Block>
              <Block label="What it does">
                Lists which agent CLIs are installed and configured in your GhostBot Docker
                images: Claude Code, Codex, Gemini CLI, Pi, OpenCode, Kimi CLI, etc. Each agent
                has its own auth token and per-agent line parser.
              </Block>
              <Block label="Why you need it">
                Chat answers questions; agents <em>do</em> work. If you want GhostBot to actually
                modify a repo, run tests, and open a PR autonomously, you need at least one
                coding agent configured.
              </Block>
              <Block label="How to use">
                For now, this is informational — agent images are baked into the Docker setup.
                When you launch an agent job from chat, GhostBot picks the active agent from
                the <code>CODING_AGENT</code> config. We&apos;ll wire individual agent auth in a later
                step (Claude Code OAuth, Codex API key, etc.).
              </Block>
            </Section>

            <Section id="github" title="5. GitHub (we set this up together)">
              <Block label="What it is">
                Connection to a GitHub repo so coding agents can clone, branch, commit, and open
                PRs.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Stores a Personal Access Token (encrypted)</li>
                  <li>Stores the default <code>owner/repo</code> the agents will work on</li>
                  <li>Tests the connection by hitting GitHub&apos;s <code>/user</code> endpoint</li>
                  <li>Used by the agent job tool to create <code>agent-job/*</code> branches and PRs</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Without GitHub, agents can run locally inside Docker but can&apos;t push results
                anywhere. With GitHub, you get a clean PR workflow: agent runs → PR opens →
                you review on github.com → merge.
              </Block>
              <Block label="Step-by-step setup">
                <p className="font-semibold text-foreground">Phase 1 — Generate the token on GitHub</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Open <a className="text-primary underline" href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">github.com/settings/tokens?type=beta</a> (the Fine-grained tokens page — safer than classic)</li>
                  <li>Click <strong>Generate new token</strong></li>
                  <li><strong>Token name</strong>: <code>ghostbot</code></li>
                  <li><strong>Expiration</strong>: 90 days (or custom)</li>
                  <li><strong>Resource owner</strong>: your GitHub username (e.g. <code>flndrnai</code>)</li>
                  <li><strong>Repository access</strong>: <em>Only select repositories</em> → pick the repo(s) GhostBot should manage</li>
                  <li><strong>Repository permissions</strong> — set these to <em>Read and write</em>:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      <li>Contents</li>
                      <li>Pull requests</li>
                      <li>Issues</li>
                      <li>Workflows (only if you touch GitHub Actions)</li>
                      <li>Metadata is auto-set to read-only</li>
                    </ul>
                  </li>
                  <li>Click <strong>Generate token</strong> at the bottom</li>
                  <li><strong className="text-destructive">COPY THE TOKEN IMMEDIATELY</strong> — it starts with <code>github_pat_...</code> and GitHub will never show it again. If you lose it, you have to generate a new one.</li>
                </ol>

                <p className="font-semibold text-foreground mt-4">Phase 2 — Save it in GhostBot</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Open <a className="text-primary underline" href="/admin/github">/admin/github</a></li>
                  <li><strong>GitHub PAT</strong>: paste the <code>github_pat_...</code> token from Phase 1</li>
                  <li><strong>Owner</strong>: your GitHub username (e.g. <code>flndrnai</code>)</li>
                  <li><strong>Repository</strong>: the repo name without the owner (e.g. <code>ghostbot</code>)</li>
                  <li>Click <strong>Save</strong></li>
                  <li>Click <strong>Test Connection</strong> — should show: <em>Connected as &lt;your-username&gt;</em></li>
                </ol>

                <p className="font-semibold text-foreground mt-4">Troubleshooting</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><em>401 Unauthorized</em> → token typo or expired, regenerate</li>
                  <li><em>404 Not Found</em> → owner/repo typo, or token doesn&apos;t have access to that repo</li>
                  <li><em>403 Forbidden</em> → token is missing required permissions, regenerate with the scopes above</li>
                </ul>
              </Block>
            </Section>

            <Section id="telegram" title="6. Telegram (we set this up together)">
              <Block label="What it is">
                A Telegram bot that mirrors GhostBot chat to your phone, sends notifications when
                agent jobs finish, and lets you fire commands from anywhere.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Sends a welcome message when first connected (proves it works)</li>
                  <li>Notifies you when agent jobs finish, succeed, or fail</li>
                  <li>Lets you reply from Telegram to continue a chat</li>
                  <li>Supports webhook (preferred) or long-polling fallback</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Long-running agent jobs are exactly the kind of thing you want to fire-and-forget
                from your phone. Telegram is the lowest-friction way to do that.
              </Block>
              <Block label="Step-by-step setup">
                <p className="font-semibold text-foreground">Phase 1 — Create the bot via @BotFather</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Open Telegram, search for <a className="text-primary underline" href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> (the official Telegram bot for managing bots)</li>
                  <li>Send <code>/newbot</code></li>
                  <li>Pick a display name (e.g. <code>GhostBot Personal</code>)</li>
                  <li>Pick a username — must end in <code>bot</code> (e.g. <code>flndrn_ghostbot</code>)</li>
                  <li>BotFather replies with a token like <code>123456789:ABCdefGhIJKlmnoPQRstuVWXyz</code> — <strong className="text-destructive">copy it</strong></li>
                </ol>

                <p className="font-semibold text-foreground mt-4">Phase 2 — Get your numeric Chat ID</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>In Telegram, search for your new bot by username and send it any message (e.g. <code>hi</code>)</li>
                  <li>Open <a className="text-primary underline" href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">@userinfobot</a> (a free utility bot)</li>
                  <li>Send it <code>/start</code> — it replies with your numeric Chat ID (e.g. <code>123456789</code>)</li>
                  <li>Copy that number</li>
                </ol>

                <p className="font-semibold text-foreground mt-4">Phase 3 — Connect in GhostBot</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Open <a className="text-primary underline" href="/admin/telegram">/admin/telegram</a></li>
                  <li><strong>Bot Token</strong>: paste the BotFather token from Phase 1</li>
                  <li><strong>Chat ID</strong>: paste the number from Phase 2 (restricts the bot to only respond to you)</li>
                  <li>Click <strong>Connect Bot</strong> — you should receive a welcome message in Telegram from your bot</li>
                </ol>

                <p className="font-semibold text-foreground mt-4">Phase 4 — Register the webhook</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>The Webhook Registration card appears once the bot is connected</li>
                  <li><strong>Public URL</strong>: <code>https://ghostbot.dev</code> (your GhostBot domain — must be HTTPS)</li>
                  <li>Click <strong>Register Webhook</strong> — card flips to green Active state</li>
                  <li>Telegram now POSTs every incoming bot message to <code>/api/telegram/webhook</code></li>
                </ol>

                <p className="font-semibold text-foreground mt-4">Troubleshooting</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><em>No welcome message</em> → token typo, or you forgot to message the bot first</li>
                  <li><em>Webhook returns 401</em> → re-register; the secret is regenerated each connect</li>
                  <li><em>Bot doesn&apos;t reply to messages</em> → check Dokploy logs for <code>[telegram]</code> entries</li>
                </ul>
              </Block>
            </Section>

            <Section id="triggers" title="7. Triggers">
              <Block label="What it is">
                Webhook receivers that fire an agent job when an external system POSTs to a URL.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Generates unique webhook URLs (e.g. <code>/api/triggers/[id]</code>)</li>
                  <li>Verifies HMAC signatures so only authorized callers fire jobs</li>
                  <li>Maps incoming payloads to a prompt + agent</li>
                  <li>Used for things like &quot;every time a GitHub issue is labeled <code>fix-me</code>, run an agent on it&quot;</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Triggers turn GhostBot into an autonomous responder. Without them you have to
                start every job manually from chat.
              </Block>
              <Block label="How to use">
                Create a trigger, copy its URL + secret, paste into the source system&apos;s webhook
                config. Optional — only set up when you have a specific automation in mind.
              </Block>
            </Section>

            <Section id="crons" title="8. Crons">
              <Block label="What it is">
                Scheduled jobs. The same as triggers, but fired by a clock instead of a webhook.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Stores cron expressions (e.g. <code>0 9 * * 1-5</code> = weekdays at 9am)</li>
                  <li>Uses <code>node-cron</code> to fire on schedule</li>
                  <li>Each cron runs a configured prompt against a configured agent</li>
                  <li>Examples: &quot;every morning, run lint + push fixes&quot;, &quot;every Friday, generate a PR summary&quot;</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                For recurring maintenance work you want done without thinking about it.
                Optional — skip until you have a routine task to automate.
              </Block>
              <Block label="How to use">
                Create a cron, set the schedule + prompt + agent, save. The next page reload
                shows when it last ran and when it next will.
              </Block>
            </Section>

            <Section id="containers" title="9. Containers">
              <Block label="What it is">
                A live view into the Docker containers GhostBot has running.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Lists active <code>ghostbot:coding-agent-*</code> containers</li>
                  <li>Shows status, uptime, image, command</li>
                  <li>Lets you stop or remove stale containers</li>
                  <li>Talks to Docker via the Unix socket (no CLI spawning)</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Mostly for debugging. If an agent job hangs or you suspect a container isn&apos;t
                exiting cleanly, this is where you check.
              </Block>
              <Block label="How to use">
                Read-only inspection plus a kill switch. Requires <code>/var/run/docker.sock</code>
                to be mounted into the GhostBot container — currently not enabled in the
                Dokploy production deploy. We&apos;ll wire that when we start running real agent
                jobs.
              </Block>
            </Section>

            <Section id="monitoring" title="10. Monitoring">
              <Block label="What it is">
                Dashboards for token usage, agent job success rates, and per-provider cost
                tracking.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Counts prompt + completion tokens per chat (recorded in <code>token_usage</code> table)</li>
                  <li>Aggregates by provider, model, and time window</li>
                  <li>Shows agent job success/failure ratios</li>
                  <li>Estimates cost for cloud providers (Ollama is always €0)</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Visibility. If you switch to a cloud provider and a runaway loop spends $50,
                you want to see it the next day, not at the end of the month. With Ollama,
                the page is mostly informational — but useful for capacity planning.
              </Block>
              <Block label="How to use">
                Just visit the page. Filter by date range. No setup required.
              </Block>
            </Section>

            <Section id="clusters" title="11. Clusters">
              <Block label="What it is">
                A higher-level orchestration layer above individual agent jobs. A cluster is a
                named group of workers, each with a role and trigger configuration, that
                collaborate on a multi-step task.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Defines a cluster (e.g. &quot;daily-maintenance&quot;)</li>
                  <li>Adds workers with roles (planner, coder, reviewer, tester, etc.)</li>
                  <li>Each worker has its own prompt, agent, and triggering conditions</li>
                  <li>Workers can hand off to each other based on outcomes</li>
                  <li>The cluster page streams live logs from all workers via SSE</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Single agent jobs are powerful but limited — they&apos;re one prompt, one
                container. Clusters let you build pipelines: a planner produces a plan, a
                coder implements each step, a reviewer checks the diff, a tester runs the
                suite — all autonomously.
              </Block>
              <Block label="How to use">
                Optional and advanced. For now, ignore the Clusters page until you&apos;ve done
                a few standalone agent jobs and want to chain them. We&apos;ll set up the first
                cluster together once GitHub + a coding agent are working end-to-end.
              </Block>
            </Section>

            <Section id="slack" title="12. Slack">
              <Block label="What it is">
                Parallel to Telegram. Posts agent-job lifecycle pings (started, succeeded, failed) to a Slack channel.
              </Block>
              <Block label="Setup">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Open <a className="text-primary underline" href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a> → Create New App → From scratch</li>
                  <li>Sidebar → OAuth &amp; Permissions → Bot Token Scopes → add <code>chat:write</code></li>
                  <li>Same page → Install to Workspace → copy the Bot User OAuth Token (<code>xoxb-...</code>)</li>
                  <li>Create a channel like <code>#ghostbot</code> in Slack and run <code>/invite @GhostBot</code></li>
                  <li><a className="text-primary underline" href="/admin/slack">/admin/slack</a> → paste token + channel → Connect</li>
                </ol>
              </Block>
            </Section>

            <Section id="memory" title="13. Memory">
              <Block label="What it is">
                The self-learning layer that makes GhostBot different from a regular chat. Every finished chat is auto-summarized into 2-3 sentences with topic tags, embedded into a vector, and stored. When you start a new chat, GhostBot embeds your first message and pulls the top-3 most relevant past summaries into the system prompt — so it remembers context across conversations.
              </Block>
              <Block label="Setup">
                One-time on the Ollama VPS: <code>ollama pull nomic-embed-text</code> (~274 MB). The Memory page shows a green &quot;Working&quot; status when embeddings are available.
              </Block>
              <Block label="What it does on the page">
                Browse all stored summaries and knowledge entries, semantic search by meaning (not keywords), filter entries by source type, add manual entries to teach GhostBot facts directly, JSON export for backup. Per-chat opt-out: click the small Sparkles icon next to a chat in the sidebar to exclude that conversation from memory entirely.
              </Block>
            </Section>

            <Section id="backup" title="14. Backup">
              <Block label="What it is">
                One-click JSON export of the whole GhostBot database (every non-secret table) plus the list of installed coding-agent Docker images on the host.
              </Block>
              <Block label="Why">
                Insurance before risky migrations (KVM8, Dokploy redeploy, deleting volumes by accident). Secrets are NOT in the export — they stay encrypted on the server. To do a full disaster recovery you also need a copy of <code>AUTH_SECRET</code> from Dokploy environment variables.
              </Block>
              <Block label="How">
                <a className="text-primary underline" href="/admin/backup">/admin/backup</a> → Download backup. Save the JSON somewhere safe (Mac + cloud drive).
              </Block>
            </Section>

            <Section id="users" title="15. Users">
              <Block label="What it is">
                Multi-user invitation flow. Each user has isolated chats, agent jobs, memory, and clusters.
              </Block>
              <Block label="How to invite">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li><a className="text-primary underline" href="/admin/users">/admin/users</a> → enter email + role + expiration days</li>
                  <li>Click Create invitation</li>
                  <li>Click Copy link → send the link to the invitee any way you like</li>
                  <li>The invitee opens it, sets a password, and gets a fresh isolated account</li>
                  <li>Admins can promote/demote roles or delete users from the same page</li>
                </ol>
              </Block>
              <Block label="Safety">
                You cannot delete your own account. Invites are one-time use and expire per the configured days. Tokens are 256 bits of entropy.
              </Block>
            </Section>

            <Section id="agent-jobs" title="16. Agent Jobs from chat">
              <Block label="What it is">
                A toggle in the chat input that switches the next message from a chat reply into an autonomous coding-agent job. The agent clones your repo, edits code, commits, pushes, and opens a PR.
              </Block>
              <Block label="How to use">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Click the wrench icon at the bottom-left of the chat input → it lights up gold</li>
                  <li>Type the task (e.g. <em>&quot;Add a comment to README.md&quot;</em>)</li>
                  <li>Hit send — a job card appears in the chat with status, streaming logs, and a PR URL when done</li>
                  <li>Click View diff to see the full inline patch with red/green highlighting</li>
                  <li>Click Re-run to fire the same job again with one click</li>
                </ol>
              </Block>
              <Block label="Notifications">
                Telegram and/or Slack ping on every state change: yellow circle started, green check done, red cross failed.
              </Block>
            </Section>

            <Section id="shortcuts" title="17. Keyboard shortcuts">
              <Block label="Global">
                <ul className="list-disc pl-5 space-y-1">
                  <li><kbd>⌘ B</kbd> — toggle sidebar</li>
                  <li><kbd>⌘ K</kbd> — focus chat input (or jump to home if not on a chat page)</li>
                  <li><kbd>⌘ Shift N</kbd> — new chat</li>
                  <li><kbd>⌘ /</kbd> — show this help modal in the app</li>
                  <li><kbd>Esc</kbd> — close the help modal</li>
                </ul>
              </Block>
              <Block label="In the chat input">
                <ul className="list-disc pl-5 space-y-1">
                  <li><kbd>Enter</kbd> — send message</li>
                  <li><kbd>Shift Enter</kbd> — new line</li>
                </ul>
              </Block>
            </Section>

            <Section id="attachments" title="18. File & image attachments in chat">
              <Block label="Text files">
                Drop, paste, or click-to-attach a text file into the chat input. Its contents get embedded as a fenced code block with the filename and language hint, ready to send to the LLM. Limit: 64 KB per file. Recognized text extensions cover JS/TS/Python/Go/Rust/Java/Markdown/YAML/JSON/SQL/Shell/Dockerfile and many more.
              </Block>
              <Block label="Image paste (vision)">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Paste a screenshot or image from clipboard (<kbd>Cmd+V</kbd>) or drag-and-drop image files</li>
                  <li>Thumbnail previews appear above the text input with an X button to remove</li>
                  <li>Images over 1 MB are automatically resized via canvas compression</li>
                  <li>Up to 4 images per message</li>
                  <li>Images are sent to vision-capable LLMs (Ollama multimodal, Anthropic, OpenAI, Google)</li>
                  <li>Images persist in the database and sync across devices in real time</li>
                  <li>Click any image in a message bubble to open it full-size in a new tab</li>
                </ul>
              </Block>
              <Block label="Notes">
                Text-only models will ignore image attachments gracefully. For best results with images, use a vision-capable model (e.g. <code>llava</code>, <code>llama3.2-vision</code> on Ollama, or any Claude/GPT-4/Gemini model).
              </Block>
            </Section>

            <Section id="vscode" title="19. VS Code extension">
              <Block label="What it is">
                A VS Code extension that mounts your live GhostBot UI inside the editor as a sidebar panel. Same login session, same chat, same agents, same memory.
              </Block>
              <Block label="Install (sideload)">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li><code>npm install -g @vscode/vsce</code></li>
                  <li><code>cd vscode-extension &amp;&amp; vsce package</code></li>
                  <li><code>code --install-extension ghostbot-vscode-0.1.0.vsix</code></li>
                  <li>In VS Code: <code>Cmd+Shift+P</code> → &quot;GhostBot: Open&quot;</li>
                  <li>Settings → search &quot;ghostbot&quot; to point at a different URL if needed</li>
                </ol>
              </Block>
            </Section>

            <Section id="setup-checklist" title="Recommended setup order">
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>LLM Providers + Ollama</strong> — chat works (DONE for you)</li>
                <li><strong>GitHub</strong> — agents can push code <em>(set up together)</em></li>
                <li><strong>Telegram</strong> — get notified on your phone <em>(set up together)</em></li>
                <li><strong>Agents</strong> — confirm at least one coding agent works in Docker</li>
                <li><strong>Containers</strong> — mount the Docker socket so the page works</li>
                <li><strong>Monitoring</strong> — sanity-check token usage</li>
                <li><strong>Triggers + Crons</strong> — automate when you have a routine</li>
                <li><strong>Clusters</strong> — last, for multi-agent pipelines</li>
              </ol>
              <p className="mt-4 text-muted-foreground">
                Each section above explains what it does and why. When you&apos;re ready to tackle
                GitHub or Telegram, just say the word and we&apos;ll do it together step by step.
              </p>
            </Section>

          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function Block({ label, children }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
