'use client';

import { useRef, useEffect, useState } from 'react';
import { Greeting } from './greeting.jsx';
import { ThinkingMessage } from './thinking-message.jsx';
import { Markdown } from './markdown.jsx';
import { MonacoDiffView as DiffView } from './monaco-diff-view.jsx';

function JobCard({ job }) {
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunMsg, setRerunMsg] = useState(null);

  const color =
    job.status === 'succeeded' ? 'border-primary/40 bg-primary/5 text-primary' :
    job.status === 'failed'    ? 'border-destructive/40 bg-destructive/5 text-destructive' :
    job.status === 'running'   ? 'border-primary/30 bg-primary/5 text-foreground' :
                                  'border-border/60 bg-muted/40 text-muted-foreground';
  const label =
    job.status === 'succeeded' ? 'Done' :
    job.status === 'failed'    ? 'Failed' :
    job.status === 'running'   ? 'Running' :
    job.status === 'pending'   ? 'Pending' : job.status;

  const isTerminal = job.status === 'succeeded' || job.status === 'failed';

  async function loadDiff() {
    if (diff) { setDiff(null); return; }
    setDiffLoading(true);
    setDiffError(null);
    try {
      const res = await fetch(`/api/agent-jobs/diff?jobId=${encodeURIComponent(job.id)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setDiff(data.diff);
    } catch (err) {
      setDiffError(err.message);
    }
    setDiffLoading(false);
  }

  async function rerun() {
    if (rerunning) return;
    setRerunning(true);
    setRerunMsg(null);
    try {
      const res = await fetch('/api/agent-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rerun: job.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setRerunMsg('New job launched — check the list above');
    } catch (err) {
      setRerunMsg(`Failed: ${err.message}`);
    }
    setRerunning(false);
    setTimeout(() => setRerunMsg(null), 6000);
  }

  return (
    <div className={`rounded-2xl border px-4 sm:px-5 py-3 sm:py-4 overflow-hidden ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
            <span className="font-semibold">Agent job · {job.agent}</span>
            <span className="px-1.5 py-0.5 rounded bg-background/40">{label}</span>
          </div>
          <p className="mt-1.5 text-sm text-foreground break-words">{job.prompt}</p>
          {job.repo && (
            <p className="mt-1 text-[11px] text-muted-foreground font-mono">{job.repo} · {job.branch}</p>
          )}
          {job.error && (
            <p className="mt-2 text-[11px] text-destructive break-words">{job.error}</p>
          )}

          {/* Action buttons */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {job.prUrl && (
              <a href={job.prUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                Open PR →
              </a>
            )}
            {job.status === 'succeeded' && (
              <button
                onClick={loadDiff}
                disabled={diffLoading}
                className="text-[11px] px-2 py-1 rounded border border-border/60 bg-background/40 text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              >
                {diffLoading ? 'Loading...' : diff ? 'Hide diff' : 'View diff'}
              </button>
            )}
            {isTerminal && (
              <button
                onClick={rerun}
                disabled={rerunning}
                className="text-[11px] px-2 py-1 rounded border border-border/60 bg-background/40 text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              >
                {rerunning ? 'Launching...' : 'Re-run'}
              </button>
            )}
          </div>

          {rerunMsg && <p className="mt-2 text-[10px] text-muted-foreground">{rerunMsg}</p>}
          {diffError && <p className="mt-2 text-[10px] text-destructive">Diff error: {diffError}</p>}
          {diff && <DiffView diff={diff} />}

          {job.outputTail && (
            <details className="mt-2">
              <summary className="text-[10px] text-muted-foreground cursor-pointer">logs</summary>
              <pre className="mt-1 max-h-40 overflow-y-auto rounded bg-background/60 p-2 text-[10px] whitespace-pre-wrap font-mono">{job.outputTail}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export function Messages({ messages = [], isLoading = false, onSuggestion, jobs = [] }) {
  const endRef = useRef(null);
  const containerRef = useRef(null);

  // Defensive: filter out null/undefined/malformed entries
  const safeMessages = (Array.isArray(messages) ? messages : []).filter(
    (m) => m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant'),
  );

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [safeMessages.length, isLoading]);

  if (safeMessages.length === 0 && !isLoading && (!jobs || jobs.length === 0)) {
    return <Greeting onSuggestion={onSuggestion} />;
  }

  // Merge messages + jobs by timestamp so they interleave chronologically
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  return (
    <div ref={containerRef} className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
        {safeMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm leading-relaxed break-words overflow-hidden ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-foreground border border-primary/10'
                  : 'bg-muted/60 text-foreground'
              }`}
            >
              {msg.role === 'user' && Array.isArray(msg.images) && msg.images.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {msg.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Attachment ${i + 1}`}
                      className="max-h-48 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(src, '_blank')}
                    />
                  ))}
                </div>
              )}
              {msg.role === 'assistant' ? (
                <Markdown>{msg.content || msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || ''}</Markdown>
              ) : (
                (msg.content || msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '') &&
                <span className="whitespace-pre-wrap">{msg.content || msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || ''}</span>
              )}
            </div>
          </div>
        ))}
        {safeJobs.length > 0 && (
          <div className="space-y-3">
            {safeJobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
        {isLoading && safeMessages[safeMessages.length - 1]?.role === 'user' && (
          <ThinkingMessage />
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
