'use client';

const SUGGESTIONS = [
  { label: 'Create a project', prompt: 'Help me create a new project. Ask me what kind of project I want to build and guide me through the setup.' },
  { label: 'Review code', prompt: 'I want you to review some code. Ask me to share the code and what aspects you should focus on.' },
  { label: 'Fix a bug', prompt: 'Help me fix a bug. Ask me to describe the bug and share the relevant code.' },
  { label: 'Explain this', prompt: 'I need help understanding something. Ask me what topic, concept, or code I want explained.' },
];

export function Greeting({ onSuggestion }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      {/* Ghost icon with float animation and glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150 animate-glow-pulse" />
        <img src="/ghostbot-icon.svg" alt="GhostBot" className="relative h-20 w-20 animate-ghost-float" />
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
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              if (typeof onSuggestion === 'function') onSuggestion(s.prompt);
            }}
            className="rounded-full border border-border/60 bg-muted/50 px-4 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all duration-200 cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
