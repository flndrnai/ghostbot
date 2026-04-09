'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProjectAction,
  listProjectsAction,
  deleteProjectAction,
  renameProjectAction,
} from '../../lib/projects/actions.js';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';
import { Plus } from '../../lib/icons/index.jsx';
import { FolderOpen, Trash2, Pencil, MessageSquarePlus } from 'lucide-react';
import { formatDate } from '../../lib/date-format.js';

export function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  function load() {
    listProjectsAction().then(setProjects).catch(() => setProjects([]));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProjectAction(newName.trim());
      setNewName('');
      load();
    } catch (err) {
      console.error('[projects] create failed:', err);
    }
    setCreating(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project? Files on disk are preserved.')) return;
    try {
      await deleteProjectAction(id);
      load();
    } catch (err) {
      console.error('[projects] delete failed:', err);
    }
  }

  async function handleRename(id) {
    if (!editName.trim()) return;
    try {
      await renameProjectAction(id, editName.trim());
      setEditingId(null);
      setEditName('');
      load();
    } catch (err) {
      console.error('[projects] rename failed:', err);
    }
  }

  function handleNewChat(projectId) {
    // Navigate to home to create a new chat, with project connect
    // The chat page will handle connecting the project
    router.push(`/?projectId=${projectId}`);
  }

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-1px)] overflow-y-auto">
      <MobilePageHeader title="Projects" />
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">Connect project folders for GhostBot to work on</p>
          </div>
        </div>

        {/* Create new project */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New project name..."
            className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl border border-border/60 bg-muted/20 px-5 py-4 flex items-center justify-between gap-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {editingId === project.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(project.id);
                          if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                        }}
                        autoFocus
                        className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <button onClick={() => handleRename(project.id)} className="text-xs text-primary hover:text-primary/80 cursor-pointer">Save</button>
                      <button onClick={() => { setEditingId(null); setEditName(''); }} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{project.path}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleNewChat(project.id)}
                    title="Open new chat with this project"
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setEditingId(project.id); setEditName(project.name); }}
                    title="Rename"
                    className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    title="Delete"
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
