'use client';

import { useState } from 'react';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-started', label: 'Getting started' },
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
  { id: 'projects', label: 'Projects' },
  { id: 'clusters', label: 'Clusters' },
  { id: 'agent-jobs', label: 'Agent Jobs (chat)' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'attachments', label: 'File & image attachments' },
  { id: 'voice-input', label: 'Voice-to-text' },
  { id: 'vscode', label: 'VS Code extension' },
  { id: 'install-pwa', label: 'Install as an app' },
  { id: 'demo-mode', label: 'Demo mode' },
  { id: 'setup-checklist', label: 'Setup order' },
  { id: 'project-connect-guide', label: 'Project Connect guide' },
  { id: 'clusters-guide', label: 'Clusters guide' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
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

            <Section id="getting-started" title="Getting started — your first 10 minutes">
              <p className="text-sm">
                Just finished the setup wizard? Here&apos;s what to do next. For the full plain-language
                guide (what GhostBot is, what to do and NOT do), open the{' '}
                <a href="/getting-started" className="underline text-primary">Getting Started page</a>{' '}
                from the user menu.
              </p>

              <Block label="1. Type something in the chat">
                You&apos;re on the chat screen. Type a question in plain English. The AI replies live.
                Every chat gets saved automatically — old ones show up in the left sidebar.
              </Block>

              <Block label="2. Paste a screenshot if you want">
                If the AI you picked supports images (most modern ones do), you can paste a screenshot
                straight into the chat. Great for <em>&quot;what does this error mean?&quot;</em> or{' '}
                <em>&quot;read this receipt&quot;</em>.
              </Block>

              <Block label="3. Dictate instead of typing">
                Click the microphone button in the chat input, speak, click again to stop. Your words
                land as text. Works on Chrome, Edge, Safari (not Firefox).
              </Block>

              <Block label="4. Attach a project so GhostBot knows your stuff">
                Open <strong>Projects</strong> in the sidebar → <em>Add project</em>. Upload a folder,
                paste a link to something online, or point at a folder already on the server. Each
                project has a notes file (<code>CLAUDE.md</code>) that tells the AI what the project is
                about — fill it in once, the AI uses it automatically.
              </Block>

              <Block label="5. Ask an AI helper to do a task">
                Click the wrench icon in the chat input, write what you want done in plain English
                (<em>&quot;add a Contact Us button&quot;</em>), click Launch. A progress card appears in
                the chat. When it finishes you can review what was changed side-by-side before keeping it.
              </Block>

              <Block label="6. Optional — get notified on your phone">
                Under Admin, set up Telegram or Slack. You&apos;ll get a ping when an AI helper finishes
                a task, so you don&apos;t have to watch the screen.
              </Block>

              <Block label="Stuck on something?">
                Jump to the <a href="#troubleshooting" className="underline">Troubleshooting</a> section
                further down. It covers the most common issues and their fixes in plain language.
              </Block>
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
                {' '}(e.g. <code>qwen2.5-coder:14b</code>), click <strong>Save & Apply</strong>. The card flips
                to a green Connected state. Use Disconnect to clear and start over.
              </Block>
              <Block label="Any Ollama model works">
                GhostBot is not locked to any specific model. You can use <strong>any model</strong> available
                on <a className="text-primary underline" href="https://ollama.com/library" target="_blank" rel="noopener noreferrer">ollama.com/library</a> —
                Llama, Mistral, DeepSeek, CodeStral, Phi, Gemma, or anything else. Just run{' '}
                <code>ollama pull &lt;model&gt;</code> on your Ollama machine and it automatically appears
                in the admin panel. No config files to edit.
              </Block>
            </Section>

            <Section id="ollama" title="2. Ollama Setup">
              <Block label="What it is">
                A dedicated page for connecting to a self-hosted Ollama instance, separate from
                the generic LLM Providers page so the workflow is faster and clearer.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Stores the Ollama base URL (e.g. <code>http://187.124.64.116:11434</code>)</li>
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
                  <li>Install Ollama on your VPS or local machine (<code>curl -fsSL https://ollama.com/install.sh | sh</code>)</li>
                  <li>Pull any model you want: <code>ollama pull &lt;model&gt;</code> (e.g. <code>ollama pull llama3</code>, <code>ollama pull mistral</code>, <code>ollama pull qwen2.5-coder:14b</code>)</li>
                  <li>Pull the embedding model for memory: <code>ollama pull nomic-embed-text</code></li>
                  <li>Expose port 11434 to your GhostBot server (firewall it to that IP only)</li>
                  <li>Paste the URL here, click Test & Save — all installed models appear automatically</li>
                  <li>Click <strong>Set Active</strong> on the model you want to use</li>
                </ol>
                <p className="mt-2">
                  You can switch models at any time — just pull a new one and click Set Active. Browse all available
                  models at <a className="text-primary underline" href="https://ollama.com/library" target="_blank" rel="noopener noreferrer">ollama.com/library</a>.
                </p>
                <p>See <code>docs/OLLAMA_QWEN_SETUP.md</code> in the repo for the full setup guide.</p>
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
                Agent images are baked into the Docker setup. When you launch an agent job from
                chat, GhostBot picks the active agent from the <code>CODING_AGENT</code> config.
              </Block>
              <Block label="Which model do agents use?">
                Coding agents use whatever LLM is currently set as active in <strong>LLM Providers</strong>.
                If you&apos;re using Ollama, the agent gets the same model you selected there. To use a
                different model for agents vs. chat, switch the active model in LLM Providers before
                launching the job. Any Ollama model works — just <code>ollama pull &lt;model&gt;</code> on
                your Ollama machine and set it active.
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

            <Section id="docker-mount" title="9. Docker mount &amp; security">
              <Block label="What it is">
                How GhostBot talks to your host&apos;s Docker daemon to launch coding-agent
                containers — and how it&apos;s sandboxed so the app can&apos;t escape to host root.
              </Block>
              <Block label="The short version">
                In the default <code>docker-compose.yml</code>, GhostBot does NOT mount the raw
                <code>/var/run/docker.sock</code>. Instead, a sidecar service called
                <code>docker-proxy</code> (the <code>tecnativa/docker-socket-proxy</code> image)
                mounts the socket read-only, exposes a restricted subset of the Docker API on
                <code>tcp://docker-proxy:2375</code>, and GhostBot connects to it via
                <code>DOCKER_HOST=tcp://docker-proxy:2375</code>.
              </Block>
              <Block label="Why it matters">
                Mounting <code>/var/run/docker.sock</code> directly into a container is
                equivalent to giving that container root on the host. If you ever expose
                GhostBot to untrusted users (or a bug lets a <code>user</code>-role account
                reach the launcher), the proxy limits the blast radius to "start/stop/inspect
                agent containers" instead of "full host compromise".
              </Block>
              <Block label="Allowlist the proxy exposes">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><code>CONTAINERS</code> — list / create / inspect / logs / wait / kill / remove</li>
                  <li><code>IMAGES</code> — inspect (the launcher checks for the agent image before starting)</li>
                  <li><code>NETWORKS</code> — resolve the compose network to attach agent containers</li>
                  <li><code>EXEC</code> — container exec (used by <code>execInContainer</code>)</li>
                  <li><code>POST</code> + <code>DELETE</code> — HTTP verbs for all of the above</li>
                  <li>Everything else — explicitly <code>0</code>: AUTH, BUILD, COMMIT, CONFIGS, DISTRIBUTION, EVENTS, INFO, NODES, PLUGINS, SECRETS, SERVICES, SESSION, SWARM, SYSTEM, TASKS, VOLUMES</li>
                </ul>
              </Block>
              <Block label="If you&apos;re migrating from an older compose">
                Earlier GhostBot deploys bind-mounted <code>/var/run/docker.sock</code>
                directly into the app container. After pulling the latest
                <code>docker-compose.yml</code> and running <code>docker compose up -d</code>,
                the bind is replaced by the proxy service. Verify by opening
                <strong>Admin → Containers</strong> — the list should populate exactly as
                before. If it doesn&apos;t, check that the <code>docker-proxy</code> service is
                running (<code>docker compose ps</code>) and that <code>DOCKER_HOST</code> is
                set in the ghostbot service.
              </Block>
              <Block label="Opt out (not recommended)">
                If you really want the old behaviour — direct socket bind — edit
                <code>docker-compose.yml</code> to remove the <code>docker-proxy</code>
                service, restore the <code>/var/run/docker.sock</code> bind on the
                <code>ghostbot</code> service, and unset <code>DOCKER_HOST</code>. You&apos;re
                opting into "admin of GhostBot = root on the host" as a threat model.
              </Block>
              <Block label="Agent resource limits">
                Every agent container is launched with: Memory 2 GB, 1 CPU, PidsLimit 256,
                <code>no-new-privileges</code>, and a 15-minute wall-clock timeout. Adjust
                via <code>AGENT_MEMORY_LIMIT_MB</code>, <code>AGENT_CPU_LIMIT</code>,
                <code>AGENT_PIDS_LIMIT</code>, <code>AGENT_TIMEOUT_SEC</code> in your env or
                the admin settings.
              </Block>
            </Section>

            <Section id="containers" title="10. Containers">
              <Block label="What it is">
                A live view into the Docker containers GhostBot has running.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Lists active <code>ghostbot:coding-agent-*</code> containers</li>
                  <li>Shows status, uptime, image, command</li>
                  <li>Lets you stop or remove stale containers</li>
                  <li>Talks to Docker via the proxy sidecar (see <a href="#docker-mount" className="underline">Docker mount &amp; security</a>), never the raw CLI</li>
                </ul>
              </Block>
              <Block label="Why you need it">
                Mostly for debugging. If an agent job hangs or you suspect a container isn&apos;t
                exiting cleanly, this is where you check.
              </Block>
              <Block label="How to use">
                Read-only inspection plus a kill switch. Requires the <code>docker-proxy</code>
                sidecar to be running (it ships in the default <code>docker-compose.yml</code>).
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

            <Section id="projects" title="11. Projects">
              <Block label="What it is">
                A project folder that GhostBot can browse, read, edit, and work on directly. Each project gets a <code>CLAUDE.md</code> file as its living source of truth — like a brain that tells GhostBot what the project is, how it works, and what state it&apos;s in.
              </Block>
              <Block label="What it does">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Creates a project folder on the server at <code>data/projects/&lt;id&gt;/</code></li>
                  <li>Auto-generates a <code>CLAUDE.md</code> template with architecture, conventions, and status sections</li>
                  <li>Connect any project to any chat — the <code>CLAUDE.md</code> is automatically injected into the system prompt</li>
                  <li>File tree panel appears alongside the chat when a project is connected</li>
                  <li>Click any file in the tree to attach its content as a code block in the chat</li>
                  <li>Agent jobs can mount the project folder directly into Docker — no GitHub clone needed</li>
                </ul>
              </Block>
              <Block label="How to use">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Go to <a className="text-primary underline" href="/projects">/projects</a> and create a new project</li>
                  <li>Open any chat and click <strong>Connect project</strong> below the chat input</li>
                  <li>Select your project — the file tree appears on the left and <code>CLAUDE.md</code> is loaded into context</li>
                  <li>Ask GhostBot about the project, click files to attach them, or switch to agent mode to run coding agents directly on the project files</li>
                  <li>Click <strong>Browse project</strong> to toggle the file tree panel</li>
                </ol>
              </Block>
              <Block label="CLAUDE.md">
                The <code>CLAUDE.md</code> is the most important file in any project. Keep it updated with:
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Architecture</strong> — how the project is structured</li>
                  <li><strong>Tech stack</strong> — frameworks, languages, tools</li>
                  <li><strong>Conventions</strong> — coding patterns, naming rules</li>
                  <li><strong>What&apos;s shipped</strong> — completed features</li>
                  <li><strong>What&apos;s in progress</strong> — current work</li>
                  <li><strong>What&apos;s parked</strong> — deferred items and why</li>
                </ul>
                <p className="mt-2">The more detailed your CLAUDE.md, the better GhostBot understands and works on your project.</p>
              </Block>
            </Section>

            <Section id="clusters" title="12. Clusters">
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

            <Section id="slack" title="13. Slack">
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

            <Section id="memory" title="14. Memory">
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

            <Section id="backup" title="15. Backup">
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

            <Section id="users" title="16. Users">
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

            <Section id="agent-jobs" title="17. Agent Jobs from chat">
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

            <Section id="shortcuts" title="18. Keyboard shortcuts">
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

            <Section id="attachments" title="19. File & image attachments in chat">
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

            <Section id="voice-input" title="20. Voice-to-text (mic button)">
              <Block label="What it is">
                A microphone button in the chat input. Click it, speak, click again to stop. Your words land as text in the chat, ready to send.
              </Block>
              <Block label="How to use">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Click the small microphone icon (bottom-left of the chat input)</li>
                  <li>Grant your browser microphone permission the first time</li>
                  <li>Speak naturally — interim results disappear, only final phrases are kept</li>
                  <li>Click again to stop</li>
                </ol>
              </Block>
              <Block label="What browsers support it">
                Chrome, Edge, and Safari (macOS + iOS). Firefox doesn&apos;t have native speech recognition yet — the button hides itself automatically when the API isn&apos;t available.
              </Block>
              <Block label="Privacy">
                Speech recognition runs entirely in your browser via the built-in Web Speech API. Audio never touches your server or a third-party transcription service. No cost, no audit trail beyond what the browser itself logs.
              </Block>
            </Section>

            <Section id="vscode" title="21. VS Code extension">
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

            <Section id="install-pwa" title="22. Install GhostBot as an app (PWA)">
              <Block label="What it is">
                Progressive Web App support — GhostBot can be installed on your phone or desktop like a regular app, with its own icon and its own window (no browser chrome around it).
              </Block>
              <Block label="How to install on your phone">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>iOS (Safari)</strong>: tap the Share button → &quot;Add to Home Screen&quot;</li>
                  <li><strong>Android (Chrome)</strong>: tap the ⋮ menu → &quot;Install app&quot; or &quot;Add to Home screen&quot;</li>
                </ul>
              </Block>
              <Block label="How to install on desktop">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Chrome / Edge</strong>: an install icon appears in the address bar — click it</li>
                  <li><strong>Safari (macOS)</strong>: File menu → &quot;Add to Dock&quot;</li>
                </ul>
              </Block>
              <Block label="What it does">
                The GhostBot app opens without browser tabs around it — feels like a native app. A small service worker caches the shell so the frame loads even on a flaky connection. The actual chat still needs network (it&apos;s talking to your LLM in real time).
              </Block>
            </Section>

            <Section id="demo-mode" title="23. Demo mode">
              <Block label="What it is">
                A safety flag for when you want to host a public &quot;try it&quot; version of GhostBot. With <code>DEMO_MODE=true</code> set in the environment:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Agent-job launches are blocked (no LLM cost burn, no Docker abuse)</li>
                  <li>Secret saves silently no-op (visitor A&apos;s API key never persists for visitor B)</li>
                  <li>A 🎭 Demo banner shows at the top of every page</li>
                  <li>Everything else works normally — chat, memory, admin UI, setup wizard</li>
                </ul>
              </Block>
              <Block label="Live example">
                <a href="https://demo.ghostbot.dev" target="_blank" rel="noreferrer" className="underline text-primary">demo.ghostbot.dev</a> runs this config. Database resets every 24h via the bundled reset-cron sidecar. Co-resident with production ghostbot.dev on a single VPS, routed by hostname via Dokploy&apos;s Traefik.
              </Block>
              <Block label="How to deploy your own">
                Full guide at <code>docs/DEMO.md</code> in the repo. Requires: a VPS with 8+ GB RAM, a subdomain pointing at it, Dokploy (or any compose-capable host), <code>DEMO_MODE=true</code> in the env.
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

            <Section id="project-connect-guide" title="Project Connect — deep dive">
              <p className="text-sm">
                Project Connect is the feature that turns GhostBot from "AI chat" into "AI that can
                actually touch your code". This is how it works end-to-end.
              </p>

              <Block label="What a project is">
                A <em>project</em> in GhostBot is a folder on the server with a name, a description,
                and a path. The folder can be empty (you&apos;ll fill it later), freshly cloned from
                a git URL, or populated by drag-and-drop upload. Each project gets its own
                <code>CLAUDE.md</code> file — the living source of truth the LLM reads on every turn.
              </Block>

              <Block label="Creating a project — three ways">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Upload</strong> — drag a folder from your desktop onto the Projects page</li>
                  <li><strong>Clone</strong> — paste a git URL; GhostBot runs <code>git clone --depth 1</code> into a fresh project folder (the URL is validated against a strict allowlist — no shell metacharacters)</li>
                  <li><strong>Connect existing</strong> — point at a path that already exists on the server (useful for Dokploy-managed project folders)</li>
                </ul>
              </Block>

              <Block label="Attaching a project to a chat">
                Open any chat, click the folder icon in the input bar, pick a project. You&apos;ll see:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>A file-tree panel with click-to-attach buttons (attached files get embedded as fenced code blocks in the next message)</li>
                  <li>The project&apos;s <code>CLAUDE.md</code> contents injected into the system prompt — so the LLM always knows what the project is, its conventions, and its current state</li>
                  <li>The "wrench" agent-job launcher, now pre-configured to mount this project into the agent container</li>
                </ul>
              </Block>

              <Block label="CLAUDE.md — what to put in it">
                The <code>CLAUDE.md</code> at each project root is your "talk to the LLM once,
                remember forever" file. Good contents:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li><strong>What is this project?</strong> — one paragraph</li>
                  <li><strong>Tech stack + conventions</strong> — "we use X, not Y", "prefer Tailwind over CSS modules"</li>
                  <li><strong>What&apos;s shipped</strong> + <strong>what&apos;s parked</strong> — lets the LLM reason about current state</li>
                  <li><strong>Code conventions</strong> — naming, file layout, architectural rules</li>
                  <li><strong>Known issues</strong> — things you don&apos;t want the LLM to break</li>
                </ul>
                Tip: use the Autonomous Builder — it writes sections to <code>CLAUDE.md</code>
                automatically after each shipped feature, so you don&apos;t have to update it by hand.
              </Block>

              <Block label="Launching agents on a project">
                With a project attached, clicking the wrench icon opens the agent-job launcher. Pick
                the agent (Aider is the default and works with any LLM), write a prompt, launch. The
                agent container starts with:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Your project folder bind-mounted at <code>/home/coding-agent/workspace</code></li>
                  <li>Your GitHub PAT injected as an env var (if configured)</li>
                  <li>Your LLM credentials injected (Ollama URL, or API key)</li>
                  <li>Resource limits: 2 GB memory, 1 CPU, 256 PIDs, 15-min wall-clock timeout</li>
                </ul>
                It edits files in place. When it finishes (or pushes a branch), the job card in your
                chat updates with status, logs, and a PR URL if applicable.
              </Block>

              <Block label="File-system API safety">
                The Project Connect file API has belt-and-suspenders path-traversal defense: absolute-
                path resolve, prefix check against the project root, and a <code>realpathSync</code>
                symlink check. You can&apos;t attach files outside the project folder even by crafting
                a symlink. See <code>src/lib/projects/files.js</code> if you want to verify.
              </Block>
            </Section>

            <Section id="clusters-guide" title="Clusters — multi-role agent pipelines">
              <p className="text-sm">
                A cluster is a sequence of agent roles that runs as a single button-click. Use it when
                one agent isn&apos;t enough — for example a "plan → review → implement → test" flow,
                or a "summarise incoming issues → triage → tag" pipeline.
              </p>

              <Block label="Cluster anatomy">
                Each cluster has:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li><strong>A name</strong> and an optional system prompt that prepends to every role&apos;s prompt</li>
                  <li><strong>Roles</strong> in execution order — each role is an agent-job config (agent type, prompt, branch, etc.)</li>
                  <li>Roles can optionally declare a <strong>trigger</strong> (cron, webhook, file watch) to run automatically</li>
                </ul>
              </Block>

              <Block label="Running a cluster manually">
                Open <strong>Clusters</strong> in the sidebar, pick a cluster, click <em>Run now</em>.
                The roles execute sequentially — each job gets the previous role&apos;s output appended
                to its prompt as context (capped at 2000 chars to fit in the LLM window). The cluster
                page shows live progress across all roles; each role&apos;s container logs stream into
                its own expandable panel.
              </Block>

              <Block label="Built-in templates">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>PR Reviewer</strong> — planner → reviewer → summariser. Good for "what did this PR actually do?"</li>
                  <li><strong>Docs Writer</strong> — extractor → writer → editor. Generates/updates README sections from code</li>
                  <li><strong>Test Coverage Bot</strong> — coverage analyser → test writer → test runner. Fills coverage gaps</li>
                  <li><strong>Dependency Updater</strong> — outdated scanner → updater → test runner. Patches-then-verifies</li>
                </ul>
                Create from template: Clusters page → <em>New from template</em> → pick one. You get
                a pre-wired cluster you can customise.
              </Block>

              <Block label="Cluster webhooks">
                Each role can expose a signed webhook endpoint at
                <code>/api/clusters/[clusterId]/roles/[roleId]/webhook</code>. Set
                <code>triggerConfig.webhookSecret</code> in the role config and the endpoint will
                accept HMAC-SHA256 signed payloads. The payload is available as
                <code>{'{{WEBHOOK_PAYLOAD}}'}</code> in the role&apos;s prompt template. Useful for
                "GitHub push → run coverage bot" style integrations.
              </Block>

              <Block label="Cross-user isolation">
                Clusters are per-user. User B cannot see, edit, run, or delete user A&apos;s clusters
                — the server actions all enforce ownership at the DB layer. If you&apos;re running
                a multi-user install, each person gets their own cluster library.
              </Block>
            </Section>

            <Section id="troubleshooting" title="Troubleshooting — common issues">
              <p className="text-sm text-muted-foreground">
                Admin-oriented fixes. If you&apos;re a regular user seeing something weird, the plain-language{' '}
                <a href="/getting-started" className="underline text-primary">Getting Started</a>{' '}
                guide covers the basics first.
              </p>

              <Block label='"No response streaming" / "LLM error"'>
                Almost always an LLM connectivity issue:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Admin → Ollama → click <em>Test Connection</em>. Red = URL wrong, firewall, or Ollama down</li>
                  <li>Admin → LLM Providers → confirm the active model matches <code>ollama list</code> exactly (case + tag)</li>
                  <li>For cloud providers: re-save the API key; a silent decrypt failure (ENCRYPTION_KEY rotated?) shows as "No API key configured"</li>
                  <li>Check your Ollama VPS logs — cold starts for 32B models take 30-90s on first request</li>
                </ul>
              </Block>

              <Block label='"Agent job won&apos;t launch"'>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Admin → Containers: does the page load? If blank, the docker-proxy sidecar isn&apos;t running. <code>docker compose ps</code> should show <code>ghostbot-docker-proxy</code> healthy</li>
                  <li>Is the agent image built? <code>docker images | grep ghostbot:coding-agent</code> on the host. If missing, SSH to the VPS and run <code>./docker/build.sh</code></li>
                  <li>Check the job&apos;s error output — Docker "no such image" means step 2, an HTTP 403 from the proxy means the API verb isn&apos;t in the allowlist (see <a href="#docker-mount" className="underline">Docker mount</a>)</li>
                </ul>
              </Block>

              <Block label='"GitHub PR wasn&apos;t opened"'>
                The agent pushed a branch but no PR showed up:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Your PAT needs these fine-grained scopes on the target repo: <strong>Contents</strong> rw, <strong>Pull requests</strong> rw, <strong>Issues</strong> r</li>
                  <li>The repo must allow branch creation from the PAT&apos;s user</li>
                  <li>Admin → GitHub → Test Connection should show <code>@your-username</code> + the scopes list</li>
                  <li>If using SSO orgs, the PAT needs to be authorised for the org separately</li>
                </ul>
              </Block>

              <Block label='"Telegram / Slack test message never arrived"'>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Telegram: did you <em>start</em> a chat with your bot first? The bot can&apos;t DM you until you send it a message. Chat ID must be from that same conversation</li>
                  <li>Telegram webhook endpoints now require <code>TELEGRAM_WEBHOOK_SECRET</code> to be set in admin. Unset = 503 on all webhook requests (intentional fail-closed)</li>
                  <li>Slack: <code>chat:write</code> scope required, bot must be invited to the channel, and the channel ID must be the internal ID (starts with C...) not the #name</li>
                </ul>
              </Block>

              <Block label='"Memory / RAG not finding past chats"'>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Is <code>nomic-embed-text</code> pulled on your Ollama host? Memory requires it</li>
                  <li>Check Admin → Memory — entry count greater than zero? If zero, no chats have been summarised yet (requires at least a few back-and-forth turns)</li>
                  <li>Per-chat <em>Memory enabled</em> toggle in chat settings — defaults to on, but a previous toggle-off persists</li>
                  <li>Embeddings are 768-dim from nomic-embed-text. If you switched embedding models mid-flight, old vectors are incompatible with new queries. Re-seed by starting fresh chats</li>
                </ul>
              </Block>

              <Block label='"Setup wizard keeps redirecting me"'>
                The owner-redirect cookie might be missing:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Complete the wizard once (reach step 5, click <em>Start using GhostBot →</em>) — that sets <code>SETUP_WIZARD_COMPLETED_AT</code> + the <code>gb_setup_seen</code> cookie</li>
                  <li>Clearing cookies triggers one more redirect — acceptable trade-off, not a bug</li>
                  <li>If you&apos;re stuck in a loop, visit <code>/admin</code> directly — the wizard is owner-only; admin/user accounts land on admin as normal</li>
                </ul>
              </Block>

              <Block label='"Static assets (logos, icons) return 404 or log in"'>
                Fixed in commit 89d08c2 — <code>src/proxy.js</code> now fast-paths requests with
                static-file extensions past the auth check. If you see this on an older deploy,
                pull main and rebuild.
              </Block>

              <Block label='"The microphone button doesn&apos;t show up / doesn&apos;t work"'>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The button hides on browsers without native SpeechRecognition (Firefox, some Android webviews). Use Chrome, Edge, or Safari</li>
                  <li>First click prompts for mic permission — if you denied by accident, re-enable via the address-bar site settings</li>
                  <li>HTTPS is required; some browsers disable the API over plain HTTP (localhost exempted)</li>
                </ul>
              </Block>

              <Block label='"Something says &quot;disabled in demo mode&quot;"'>
                The instance has <code>DEMO_MODE=true</code> set. Agent launches and secret saves are intentionally blocked. Check the <code>🎭 Demo mode</code> banner at the top of the page. For the full experience, self-host without that env var.
              </Block>

              <Block label='"PWA install prompt never appears"'>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Browser-side: only shows after a few repeat visits (~30s total engagement) and only over HTTPS</li>
                  <li>Service worker only registers in production builds — dev servers intentionally skip it to avoid stale-cache confusion</li>
                  <li>Hard refresh (<kbd>Cmd+Shift+R</kbd>) if you&apos;ve just deployed; the old service worker might be serving a stale manifest</li>
                </ul>
              </Block>

              <Block label='"TLS cert stuck on TRAEFIK DEFAULT CERT"'>
                Seen this on subdomain setups (e.g. demo.ghostbot.dev). Means Traefik is receiving traffic but has no router config for the host. Check: DNS resolves correctly, the Dokploy Domain config (or the dynamic file at <code>/etc/dokploy/traefik/dynamic/&lt;service&gt;.yml</code>) actually exists, and the Service Name inside points at the right container. See DEMO.md for the full pattern.
              </Block>

              <Block label="Where to dig further">
                Two useful places:
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li><strong>Dokploy logs</strong> — every unhandled error surfaces here first. Look for rate-limit 429s, docker-proxy 403s, auth errors</li>
                  <li><strong>Your own project&apos;s CLAUDE.md</strong> — keep &quot;What&apos;s shipped&quot; and &quot;Known issues&quot; sections up to date; it&apos;s the fastest way to see what&apos;s wired up and what isn&apos;t yet</li>
                </ul>
              </Block>
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
