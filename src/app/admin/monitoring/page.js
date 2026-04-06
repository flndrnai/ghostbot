'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';

export default function MonitoringPage() {
  const [summary, setSummary] = useState(null);
  const [byProvider, setByProvider] = useState([]);
  const [daily, setDaily] = useState([]);

  useEffect(() => {
    fetch('/api/monitoring')
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        setByProvider(data.byProvider || []);
        setDaily(data.daily || []);
      })
      .catch(() => {});
  }, []);

  function formatTokens(n) {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">Token usage and cost tracking (last 30 days)</p>
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
