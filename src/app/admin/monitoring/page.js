'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { RefreshCw } from '../../../lib/icons/index.jsx';

function formatTs(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export default function MonitoringPage() {
  const [summary, setSummary] = useState(null);
  const [byProvider, setByProvider] = useState([]);
  const [daily, setDaily] = useState([]);
  const [jobStats, setJobStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring');
      const data = await res.json();
      setSummary(data.summary);
      setByProvider(data.byProvider || []);
      setDaily(data.daily || []);
      setJobStats(data.jobStats || null);
      setRecentJobs(data.recentJobs || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function formatTokens(n) {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">Token usage, agent jobs, and activity (last 30 days)</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-primary">{formatTokens(summary?.totalTokens)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-foreground">{formatTokens(summary?.promptTokens)}</p>
            <p className="text-xs text-muted-foreground mt-1">Input Tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-foreground">{formatTokens(summary?.completionTokens)}</p>
            <p className="text-xs text-muted-foreground mt-1">Output Tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-foreground">{summary?.count || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {byProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No usage data yet</p>
          ) : (
            <div className="space-y-3">
              {byProvider.map((row, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.provider}</p>
                    <p className="text-xs text-muted-foreground">{row.model} &middot; {row.count} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatTokens(row.totalTokens)}</p>
                    <p className="text-[11px] text-muted-foreground">tokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent jobs summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent Jobs</CardTitle>
          <CardDescription>Autonomous coding agent runs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-center">
              <p className="text-xl font-bold text-foreground">{jobStats?.total || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 text-center">
              <p className="text-xl font-bold text-primary">{jobStats?.succeeded || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Succeeded</p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-center">
              <p className="text-xl font-bold text-destructive">{jobStats?.failed || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Failed</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-center">
              <p className="text-xl font-bold text-foreground">{jobStats?.running || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Running</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-center">
              <p className="text-xl font-bold text-foreground">{jobStats?.pending || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Pending</p>
            </div>
          </div>

          {recentJobs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent</p>
              {recentJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        j.status === 'succeeded' ? 'bg-primary/10 text-primary' :
                        j.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>{j.status}</span>
                      <span className="text-[11px] text-muted-foreground">{j.agent}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{formatTs(j.createdAt)}</span>
                    </div>
                    <p className="text-xs text-foreground truncate mt-0.5">{j.prompt}</p>
                  </div>
                  {j.prUrl && (
                    <a href={j.prUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline ml-3 flex-shrink-0">PR</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Usage (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No usage data yet</p>
          ) : (
            <div className="space-y-2">
              {daily.map((row, i) => {
                const maxTokens = Math.max(...daily.map((d) => d.totalTokens || 0), 1);
                const width = ((row.totalTokens || 0) / maxTokens) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{row.day}</span>
                    <div className="flex-1 h-6 rounded-md bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-md bg-primary/30" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{formatTokens(row.totalTokens)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
