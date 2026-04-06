'use client';

import { cn } from '../../utils.js';

const modes = [
  { id: 'plan', label: 'Plan', description: 'Read-only analysis' },
  { id: 'code', label: 'Code', description: 'Write files and run commands' },
  { id: 'job', label: 'Job', description: 'Autonomous background task' },
];

export function CodeModeToggle({ value = 'plan', onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          title={mode.description}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer',
            value === mode.id
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
