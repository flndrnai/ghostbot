'use client';

import { useState, useEffect } from 'react';
import {
  createSkillAction,
  listSkillsAction,
  updateSkillAction,
  deleteSkillAction,
} from '../../../lib/skills/actions.js';

export default function SkillsContent() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [modelPreference, setModelPreference] = useState('');

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    try {
      const list = await listSkillsAction();
      setSkills(list || []);
    } catch {}
    setLoading(false);
  }

  function resetForm() {
    setName('');
    setSlug('');
    setDescription('');
    setPromptTemplate('');
    setModelPreference('');
    setShowCreate(false);
    setEditing(null);
  }

  function startEdit(skill) {
    setEditing(skill.id);
    setName(skill.name);
    setSlug(skill.slug);
    setDescription(skill.description || '');
    setPromptTemplate(skill.promptTemplate);
    setModelPreference(skill.modelPreference || '');
    setShowCreate(true);
  }

  async function handleSave() {
    if (!name || !slug || !promptTemplate) return;
    if (editing) {
      await updateSkillAction(editing, { name, slug, description, promptTemplate, modelPreference: modelPreference || null });
    } else {
      await createSkillAction({ name, slug, description, promptTemplate, modelPreference: modelPreference || null });
    }
    resetForm();
    await loadSkills();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this skill?')) return;
    await deleteSkillAction(id);
    await loadSkills();
  }

  // Auto-generate slug from name
  function handleNameChange(v) {
    setName(v);
    if (!editing) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable prompt templates — invoke from chat with <code className="bg-muted px-1.5 py-0.5 rounded">/skill-name</code>
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            New Skill
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-card rounded-xl border border-border/40 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {editing ? 'Edit Skill' : 'Create Skill'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Code Reviewer"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Slug (used as /command)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="code-reviewer"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Reviews code for bugs and best practices"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Prompt Template <span className="text-muted-foreground font-normal">(use {'{{input}}'} for user input)</span>
            </label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={6}
              className="w-full bg-background border border-border/60 rounded-lg px-3 py-3 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder={'Review this code for bugs, security issues, and best practices:\n\n{{input}}'}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Model Override (optional)</label>
            <input
              value={modelPreference}
              onChange={(e) => setModelPreference(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Leave empty to use default model"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!name || !slug || !promptTemplate}
              className="px-4 py-2 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {editing ? 'Update' : 'Create'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading skills...</div>
      ) : skills.length === 0 && !showCreate ? (
        <div className="text-center py-12 text-muted-foreground">
          No skills yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border border-border/40 px-5 py-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">/{s.slug}</code>
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-2 font-mono truncate">
                  {s.promptTemplate.slice(0, 100)}{s.promptTemplate.length > 100 ? '...' : ''}
                </p>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => startEdit(s)}
                  className="px-3 py-1.5 text-xs bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
