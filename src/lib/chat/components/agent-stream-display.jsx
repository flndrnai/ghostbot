'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, CheckCircle, XCircle } from '../../icons/index.jsx';

function ToolCallCard({ toolName, args, result, isExpanded, onToggle }) {
  const hasResult = result !== undefined && result !== null;
  const isError = typeof result === 'string' && result.toLowerCase().startsWith('error');

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden my-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground flex-1 truncate">{toolName}</span>
        {hasResult ? (
          isError ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle className="h-3.5 w-3.5 text-primary" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
        )}
        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="border-t border-border/40 px-4 py-3 space-y-2">
          {args && Object.keys(args).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Input</span>
              <pre className="mt-1 text-xs text-muted-foreground bg-background/50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {hasResult && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Output</span>
              <pre className="mt-1 text-xs text-muted-foreground bg-background/50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                {typeof result === 'string' ? result.slice(0, 2000) : JSON.stringify(result, null, 2).slice(0, 2000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentStreamDisplay({ events = [] }) {
  const [expanded, setExpanded] = useState(new Set());

  if (events.length === 0) return null;

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Match tool-calls with their results
  const toolResults = {};
  for (const e of events) {
    if (e.type === 'tool-result') toolResults[e.toolCallId] = e.result;
  }

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        if (event.type === 'text') {
          return <span key={i} className="whitespace-pre-wrap">{event.text}</span>;
        }
        if (event.type === 'tool-call') {
          return (
            <ToolCallCard
              key={event.toolCallId || i}
              toolName={event.toolName}
              args={event.args}
              result={toolResults[event.toolCallId]}
              isExpanded={expanded.has(event.toolCallId || i)}
              onToggle={() => toggleExpand(event.toolCallId || i)}
            />
          );
        }
        if (event.type === 'exit') {
          return (
            <div key={i} className="text-xs text-muted-foreground mt-2">
              Agent exited with code {event.exitCode}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
