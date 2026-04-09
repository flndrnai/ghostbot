'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';

export function CreateProjectFromChat({ chatId, onProjectCreated }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Create the project
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.project?.id) throw new Error(data.error || 'Failed to create project');

      // Connect the project to this chat (if chat exists)
      if (chatId) {
        await fetch(`/api/projects/${data.project.id}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        });
      }

      setOpen(false);
      setName('');
      onProjectCreated?.(data.project.id);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
      >
        <Rocket className="h-3 w-3" />
        Create project from this chat
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border/60 bg-background shadow-lg z-50 p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Create project
          </p>
          <p className="text-[11px] text-muted-foreground/70 mb-3">
            Creates a project folder and connects it to this chat. The brainstorm conversation becomes the project context.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Project name..."
            autoFocus
            className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 mb-2"
          />
          {error && <p className="text-[10px] text-destructive mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create & connect'}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); }}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
