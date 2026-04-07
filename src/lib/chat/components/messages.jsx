'use client';

import { useRef, useEffect } from 'react';
import { Greeting } from './greeting.jsx';
import { ThinkingMessage } from './thinking-message.jsx';
import { Markdown } from './markdown.jsx';

function JobCard({ job }) {
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

  return (
    <div className={`rounded-2xl border px-5 py-4 ${color}`}>
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
          {job.prUrl && (
            <a href={job.prUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] text-primary underline">
              Open PR →
            </a>
          )}
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
    <div ref={containerRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {safeMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-foreground border border-primary/10 whitespace-pre-wrap'
                  : 'bg-muted/60 text-foreground'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Markdown>{msg.content || msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || ''}</Markdown>
              ) : (
                msg.content || msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || ''
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
