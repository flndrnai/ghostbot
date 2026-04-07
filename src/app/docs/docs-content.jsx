'use client';

import { useState } from 'react';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'llm-providers', label: 'LLM Providers' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'chat', label: 'Chat Settings' },
  { id: 'agents', label: 'Agents' },
  { id: 'github', label: 'GitHub (setup together)' },
  { id: 'telegram', label: 'Telegram (setup together)' },
  { id: 'triggers', label: 'Triggers' },
  { id: 'crons', label: 'Crons' },
  { id: 'containers', label: 'Containers' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'clusters', label: 'Clusters' },
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
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">GhostBot Docs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What every Admin section is, what it does, and why you need it.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sticky table of contents */}
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
        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
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
              <Block label="What we do together">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>You create a fine-scoped Personal Access Token at github.com/settings/tokens (scopes: <code>repo</code>, <code>workflow</code>)</li>
                  <li>You paste it into the GitHub admin page</li>
                  <li>You enter <code>flndrnai/ghostbot</code> (or whatever target repo)</li>
                  <li>I help you verify Test Connection passes and run a sanity-check agent job</li>
                </ol>
                <strong>Ping me when you&apos;re ready</strong> — we&apos;ll do this in 5 minutes.
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
              <Block label="What we do together">
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>You message <a className="text-primary underline" href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram, run <code>/newbot</code>, get a bot token</li>
                  <li>You message your new bot once so it has a chat ID</li>
                  <li>You paste the token + your numeric chat ID into the Telegram admin page</li>
                  <li>I help you verify the welcome message arrives and webhook is registered</li>
                </ol>
                <strong>Ping me when you&apos;re ready.</strong>
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
