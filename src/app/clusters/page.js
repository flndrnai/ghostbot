'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../lib/auth/components/ui/button.jsx';
import { Input } from '../../lib/auth/components/ui/input.jsx';
import { getClusters, createClusterAction } from '../../lib/cluster/actions.js';
import { ClusterCard } from '../../lib/cluster/components/cluster-card.jsx';
import { Plus } from '../../lib/icons/index.jsx';

export default function ClustersPage() {
  const [clusters, setClusters] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    getClusters().then(setClusters).catch(() => setClusters([]));
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clusters</h1>
            <p className="mt-1 text-sm text-muted-foreground">Groups of Docker agents with roles and triggers</p>
          </div>
        </div>

        {/* Create new cluster */}
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
            <p className="text-xs opacity-50 mt-1">Create a cluster to orchestrate teams of coding agents</p>
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
