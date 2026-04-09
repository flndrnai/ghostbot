'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Link2, Unlink } from 'lucide-react';

export function ProjectSelector({ chatId, projectId, onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/projects')
        .then((r) => r.json())
        .then((d) => setProjects(d.projects || []))
        .catch(() => setProjects([]));
    }
  }, [open]);

  async function connect(pid) {
    if (!chatId) {
      // Chat hasn't been created yet — send a message first
      alert('Send a message first to create the chat, then connect a project.');
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/projects/${pid}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      });
      onProjectChange?.(pid);
      setOpen(false);
    } catch (err) {
      console.error('[project-selector] connect failed:', err);
    }
    setLoading(false);
  }

  async function disconnect() {
    if (!projectId) return;
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/connect`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      });
      onProjectChange?.(null);
    } catch (err) {
      console.error('[project-selector] disconnect failed:', err);
    }
    setLoading(false);
  }

  if (projectId) {
    return (
      <button
        onClick={disconnect}
        disabled={loading}
        title="Disconnect project"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
      >
        <FolderOpen className="h-3 w-3" />
        Project connected
        <Unlink className="h-3 w-3 ml-1 opacity-60" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <Link2 className="h-3 w-3" />
        Connect project
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-xl border border-border/60 bg-background shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Select a project</p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No projects yet.{' '}
                <a href="/projects" className="text-primary underline">Create one</a>
              </p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => connect(p.id)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="truncate text-foreground">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
