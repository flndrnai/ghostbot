'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import {
  getCluster,
  updateClusterSystemPromptAction,
  createClusterRoleAction,
} from '../../../lib/cluster/actions.js';
import { RoleEditor } from '../../../lib/cluster/components/role-editor.jsx';
import { ArrowLeft, Plus, Settings } from '../../../lib/icons/index.jsx';

export function ClusterDetailContent() {
  const { clusterId } = useParams();
  const router = useRouter();
  const [cluster, setCluster] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getCluster(clusterId).then((c) => {
      setCluster(c);
      setSystemPrompt(c?.systemPrompt || '');
    });
  }

  useEffect(() => { load(); }, [clusterId]);

  async function handleSavePrompt() {
    setSaving(true);
    await updateClusterSystemPromptAction(clusterId, systemPrompt);
    setSaving(false);
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) return;
    await createClusterRoleAction(clusterId, newRoleName.trim());
    setNewRoleName('');
    load();
  }

  if (!cluster) return <div className="h-[100dvh] md:h-[calc(100vh-1px)] flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-1px)] overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/clusters')} className="p-2 rounded-lg hover:bg-muted cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{cluster.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${cluster.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                {cluster.enabled ? 'Active' : 'Disabled'}
              </span>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={() => router.push(`/cluster/${clusterId}/console`)} className="text-xs text-primary hover:underline cursor-pointer">
                Open Console
              </button>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="mb-8 space-y-3">
          <Label>Cluster System Prompt</Label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            placeholder="Shared context for all roles in this cluster..."
          />
          <Button onClick={handleSavePrompt} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Prompt'}
          </Button>
        </div>

        {/* Roles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Roles</h2>
          </div>

          <div className="flex gap-2 mb-4">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="New role name..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
            />
            <Button onClick={handleAddRole} disabled={!newRoleName.trim()} size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Role
            </Button>
          </div>

          {(cluster.roles || []).map((role) => (
            <RoleEditor key={role.id} role={role} onRefresh={load} />
          ))}

          {(cluster.roles || []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No roles yet. Add a role to define what this cluster's agents do.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
