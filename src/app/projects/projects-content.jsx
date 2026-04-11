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
import { FolderOpen, Trash2, Pencil, MessageSquarePlus, Upload, FolderUp, Hammer } from 'lucide-react';
import { formatDate } from '../../lib/date-format.js';
import { useRef } from 'react';

export function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(null);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [buildingProject, setBuildingProject] = useState(null);
  const [buildGoal, setBuildGoal] = useState('');
  const [buildLoading, setBuildLoading] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

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

  async function handleUpload(projectId, files) {
    if (!files || files.length === 0) return;
    setUploading(projectId);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      for (const file of files) {
        // Preserve relative path for folder uploads
        formData.append('files', file, file.webkitRelativePath || file.name);
      }
      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const msg = `${data.uploaded} file(s) uploaded${data.errors?.length ? `, ${data.errors.length} skipped` : ''}`;
      setUploadMsg(msg);
      setTimeout(() => setUploadMsg(null), 5000);
    } catch (err) {
      setUploadMsg(`Upload failed: ${err.message}`);
      setTimeout(() => setUploadMsg(null), 5000);
    }
    setUploading(null);
  }

  function triggerFileUpload(projectId) {
    uploadTargetRef.current = projectId;
    fileInputRef.current?.click();
  }

  function triggerFolderUpload(projectId) {
    uploadTargetRef.current = projectId;
    folderInputRef.current?.click();
  }

  async function handleClone() {
    if (!cloneUrl.trim()) return;
    setCloning(true);
    setUploadMsg(null);
    try {
      const res = await fetch('/api/projects/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cloneUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clone failed');
      setCloneUrl('');
      setUploadMsg(`Cloned successfully: ${data.project?.path || 'done'}`);
      setTimeout(() => setUploadMsg(null), 5000);
      load();
    } catch (err) {
      setUploadMsg(`Clone failed: ${err.message}`);
      setTimeout(() => setUploadMsg(null), 8000);
    }
    setCloning(false);
  }

  async function handleNewChat(projectId) {
    try {
      // Check if there's already a chat connected to this project
      const res = await fetch('/api/chats');
      const chats = await res.json();
      const existingChat = (Array.isArray(chats) ? chats : []).find((c) => c.projectId === projectId);

      if (existingChat) {
        // Navigate to the existing project chat
        router.push(`/chat/${existingChat.id}`);
        return;
      }

      // Create an empty chat with the project name, then connect the project
      const project = projects.find((p) => p.id === projectId);
      const createRes = await fetch('/api/projects/' + projectId + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: project?.name || 'Project' }),
      });
      const data = await createRes.json();
      if (data.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    } catch (err) {
      console.error('[projects] open chat failed:', err);
    }
  }

  async function handleBuild(projectId) {
    if (!buildGoal.trim()) return;
    setBuildLoading(true);
    try {
      const { createBuilderPlanAction } = await import('../../lib/builder/actions.js');
      const result = await createBuilderPlanAction(projectId, buildGoal.trim());
      if (result?.planId) {
        router.push(`/builder/${result.planId}`);
      } else if (result?.error) {
        alert(result.error);
      }
    } catch (err) {
      console.error('[projects] build plan failed:', err);
    }
    setBuildLoading(false);
    setBuildingProject(null);
    setBuildGoal('');
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

        {/* Hidden file inputs for upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleUpload(uploadTargetRef.current, Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-ignore — webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={(e) => {
            handleUpload(uploadTargetRef.current, Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />

        {uploadMsg && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground">
            {uploadMsg}
          </div>
        )}

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

        {/* Clone from Git */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={cloneUrl}
            onChange={(e) => setCloneUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleClone()}
            placeholder="Clone from Git URL (e.g. https://github.com/user/repo)"
            className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            onClick={handleClone}
            disabled={cloning || !cloneUrl.trim()}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary disabled:opacity-50 transition-colors cursor-pointer"
          >
            {cloning ? 'Cloning...' : 'Clone'}
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
                    onClick={() => triggerFileUpload(project.id)}
                    disabled={uploading === project.id}
                    title="Upload files"
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => triggerFolderUpload(project.id)}
                    disabled={uploading === project.id}
                    title="Upload folder"
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <FolderUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleNewChat(project.id)}
                    title="Open chat with this project"
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setBuildingProject(buildingProject === project.id ? null : project.id); setBuildGoal(''); }}
                    title="Autonomous Builder"
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <Hammer className="h-3.5 w-3.5" />
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
              {buildingProject === project.id && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 -mt-1">
                  <p className="text-sm font-medium text-foreground mb-2">What do you want to build?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={buildGoal}
                      onChange={(e) => setBuildGoal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBuild(project.id)}
                      placeholder="Describe the feature or full project to build..."
                      autoFocus
                      className="flex-1 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={() => handleBuild(project.id)}
                      disabled={buildLoading || !buildGoal.trim()}
                      className="px-4 py-2.5 bg-primary text-background rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {buildLoading ? 'Planning...' : 'Build'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The LLM will generate a step-by-step plan, then execute each step as an agent job.
                  </p>
                </div>
              )}
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
