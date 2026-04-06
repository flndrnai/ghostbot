'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { Clock, Timer } from 'lucide-react';

export default function CronsPage() {
  const [crons, setCrons] = useState([]);

  useEffect(() => {
    fetch('/api/crons')
      .then((r) => r.json())
      .then(setCrons)
      .catch(() => setCrons([]));
  }, []);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cron Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scheduled tasks that run automatically</p>
      </div>

      {crons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No cron jobs configured</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Edit <code className="bg-muted px-1 rounded">data/crons.json</code> to add scheduled jobs</p>
          </CardContent>
        </Card>
      ) : (
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
