'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ScannerContent() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    try {
      const res = await fetch('/api/scanner');
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {}
    setLoading(false);
  }

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch('/api/scanner/run', { method: 'POST' });
      if (res.ok) {
        await loadResults();
      }
    } catch {}
    setRunning(false);
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(typeof ts === 'number' ? ts : parseInt(ts));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Scanner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Self-reflecting daily scan — analyzes activity and suggests improvements
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="px-4 py-2 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {running ? 'Scanning...' : 'Run Now'}
        </button>
      </div>

      <div className="text-xs text-muted-foreground bg-card/50 rounded-lg px-4 py-3 border border-border/40">
        Scheduled daily at 06:30. Results are stored as knowledge entries and available for RAG retrieval.
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading scan results...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No scan results yet. Click &quot;Run Now&quot; to trigger the first scan.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border/40 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-medium text-foreground">{r.title}</span>
                  <span className="ml-3 text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {expanded === r.id ? '▲' : '▼'}
                </span>
              </button>
              {expanded === r.id && (
                <div className="px-5 pb-5 border-t border-border/30">
                  <div className="prose prose-invert prose-sm max-w-none mt-4">
                    <ReactMarkdown>{r.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
