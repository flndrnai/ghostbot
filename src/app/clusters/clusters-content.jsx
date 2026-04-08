'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../lib/auth/components/ui/button.jsx';
import { Input } from '../../lib/auth/components/ui/input.jsx';
import {
  getClusters,
  createClusterAction,
  listClusterTemplates,
  createClusterFromTemplateAction,
} from '../../lib/cluster/actions.js';
import { ClusterCard } from '../../lib/cluster/components/cluster-card.jsx';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';
import { Plus, Sparkles } from '../../lib/icons/index.jsx';

export function ClustersContent() {
  const router = useRouter();
  const [clusters, setClusters] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [instantiating, setInstantiating] = useState(null);

  function load() {
    getClusters().then(setClusters).catch(() => setClusters([]));
    listClusterTemplates().then(setTemplates).catch(() => setTemplates([]));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    await createClusterAction(newName.trim());
    setNewName('');
    setCreating(false);
    load();
  }

  async function handleCreateFromTemplate(templateId) {
    setInstantiating(templateId);
    const res = await createClusterFromTemplateAction(templateId);
    setInstantiating(null);
    if (res?.success && res.clusterId) {
      router.push(`/cluster/${res.clusterId}`);
    } else {
      load();
    }
  }

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-1px)] overflow-y-auto">
      <MobilePageHeader title="Clusters" />
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clusters</h1>
            <p className="mt-1 text-sm text-muted-foreground">Multi-role agent pipelines — chain coding agents together</p>
          </div>
          <Button onClick={() => setShowTemplates((v) => !v)} variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            {showTemplates ? 'Hide templates' : 'Use a template'}
          </Button>
        </div>

        {/* Templates gallery */}
        {showTemplates && (
          <div className="mb-6 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Cluster templates</h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{templates.length} available</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <div key={t.id} className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(t.roles || []).map((r) => (
                      <span key={r.roleName} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {r.roleName}
                      </span>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleCreateFromTemplate(t.id)}
                    disabled={instantiating === t.id}
                    size="sm"
                    className="mt-1"
                  >
                    {instantiating === t.id ? 'Creating...' : 'Create from template'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create blank cluster */}
        <div className="flex gap-2 mb-6">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New cluster name..."
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        {/* Cluster grid */}
        {clusters.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No clusters yet</p>
            <p className="text-xs opacity-50 mt-1">Pick a template above, or create a blank cluster to start</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {clusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
