'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Card, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { Webhook, Zap, RefreshCw, Loader2 } from '../../../lib/icons/index.jsx';

export default function TriggersPage() {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/triggers');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setTriggers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load triggers');
      setTriggers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhook Triggers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatically fire actions when webhooks are received. Edit{' '}
            <code className="bg-muted px-1 rounded">data/triggers.json</code> to add triggers.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && triggers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-5 w-5 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Loading triggers...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && triggers.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No triggers configured</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Create <code className="bg-muted px-1 rounded">data/triggers.json</code> with an array of trigger definitions
            </p>
          </CardContent>
        </Card>
      )}

      {triggers.length > 0 && (
        <div className="space-y-3">
          {triggers.map((t, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Zap className={`h-4 w-4 flex-shrink-0 ${t.enabled ? 'text-primary' : 'text-muted-foreground/30'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.watch_path} → {t.actions?.length || 0} action(s)
                  </p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${t.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {t.enabled ? 'Active' : 'Disabled'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
