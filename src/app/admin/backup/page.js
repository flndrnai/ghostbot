'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { getBackupStats, exportBackup } from '../../../lib/admin/backup-actions.js';
import { Loader2, CheckCircle, RefreshCw } from '../../../lib/icons/index.jsx';

function formatBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function BackupPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastExportAt, setLastExportAt] = useState(null);

  async function loadStats() {
    setLoading(true);
    try {
      const s = await getBackupStats();
      setStats(s);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadStats(); }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const dump = await exportBackup();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `ghostbot-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLastExportAt(new Date().toLocaleString([], { hour12: false }));
    } catch (err) {
      console.error(err);
    }
    setExporting(false);
  }

  const totalRows = stats?.tables
    ? Object.values(stats.tables).reduce((a, b) => a + (b || 0), 0)
    : 0;

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Download a full JSON snapshot of your GhostBot database + agent images manifest
          </p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">DB file size</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{formatBytes(stats?.dbSize || 0)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total rows</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{totalRows.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last export</p>
          <p className="text-sm font-bold text-primary mt-0.5">{lastExportAt || '—'}</p>
        </div>
      </div>

      {/* Row counts by table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Row counts</CardTitle>
          <CardDescription>What's in the backup</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.tables && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(stats.tables).map(([table, count]) => (
                <div key={table} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                  <span className="font-mono text-foreground/80">{table}</span>
                  <span className="text-primary font-semibold">{count === null ? '—' : count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export JSON snapshot</CardTitle>
          <CardDescription>
            Downloads every row of every non-secret table + your non-secret settings + a list of installed
            coding-agent Docker images. Secrets (API keys, tokens) are NOT included — they stay encrypted
            on the server. To do a full restore you also need a copy of your AUTH_SECRET.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 className="h-4 w-4 mr-2" /> Exporting...</> : 'Download backup'}
          </Button>
          {lastExportAt && (
            <p className="text-xs text-primary flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" /> Last export: {lastExportAt}
            </p>
          )}
        </CardContent>
      </Card>

      {/* How to restore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to restore</CardTitle>
          <CardDescription>Treat this backup as read-only insurance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Simplest path:</strong> store the downloaded JSON file
            somewhere safe (your Mac + cloud drive). Also keep a copy of your{' '}
            <code className="bg-muted px-1 rounded">AUTH_SECRET</code> from Dokploy environment variables —
            without it, encrypted secrets in the DB can't be decrypted after a restore.
          </p>
          <p>
            <strong className="text-foreground">Full VPS disaster:</strong> the persistent{' '}
            <code className="bg-muted px-1 rounded">ghostbot-data</code> volume in Dokploy holds the live
            SQLite file at <code className="bg-muted px-1 rounded">/app/data/db/ghostbot.sqlite</code>.
            Docker volumes usually survive container rebuilds; the JSON export is your safety net if the
            volume itself is lost.
          </p>
          <p>
            <strong className="text-foreground">Before KVM8 migration:</strong> export here, scp the JSON to
            the new server, then import via a future restore tool (shipping later).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
