'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { Box, Square, Trash2, RefreshCw, Loader2 } from '../../../lib/icons/index.jsx';

export default function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadContainers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/containers');
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }
      setContainers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setContainers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadContainers();
    const interval = setInterval(loadContainers, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleStop(name) {
    if (!name) return;
    try {
      await fetch(`/api/containers?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      loadContainers();
    } catch {}
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Containers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Docker containers running GhostBot agents</p>
        </div>
        <Button onClick={loadContainers} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive space-y-2">
          <p className="font-semibold">Cannot reach Docker</p>
          <p className="text-xs text-destructive/80">{error}</p>
          <p className="text-xs text-destructive/70">
            Fix: in Dokploy → Advanced → Volumes, add a bind mount from
            {' '}<code className="bg-destructive/10 px-1 rounded">/var/run/docker.sock</code> to
            {' '}<code className="bg-destructive/10 px-1 rounded">/var/run/docker.sock</code>, then redeploy.
          </p>
        </div>
      )}

      {!loading && containers.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Box className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No containers running</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Start a coding task or create a workspace to see containers here</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {containers.map((c) => (
          <Card key={c.Id || c.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${c.State === 'running' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {(c.Names?.[0] || c.name || '').replace(/^\//, '')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.Image || c.image} &middot; {c.Status || c.State}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleStop((c.Names?.[0] || c.name || '').replace(/^\//, ''))}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
