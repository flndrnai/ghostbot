'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { Webhook, Zap } from '../../../lib/icons/index.jsx';

export default function TriggersPage() {
  const [triggers, setTriggers] = useState([]);

  useEffect(() => {
    fetch('/api/triggers')
      .then((r) => r.json())
      .then(setTriggers)
      .catch(() => setTriggers([]));
  }, []);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Webhook Triggers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Automatically fire actions when webhooks are received</p>
      </div>

      {triggers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No triggers configured</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Edit <code className="bg-muted px-1 rounded">data/triggers.json</code> to add triggers</p>
          </CardContent>
        </Card>
      ) : (
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
