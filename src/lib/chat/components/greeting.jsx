'use client';

export function Greeting() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      {/* Ghost icon with float animation and glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150 animate-glow-pulse" />
        <img src="/icon.svg" alt="GhostBot" className="relative h-20 w-20 animate-ghost-float" />
      </div>

      <div className="text-center max-w-sm stagger-children">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          How can I help?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Start a conversation, run a coding agent, or describe what you want to build.
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-md">
        {['Create a project', 'Review code', 'Fix a bug', 'Explain this'].map((s) => (
          <button
            key={s}
            className="rounded-full border border-border/60 bg-muted/50 px-4 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all duration-200 cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
