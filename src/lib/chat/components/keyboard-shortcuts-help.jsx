'use client';

import { modKeyLabel } from './use-keyboard-shortcuts.js';

const MOD = modKeyLabel();

const SHORTCUTS = [
  { keys: [MOD, 'B'], desc: 'Toggle sidebar' },
  { keys: [MOD, 'K'], desc: 'Focus chat input' },
  { keys: [MOD, 'Shift', 'N'], desc: 'New chat' },
  { keys: [MOD, '/'], desc: 'Show this help' },
  { keys: ['Enter'], desc: 'Send message (in chat input)' },
  { keys: ['Shift', 'Enter'], desc: 'New line (in chat input)' },
  { keys: ['Esc'], desc: 'Close this help' },
];

export function KeyboardShortcutsHelp({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Esc
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-foreground/80">{s.desc}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-0.5 rounded border border-border/60 bg-muted/50 text-[11px] font-mono text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
