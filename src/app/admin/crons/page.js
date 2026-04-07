'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Card, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { Clock, Timer, RefreshCw, Loader2 } from '../../../lib/icons/index.jsx';

export default function CronsPage() {
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crons');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setCrons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load crons');
      setCrons([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cron Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scheduled tasks that run automatically. Edit{' '}
            <code className="bg-muted px-1 rounded">data/crons.json</code> to add jobs.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && crons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-5 w-5 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Loading cron jobs...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && crons.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No cron jobs configured</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Example schedule: <code className="bg-muted px-1 rounded">0 9 * * 1-5</code> = weekdays 9am
            </p>
          </CardContent>
        </Card>
      )}

      {crons.length > 0 && (
        <div className="space-y-3">
          {crons.map((c, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Timer className={`h-4 w-4 flex-shrink-0 ${c.enabled ? 'text-primary' : 'text-muted-foreground/30'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">{c.schedule}</code> → {c.type || 'agent'}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {c.enabled ? 'Active' : 'Disabled'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
