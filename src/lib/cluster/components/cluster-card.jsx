'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Settings, Trash2, ArrowUp, Loader2 } from '../../icons/index.jsx';
import { toggleClusterAction, starClusterAction, deleteClusterAction, runClusterNowAction } from '../actions.js';

export function ClusterCard({ cluster, onRefresh }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState(null);

  async function handleToggle(e) {
    e.stopPropagation();
    await toggleClusterAction(cluster.id);
    onRefresh?.();
  }

  async function handleStar(e) {
    e.stopPropagation();
    await starClusterAction(cluster.id);
    onRefresh?.();
  }

  async function handleDelete(e) {
    e.stopPropagation();
    await deleteClusterAction(cluster.id);
    onRefresh?.();
  }

  async function handleRunNow(e) {
    e.stopPropagation();
    if (running) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await runClusterNowAction(cluster.id);
      if (res.error) {
        setRunMsg({ type: 'error', text: res.error });
      } else {
        setRunMsg({ type: 'success', text: `Chain started — ${res.roleCount} role(s). Check Monitoring for status.` });
      }
    } catch (err) {
      setRunMsg({ type: 'error', text: err.message });
    }
    setRunning(false);
    setTimeout(() => setRunMsg(null), 6000);
  }

  return (
    <div
      onClick={() => router.push(`/cluster/${cluster.id}`)}
      className={`rounded-2xl border p-5 transition-all duration-200 cursor-pointer hover:border-primary/30 ${
        cluster.enabled ? 'border-border/60 bg-card' : 'border-border/30 bg-card/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{cluster.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cluster.enabled ? 'Active' : 'Disabled'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleStar} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer">
            <Star className={`h-3.5 w-3.5 ${cluster.starred ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            cluster.enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            cluster.enabled ? 'translate-x-4' : 'translate-x-1'
          }`} />
        </button>
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {cluster.systemPrompt ? `${cluster.systemPrompt.slice(0, 50)}...` : 'No system prompt'}
        </span>
      </div>

      <button
        onClick={handleRunNow}
        disabled={running}
        className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
          running
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30'
        }`}
      >
        {running ? <Loader2 className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
        {running ? 'Launching...' : 'Run now'}
      </button>

      {runMsg && (
        <p className={`mt-2 text-[11px] ${runMsg.type === 'error' ? 'text-destructive' : 'text-primary'}`}>
          {runMsg.text}
        </p>
      )}
    </div>
  );
}
