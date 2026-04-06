'use client';

import { useState } from 'react';
import { Button } from '../../auth/components/ui/button.jsx';
import { Input } from '../../auth/components/ui/input.jsx';
import { Label } from '../../auth/components/ui/label.jsx';
import { updateClusterRoleAction, deleteClusterRoleAction, triggerRoleManually } from '../actions.js';
import { Trash2, Zap } from '../../icons/index.jsx';

export function RoleEditor({ role, onRefresh }) {
  const [roleName, setRoleName] = useState(role.roleName);
  const [roleText, setRoleText] = useState(role.role || '');
  const [prompt, setPrompt] = useState(role.prompt || '');
  const [maxConcurrency, setMaxConcurrency] = useState(role.maxConcurrency || 1);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateClusterRoleAction(role.id, { roleName, role: roleText, prompt, maxConcurrency: parseInt(maxConcurrency, 10) });
    setSaving(false);
    onRefresh?.();
  }

  async function handleTrigger() {
    setTriggering(true);
    await triggerRoleManually(role.id);
    setTriggering(false);
  }

  async function handleDelete() {
    await deleteClusterRoleAction(role.id);
    onRefresh?.();
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} className="max-w-xs font-medium" />
        <div className="flex items-center gap-2">
          <Button onClick={handleTrigger} disabled={triggering} size="sm" variant="outline">
            <Zap className="h-3.5 w-3.5 mr-1" />
            {triggering ? 'Running...' : 'Trigger'}
          </Button>
          <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Role Instructions</Label>
        <textarea
          value={roleText}
          onChange={(e) => setRoleText(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
          placeholder="Describe what this role does..."
        />
      </div>

      <div className="space-y-2">
        <Label>Default Prompt</Label>
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Execute your role." />
      </div>

      <div className="space-y-2">
        <Label>Max Concurrency</Label>
        <Input type="number" value={maxConcurrency} onChange={(e) => setMaxConcurrency(e.target.value)} min={1} max={10} className="max-w-[100px]" />
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? 'Saving...' : 'Save Role'}
      </Button>
    </div>
  );
}
