'use client';

import {
  MessageSquare,
  Bot,
  Brain,
  GitBranch,
  FolderOpen,
  Bell,
  Layers,
  Shield,
  Github,
  ArrowRight,
  Terminal,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Chat with Any LLM',
    desc: 'Ollama, Anthropic, OpenAI, Google — one interface, any model. Self-hosted or cloud.',
  },
  {
    icon: Bot,
    title: 'Docker Coding Agents',
    desc: 'Aider, OpenCode, Codex CLI, Gemini CLI — ephemeral containers that clone, edit, and push.',
  },
  {
    icon: Brain,
    title: 'Memory & RAG',
    desc: 'Auto-summarize chats, embed with nomic-embed-text, inject relevant context into every prompt.',
  },
  {
    icon: Layers,
    title: 'Cluster Pipelines',
    desc: 'Chain multi-role agents — PR reviewer, docs writer, test coverage — sequentially or in parallel.',
  },
  {
    icon: FolderOpen,
    title: 'Project Connect',
    desc: 'Mount local folders, attach files to chat, auto-inject CLAUDE.md into system prompts.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'Telegram and Slack alerts for agent jobs. GitHub PR comment triggers with /ghostbot.',
  },
  {
    icon: GitBranch,
    title: 'GitHub Integration',
    desc: 'Agents push commits, open PRs, post status. Webhook-driven — comment on a PR to trigger a job.',
  },
  {
    icon: Shield,
    title: 'Self-Hosted & Secure',
    desc: 'Your data stays on your server. AES-256-GCM encrypted secrets, JWT auth, multi-user invites.',
  },
];

const techStack = [
  'Next.js 16',
  'React 19',
  'Tailwind v4',
  'SQLite + Drizzle',
  'Docker',
  'Ollama',
  'LangChain',
  'NextAuth v5',
];

export function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] bg-background overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute top-[-15%] left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/[0.04] blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[-10%] h-[400px] w-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/ghostbot-icon.svg" alt="GhostBot" className="h-8 w-8" />
          <span className="text-lg font-semibold text-foreground">GhostBot</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/flndrnai/ghostbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-4xl mx-auto stagger-children">
        <div className="animate-ghost-float mb-6">
          <img src="/ghostbot-icon.svg" alt="GhostBot" className="h-20 w-20 drop-shadow-[0_0_30px_rgba(245,217,122,0.2)]" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
          Self-hosted AI<br />
          <span className="text-primary">coding agent platform</span>
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Chat with any LLM. Run coding agents in Docker. Orchestrate multi-role pipelines.
          Memory that learns. All on your own server.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://github.com/flndrnai/ghostbot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,217,122,0.15)]"
          >
            <Terminal className="h-4 w-4" />
            Self-Host Now
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card/50 p-5 hover:border-primary/30 hover:bg-card/80 transition-all"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">How it works</h2>
        <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
          One Next.js app. No microservices, no message queues. SQLite is the only datastore.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-2">
          {[
            { step: '1', label: 'Deploy', desc: 'docker compose up' },
            { step: '2', label: 'Connect', desc: 'Add your LLM + GitHub' },
            { step: '3', label: 'Build', desc: 'Chat, run agents, ship code' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2 sm:gap-0">
              <div className="flex flex-col items-center rounded-xl border border-border bg-card/50 px-8 py-6 min-w-[180px]">
                <span className="text-2xl font-bold text-primary mb-1">{s.step}</span>
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className="text-xs text-muted-foreground mt-1 font-mono">{s.desc}</span>
              </div>
              {i < 2 && (
                <Zap className="h-4 w-4 text-primary/40 mx-3 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto text-center">
        <h2 className="text-lg font-semibold text-muted-foreground mb-5">Built with</h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {techStack.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-20 max-w-3xl mx-auto text-center">
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Ready to self-host?
          </h2>
          <p className="text-muted-foreground mb-6">
            Clone the repo, run one command, and you have your own AI coding agent platform.
          </p>
          <div className="inline-flex items-center gap-3 rounded-lg bg-card border border-border px-5 py-3 font-mono text-sm text-foreground mb-6">
            <Terminal className="h-4 w-4 text-primary" />
            <span>docker compose up -d</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/flndrnai/ghostbot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src="/ghostbot-icon.svg" alt="GhostBot" className="h-5 w-5 opacity-50" />
            <span>GhostBot</span>
            <span className="text-muted-foreground/40">|</span>
            <span>MIT License</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/flndrnai/ghostbot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
