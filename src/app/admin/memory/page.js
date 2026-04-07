'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  listMemory,
  searchMemory,
  addManualEntry,
  removeMemoryEntry,
  testEmbedding,
  exportMemory,
} from '../../../lib/admin/memory-actions.js';
import { CheckCircle, XCircle, Loader2, Trash2, Plus, RefreshCw } from '../../../lib/icons/index.jsx';

const PAGE_SIZE = 25;

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: false });
}

export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const [loadOffset, setLoadOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Manual entry form
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Embedding status
  const [embeddingStatus, setEmbeddingStatus] = useState(null);

  const refresh = useCallback(async (opts = {}) => {
    const { reset = true, offset = 0 } = opts;
    setLoading(true);
    try {
      const data = await listMemory({
        limit: PAGE_SIZE,
        offset,
        sourceType: sourceTypeFilter || null,
      });
      setStats(data.stats || null);
      if (reset) {
        setEntries(data.entries);
        setSummaries(data.summaries);
      } else {
        setEntries((prev) => [...prev, ...data.entries]);
      }
      setHasMore(data.entries.length === PAGE_SIZE);
      setLoadOffset(offset + data.entries.length);
    } catch {}
    setLoading(false);
  }, [sourceTypeFilter]);

  async function loadMore() {
    await refresh({ reset: false, offset: loadOffset });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportMemory();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ghostbot-memory-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  }

  useEffect(() => {
    refresh({ reset: true, offset: 0 });
    testEmbedding().then(setEmbeddingStatus).catch(() => {});
  }, [refresh]);

  async function handleSearch() {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const r = await searchMemory(query);
      setSearchResults(r);
    } catch {
      setSearchResults({ entries: [], summaries: [] });
    }
    setSearching(false);
  }

  async function handleAddManual() {
    if (!manualTitle.trim() || !manualContent.trim()) return;
    setSaving(true);
    const r = await addManualEntry({ title: manualTitle, content: manualContent });
    if (r.success) {
      setManualTitle('');
      setManualContent('');
      setShowManual(false);
      await refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id, kind = 'entry') {
    await removeMemoryEntry(id, kind);
    await refresh();
    if (searchResults) {
      setSearchResults({
        entries: (searchResults.entries || []).filter((e) => e.id !== id || kind !== 'entry'),
        summaries: (searchResults.summaries || []).filter((s) => s.id !== id || kind !== 'summary'),
      });
    }
  }

  const displayedEntries = searchResults?.entries ?? entries;
  const displayedSummaries = searchResults?.summaries ?? summaries;

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Memory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Knowledge entries and chat summaries GhostBot uses to recall past work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" disabled={exporting}>
            {exporting ? <><Loader2 className="h-4 w-4 mr-2" /> Exporting...</> : 'Export JSON'}
          </Button>
          <Button onClick={() => refresh({ reset: true, offset: 0 })} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats header */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Knowledge entries</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalEntries}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Chat summaries</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalSummaries}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Embedded entries</p>
            <p className="text-xl font-bold text-primary mt-0.5">{stats.embeddedEntries}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Embedded summaries</p>
            <p className="text-xl font-bold text-primary mt-0.5">{stats.embeddedSummaries}</p>
          </div>
        </div>
      )}

      {/* Embedding status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Embedding Service</CardTitle>
          <CardDescription>Ollama model used for semantic search</CardDescription>
        </CardHeader>
        <CardContent>
          {embeddingStatus === null ? (
            <span className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5" /> Checking...</span>
          ) : embeddingStatus.success ? (
            <span className="text-sm text-primary flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" /> Working — {embeddingStatus.dims}-dimensional vectors
            </span>
          ) : (
            <div className="space-y-2">
              <span className="text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5" /> Not available
              </span>
              <p className="text-xs text-muted-foreground">
                Run on your Ollama VPS: <code className="bg-muted px-1.5 py-0.5 rounded">ollama pull nomic-embed-text</code>
                {' '}(~274 MB). Memory features degrade gracefully — text entries still save, but semantic search won&apos;t work.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Semantic search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Semantic Search</CardTitle>
          <CardDescription>Search by meaning, not keywords</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="what do you know about docker networking?"
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <><Loader2 className="h-4 w-4 mr-2" /> Searching</> : 'Search'}
            </Button>
            {searchResults && (
              <Button variant="outline" onClick={() => { setSearchResults(null); setQuery(''); }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Manual Entry</CardTitle>
              <CardDescription>Teach GhostBot a fact directly</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowManual((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" /> {showManual ? 'Cancel' : 'Add entry'}
            </Button>
          </div>
        </CardHeader>
        {showManual && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="e.g. VPS Ollama URL" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="The full detail GhostBot should remember..."
                rows={5}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <Button onClick={handleAddManual} disabled={saving || !manualTitle.trim() || !manualContent.trim()}>
              {saving ? 'Saving...' : 'Save entry'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Chat summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Chat Summaries {searchResults ? `(search: ${displayedSummaries.length})` : `(${summaries.length})`}
          </CardTitle>
          <CardDescription>Auto-generated 2-3 sentence recaps of past conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayedSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No summaries yet — have a conversation and it&apos;ll appear here.</p>
          ) : (
            displayedSummaries.map((s) => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{s.summary}</p>
                    {s.topics && s.topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.topics.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{formatDate(s.createdAt)}</span>
                      {s.score !== undefined && <span className="text-primary">score {s.score}</span>}
                      <a className="text-primary hover:underline" href={`/chat/${s.chatId}`}>open chat</a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id, 'summary')}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete summary"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Knowledge entries */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg">
                Knowledge Entries {searchResults ? `(search: ${displayedEntries.length})` : `(${entries.length}${stats?.totalEntries ? ` / ${stats.totalEntries}` : ''})`}
              </CardTitle>
              <CardDescription>Manual notes, code snippets, agent job outputs</CardDescription>
            </div>
            {!searchResults && (
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-input px-3 text-xs text-foreground"
              >
                <option value="">All sources</option>
                <option value="chat">chat</option>
                <option value="agent_job">agent_job</option>
                <option value="manual">manual</option>
                <option value="code">code</option>
                <option value="summary">summary</option>
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet. Add one manually above, or they&apos;ll accumulate as you use GhostBot.</p>
          ) : (
            displayedEntries.map((e) => (
              <div key={e.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{e.sourceType}</span>
                      <h3 className="text-sm font-semibold text-foreground truncate">{e.title}</h3>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{e.content}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{formatDate(e.createdAt)}</span>
                      {e.score !== undefined && <span className="text-primary">score {e.score}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id, 'entry')}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
          {!searchResults && hasMore && (
            <div className="pt-2 text-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2" /> Loading...</> : 'Load more'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
